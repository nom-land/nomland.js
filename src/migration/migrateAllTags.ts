// migration order reference:
// 1. Update nomland.js
// 2. Update all projects to use new nomland.js
// 3. Update old data

import "dotenv/config";
import { setup } from "../crossbell";
import { client } from "../apis/graphql";
import { gql } from "@urql/core";

interface Cursor {
    characterId: string;
    noteId: string;
}

interface Attribute {
    trait_type: string;
    value: string;
}

async function getNotes(operator: `0x${string}`) {
    let result = [] as any[];
    let cursor = null as null | Cursor;

    while (true) {
        const { data } = await client.query(
            gql`
            query getCurations(){
                notes(
                    take: 100,
                    ${
                        cursor
                            ? `cursor: {
                      characterId_noteId : {
                        characterId: ${cursor.characterId},
                        noteId: ${cursor.noteId}
                      }
                    }`
                            : ""
                    }
                    where: {
                        AND: [
                            {
                                operator: {
                                    equals: "${operator.toLowerCase()}"
                                }
                            }
                            {
                                metadata: {
                                    content: {
                                        path: ["attributes"]
                                        array_contains: [
                                            {
                                                trait_type: "entity type"
                                                value: "curation"
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                ) {
                    characterId
                    noteId
                    metadata {
                        content
                    }
                }
            }
        `,
            {}
        );

        result = result.concat(data.notes);
        const l = data.notes.length;
        if (l < 100) {
            break;
        }
        cursor = {
            characterId: data.notes[l - 1].characterId.toString(),
            noteId: data.notes[l - 1].noteId.toString(),
        };
    }

    return result;
}

async function migrateAllTags() {
    const { admin, contract } = setup(process.env.APP_ADMIN as `0x${string}`);
    const allNotes = await getNotes(admin);
    console.log(`There are ${allNotes.length} notes.`);

    console.log("Start resetting tags.");

    for (let i = 0; i < allNotes.length; i++) {
        console.log(`Processing ${i + 1}/${allNotes.length}`);

        const note = allNotes[i];

        const oldTags = note.metadata.content.tags;
        if (oldTags) {
            console.log(
                `Skipping ${note.characterId}-${note.noteId} because it already has tags: ${oldTags}`
            );
            continue;
        }

        const lists = JSON.parse(
            note.metadata.content.attributes.find(
                (attr: Attribute) => attr.trait_type === "curation lists"
            )?.value || "[]"
        );

        const tags = JSON.parse(
            note.metadata.content.attributes.find(
                (attr: Attribute) => attr.trait_type === "suggested tags"
            )?.value || "[]"
        );

        const newTags = [...new Set([...lists, ...tags])] as string[];
        // remove "general" tag
        newTags.splice(newTags.indexOf("general"), 1);

        note.metadata.content.attributes =
            note.metadata.content.attributes.filter(
                (attr: Attribute) =>
                    attr.trait_type !== "suggested tags" &&
                    attr.trait_type !== "curation lists"
            );

        await contract.note.setMetadata({
            characterId: note.characterId,
            noteId: note.noteId,
            metadata: {
                tags: newTags,
                ...note.metadata.content,
            },
        });
    }
}

// 2023.12.10
migrateAllTags();
