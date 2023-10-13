import {
    getListLinkTypePrefix,
    getMembersLinkType,
    linkType2Name,
} from "../utils";
import { getIdBy } from "../crossbell";
import { Accountish } from "../types/account";
import {
    Character,
    CharacterEntity,
    CharacterMetadata,
    LinkItemAddress,
    LinkItemAnyUri,
    LinkItemCharacter,
    LinkItemERC721,
    LinkItemLinklist,
    LinkItemNote,
    Note,
    NoteEntity,
    NoteMetadata,
    Numberish,
    createContract,
    createIndexer,
} from "crossbell";
import {
    CurationListData,
    CurationNote,
    CurationStat,
    ListData,
} from "../types/curation";
import { getAttr } from "./utils";
import { client } from "../apis/graphql";
import { gql } from "@urql/core";

export async function getCommunityLists(appName: string, acc: Accountish) {
    const communityId = await getIdBy(acc);
    if (communityId === 0) return { count: 0, list: [] };
    const { data } = await client
        .query(
            gql`
                query getCommunityLists(
                    $communityId: Int!
                    $linkType: String!
                ) {
                    linklists(
                        where: {
                            fromCharacterId: { equals: $communityId }
                            linkType: { startsWith: $linkType }
                        }
                        orderBy: { createdAt: desc }
                    ) {
                        linkType
                        linklistId
                        _count {
                            links
                        }
                    }
                }
            `,
            {
                communityId: Number(communityId),
                linkType: getListLinkTypePrefix(appName),
            }
        )
        .toPromise();

    console.log(communityId, data);
    interface Link {
        linkType: string;
        linklistId: number;
        _count: {
            links: number;
        };
    }

    const list: ListData[] = data.linklists.map((l: Link) => {
        return {
            listName: linkType2Name(appName, l.linkType),
            listId: l.linklistId,
            count: l._count.links,
        };
    });

    const count = list.length;

    return { count, list };
}

export async function getList(
    appName: string,
    id: Numberish,
    includeCurations: boolean = false
) {
    const indexer = createIndexer();
    const { list, count } = await indexer.link.getManyByLinklistId(id);

    const fromCharacterId = list[0].fromCharacterId;
    if (!fromCharacterId) throw new Error("No fromCharacterId");

    const lastUpdated = list[0].createdAt;
    const linkType = list[0].linkType;
    const listName = linkType.slice(getListLinkTypePrefix(appName).length);

    if (!includeCurations) {
        return {
            listName,
            communityId: fromCharacterId,
            count,
            lastUpdated,
        };
    }

    const c = createContract();
    const { data: records } = await c.link.getLinkingCharacters({
        fromCharacterId,
        linkType,
    });
    const curationData = new Map<string, CurationListData>();
    await Promise.all(
        records.reverse().map(async (r) => {
            curationData.set(
                r.characterId.toString(),
                await getCurationData(
                    r.characterId.toString(),
                    fromCharacterId.toString(),
                    listName
                )
            );
        })
    );

    return {
        listName,
        communityId: fromCharacterId,
        records,
        count,
        curationData, // record -> curations
        lastUpdated,
    };
}

export async function getNote(
    characterId: Numberish,
    noteId: Numberish,
    entityType?: string
) {
    const c = createContract();

    const { data: cData } = await c.character.get({
        characterId,
    });
    const { data: n } = await c.note.get({
        characterId,
        noteId,
    });
    const attrs = n.metadata?.attributes;
    if (entityType) {
        const entityType = getAttr(attrs, "entity type");
        if (entityType !== entityType) return;
    }

    const curationNote = getCuration(n, cData);

    return curationNote;
}

export function getCuration(
    n:
        | Note<
              | LinkItemCharacter
              | LinkItemAddress
              | LinkItemNote
              | LinkItemERC721
              | LinkItemLinklist
              | LinkItemAnyUri
          >
        | NoteEntity,
    c?: Character | CharacterEntity | null // if n is Note, c cannot be undefined
) {
    let nMetadata: NoteMetadata | undefined | null;
    let cMetadata: CharacterMetadata | undefined | null;
    // if n is NoteEntity(which has "character" field)
    if ("character" in n) {
        c = n.character;
        nMetadata = n.metadata?.content;
        cMetadata = n.character?.metadata?.content;
        n.character?.handle;
    } else {
        if (!c) throw new Error("c is undefined");
        nMetadata = n.metadata as NoteMetadata;
        cMetadata = c.metadata as CharacterMetadata;
    }

    const attrs = nMetadata?.attributes || [];

    const curationNote = {
        dateString:
            (nMetadata?.date_published &&
                new Date(nMetadata?.date_published).toISOString()) ||
            "",
        content: nMetadata?.content?.toString() || "",
        curatorAvatars: cMetadata?.avatars || [],
        curatorName: cMetadata?.name || "",
        curatorHandle: c?.handle || "",
        title: nMetadata?.title || "",
        suggestedTags: JSON.parse(
            (getAttr(attrs, "suggested tags") as string) || "[]"
        ) as string[],
        listNames: JSON.parse(
            (getAttr(attrs, "curation lists") as string) || "[]"
        ) as string[],
        raw: n,
        recordId: getAttr(attrs, "curation record") as string,
        communityId: getAttr(attrs, "curation community") as string,
        postId: n.characterId.toString() + "-" + n.noteId.toString(),
    } as CurationNote;
    return curationNote;
}

export async function getCurationData(
    recordId: string,
    communityId?: string,
    listName?: string
) {
    const indexer = createIndexer();

    const curations = await indexer.note.getMany({
        toCharacterId: recordId,
        includeCharacter: true,
    });
    const curationList = [] as CurationNote[];
    const curationStat = new Map<string, CurationStat>();
    curations.list.map((curationNote) => {
        const attrs = curationNote.metadata?.content?.attributes;
        const entityType = getAttr(attrs, "entity type");
        if (entityType === "curation" || entityType === "discussion") {
            if (communityId) {
                if (
                    getAttr(attrs, "curation community")?.toString() !==
                        communityId &&
                    getAttr(attrs, "discussion community")?.toString() !==
                        communityId
                ) {
                    return;
                }
            }

            if (listName) {
                if (
                    !(
                        JSON.parse(
                            getAttr(attrs, "curation lists")?.toString() || "[]"
                        ) as string[]
                    ).includes(listName)
                ) {
                    return;
                }
            }

            const curation = getCuration(curationNote);

            curationList.push(curation);
        }
    });

    await Promise.all(
        curations.list.map(async (curationNote) => {
            const { count } = await indexer.note.getMany({
                toCharacterId: curationNote.characterId,
                toNoteId: curationNote.noteId,
                limit: 0,
            });
            const curationId =
                curationNote.characterId.toString() +
                "-" +
                curationNote.noteId.toString();
            curationStat.set(curationId, {
                replies: count,
            });
        })
    );

    return { curationList, curationStat } as CurationListData;
}

export async function getReplies(characterId: Numberish, noteId: Numberish) {
    const indexer = createIndexer();
    const data = await indexer.note.getMany({
        toCharacterId: characterId,
        toNoteId: noteId,
        includeCharacter: true,
        orderBy: "createdAt",
        order: "asc",
    });
    const replies = data.list.map((n) => {
        return getCuration(n);
    });
    return replies;
}
export async function getRepliesCount(
    characterId: Numberish,
    noteId: Numberish
) {
    const indexer = createIndexer();
    const { count } = await indexer.note.getMany({
        toCharacterId: characterId,
        toNoteId: noteId,
        limit: 0,
    });

    return count;
}

export async function getMembers(appName: string, communityId: Numberish) {
    const c = createContract();

    const { data } = await c.link.getLinkingCharacters({
        fromCharacterId: communityId,
        linkType: getMembersLinkType(appName),
    });
    return data;
}

export async function getCharacter(id: Numberish) {
    const c = createContract();

    const { data } = await c.character.get({
        characterId: id,
    });
    return data;
}

export async function getRecordStats(recordId: Numberish) {
    const indexer = createIndexer();
    const backLinks = await indexer.link.getBacklinksOfCharacter(recordId); //TODO: limit...

    const backNotes = await indexer.note.getMany({
        toCharacterId: recordId,
        includeCharacter: true,
    });
    return { backLinks, backNotes };
}
