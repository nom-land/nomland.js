import { getListLinkTypePrefix } from "../utils";
import { getLinks } from "../crossbell";
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
} from "../types/curation";
import { getAttr } from "./utils";

export async function getCommunityLists(appName: string, c: Accountish) {
    const links = await getLinks(c);
    const list = links.list
        .filter((l) => l.linkType.startsWith(getListLinkTypePrefix(appName)))
        .map((l) => {
            return {
                listName: l.linkType.slice(
                    getListLinkTypePrefix(appName).length
                ),
                listId: l.linklistId,
            };
        });
    const count = list.length;

    return { count, list };
}

export async function getList(
    appName: string,
    id: Numberish,
    meta: boolean = false
) {
    const indexer = createIndexer();
    const { list, count } = await indexer.link.getManyByLinklistId(id);

    const fromCharacterId = list[0].fromCharacterId;
    if (!fromCharacterId) throw new Error("No fromCharacterId");

    const lastUpdated = list[0].createdAt;
    const linkType = list[0].linkType;
    const listName = linkType.slice(getListLinkTypePrefix(appName).length);

    if (meta) {
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
