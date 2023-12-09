import { getMembersLinkType } from "../utils";
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
import { CurationNote, CurationStat } from "../types/curation";
import { getAttr, getNoteId } from "./utils";
import { client } from "../apis/graphql";
import { gql } from "@urql/core";

export async function getFeeds(
    id: Numberish,
    options?: {
        skip: number;
        take: number;
        cursor: string;
    }
) {
    const skip = options?.skip || 0;
    const take = options?.take || 10;
    let cursor = options?.cursor || "";
    const { characterId, noteId } = getNoteId(cursor);

    const fromCharacterId = id;
    if (!fromCharacterId) throw new Error("No fromCharacterId");

    const { data } = await client.query(
        gql`
                query getFeeds() 
                {
                  notes(
                    where: {
                      AND: [
                        {
                          metadata: {
                            AND: [
                              {
                                content: {
                                  path: ["attributes"]
                                  array_contains: [
                                    { trait_type: "entity type", value: "curation" }
                                  ]
                                }
                              }
                              {
                                content: {
                                  path: ["attributes"]
                                  array_contains: [
                                    { trait_type: "curation community", value: ${fromCharacterId.toString()} }
                                  ]
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                    skip: ${skip.toString()}
                    take: ${take.toString()}
                    ${
                        cursor
                            ? `cursor: {
                        note_characterId_noteId_unique: {
                          characterId: ${characterId.toString()},
                          noteId: ${noteId.toString()}
                        }
                    }`
                            : ""
                    }
                    orderBy: {
                      createdAt: desc
                    }
                  ) {
                    characterId
                    character{
                      handle
                      metadata {
                        content
                      }
                    }
                    noteId
                    metadata {
                      content
                    }
                    toCharacterId
                    toCharacter {
                      metadata{
                        content
                      }
                      toLinks {
                        linklistId
                      }
                    }
                    _count {
                      fromNotes
                    }
                    owner
                    operator
                    createdAt
                  }
                }
                
            `,
        {}
    );

    const lastUpdated = data.notes[0].createdAt as string;

    const curationNotes: {
        n: CurationNote;
        record: {
            title: string;
        };
        stat: CurationStat;
    }[] = data.notes.map(
        (
            n: NoteEntity & {
                _count: {
                    fromNotes: {
                        n: Number;
                    };
                };
            }
        ) => {
            const repliesCount = n._count.fromNotes;
            return {
                n: getCuration(n),
                record: {
                    title: (n.toCharacter?.metadata?.content as any)?.title,
                },
                stat: {
                    replies: repliesCount,
                },
            };
        }
    );
    return {
        communityId: fromCharacterId,
        curationNotes,
        lastUpdated,
    };
}

export async function getNote(
    characterId: Numberish,
    noteId: Numberish,
    entityType?: string
) {
    const note = await client.query(
        gql`{
            note(where: { characterId_noteId: { noteId: ${noteId.toString()}, characterId: ${characterId.toString()} } }) {
                characterId
                noteId
                character {
                handle
                metadata{
                    content
                }
                }
                metadata {
                content
                }
                toCharacter{
                handle
                metadata{
                    content
                }
                }
                _count{
                    fromNotes
                  }
            }
        }`,
        {}
    );

    const attrs = note.data.note.metadata?.content?.attributes;

    if (entityType) {
        const entityType = getAttr(attrs, "entity type");
        if (entityType !== entityType) return;
    }

    const curationNote = getCuration(note.data.note);
    curationNote.replies = note.data.note._count.fromNotes;

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
        cMetadata = c?.metadata?.content;
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
        attachments: nMetadata?.attachments || [],
        curatorAvatars: cMetadata?.avatars || [],
        curatorName: cMetadata?.name || "",
        curatorHandle: c?.handle || "",
        title: nMetadata?.title || "",
        suggestedTags: JSON.parse(
            (getAttr(attrs, "suggested tags") as string) ||
                JSON.stringify(nMetadata?.tags) ||
                "[]"
        ) as string[], // TODO: remove suggested tags
        raw: n,
        recordId: getAttr(attrs, "curation record") as string,
        communityId: getAttr(attrs, "curation community") as string,
        postId: n.characterId.toString() + "-" + n.noteId.toString(),
    } as CurationNote;
    return curationNote;
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

export async function getMembers(
    appName: string,
    communityId: Numberish,
    useContract?: false
) {
    if (useContract) {
        const c = createContract();

        const { data } = await c.link.getLinkingCharacters({
            fromCharacterId: communityId,
            linkType: getMembersLinkType(appName),
        });
        return data;
    } else {
        const indexer = createIndexer();
        const data = await indexer.link.getMany(communityId, {
            linkType: getMembersLinkType(appName),
        });
        return data.list.map((l) => {
            return {
                characterId: BigInt(l.toCharacterId || 0),
                handle: l.toCharacter?.handle,
                uri: l.toUri,
                metadata: l.toCharacter?.metadata?.content,
                socialToken: l.toCharacter?.socialToken,
                noteCount: BigInt(0), //TODO
            } as Character;
        });
    }
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
