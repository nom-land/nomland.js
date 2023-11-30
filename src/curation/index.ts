/*
Based on Crossbell, process the curation.
*/

import { parseRecord } from "../record/parser";
import { Contract, NoteMetadata } from "crossbell";
import {
    Curation,
    CurationReason,
    NoteId,
    RawCuration,
} from "../types/curation";
import { getCharacter, getCharacterByAcc, setup } from "../crossbell";
import { getRecord } from "../record";
import { Account, Accountish } from "../types/account";
import { addMember, addRecord, removeRecord } from "./utils";
import { log } from "../utils/log";
import { type EIP1193Provider } from "eip1193-types";
import { getCommunityLists } from "./ls";
import { Parser } from "../types";

export async function curateRecordInCommunity(
    appName: string,
    c: Contract,
    curator: number,
    communityId: number,
    lists: string[],
    recordId: number,
    reason: CurationReason,
    rawData?: RawCuration
) {
    // 1. Curator 发一条 note，且这个note指向 Record
    // 2. Community Character 把这个 note 放到 community list 里（link）

    let sources = [appName];
    if (rawData?.sources) sources = sources.concat(rawData.sources);

    const metadata = {
        content: reason.comment,
        sources,
        date_published: rawData?.date_published || new Date().toISOString(), //TODO
        attributes: [
            {
                trait_type: "entity type",
                value: "curation",
            },
            {
                trait_type: "curation content",
                value: rawData?.content,
            },
            {
                trait_type: "curation community",
                value: communityId,
            },
            {
                trait_type: "curation lists",
                value: JSON.stringify(lists),
            },
            {
                trait_type: "curation record",
                value: recordId,
            },
            {
                trait_type: "suggested tags",
                value: JSON.stringify(reason.tagSuggestions),
            },
        ],
    } as NoteMetadata;

    if (rawData?.external_url) {
        metadata.external_urls = [rawData.external_url];
    }

    if (reason.titleSuggestion) {
        metadata.title = reason.titleSuggestion;
    }

    const { data } = await c.note.postForCharacter({
        characterId: curator,
        toCharacterId: recordId,
        metadataOrUri: metadata,
    });

    return data.noteId;
}

// Make a new linklist for the community
export async function createCurationList(
    appName: string,
    adminPrivateKey: `0x${string}` | EIP1193Provider,
    community: Accountish,
    list: string
) {
    const { contract, admin } = await setup(adminPrivateKey);

    const res = await getCommunityLists(appName, community);
    const listNames = res.list.map((l) => l.listName);
    if (listNames.includes(list)) {
        return;
    }

    const communityId = await getCharacter(contract, admin, community, [
        "POST_NOTE_FOR_NOTE",
        "POST_NOTE_FOR_CHARACTER",
        "POST_NOTE",
        "LINK_NOTE",
        "LINK_CHARACTER",
    ]);

    //community links itself and then unlinks
    console.log("linking...", list);
    const tx = await addRecord(
        appName,
        contract,
        communityId,
        communityId,
        list
    );
    console.log(tx.transactionHash);
    console.log("unlinking...", list);
    const tx2 = await removeRecord(
        appName,
        contract,
        communityId,
        communityId,
        list
    );
    console.log(tx2.transactionHash);
}

export async function processCuration(
    curation: Curation,
    url: string,
    adminPrivateKeyOrProvider: `0x${string}` | EIP1193Provider,
    appName: string,
    parser?: Parser
) {
    const { curator, community, lists, reason, raw: rawData } = curation;

    const { contract, admin } = setup(adminPrivateKeyOrProvider);
    if (!rawData) log.warn("rawData is not defined");
    log.info("[DEBUG] Contract has been setup");

    const record = await parseRecord(url, parser);
    log.info("[DEBUG] url has been parsed");

    let mode: "server" | "client";
    if (typeof adminPrivateKeyOrProvider === "string") {
        mode = "server";
    } else {
        mode = "client";
    }
    const communityId = await getCharacter(
        contract,
        admin,
        community,
        mode === "server"
            ? [
                  "POST_NOTE_FOR_NOTE",
                  "POST_NOTE_FOR_CHARACTER",
                  "POST_NOTE",
                  "LINK_NOTE",
                  "LINK_CHARACTER",
              ]
            : []
    );
    log.info(
        "[DEBUG] Community char has been created, communityId is",
        communityId.toString()
    );

    const curatorId = await getCharacter(contract, admin, curator, [
        "POST_NOTE_FOR_NOTE",
        "POST_NOTE_FOR_CHARACTER",
        "POST_NOTE",
        "LINK_NOTE",
        "LINK_CHARACTER",
    ]);
    log.info(
        "[DEBUG] Curator char has been created, curatorId is",
        curatorId.toString()
    );

    const recordId = await getRecord(record, contract, admin, curatorId);
    log.info(
        "[DEBUG] Record has been created, record id is",
        recordId.toString()
    );

    if (mode === "server") {
        // Node env: Only if the admin is a private key, we can link the community to the curator
        // TODO
        await addMember(appName, contract, communityId, curatorId);

        log.info("[DEBUG] Community char has followed curator char");
    }
    // TODO: admin follows communityId
    // contract.linkCharacter(admin, communityId, "follow")

    // curate
    const noteId = await curateRecordInCommunity(
        appName,
        contract,
        Number(curatorId),
        Number(communityId),
        lists,
        Number(recordId),
        reason,
        rawData
    );
    if (mode === "server") {
        for (const list of lists) {
            await addRecord(appName, contract, communityId, recordId, list);
        }
    }
    log.info("[DEBUG] Curation has been finished");
    return {
        cid: communityId.toString(),
        rid: recordId.toString(),
        record,
        curatorId: curatorId.toString(),
        noteId: noteId.toString(),
    };
}

export async function processDiscussion(
    poster: Account,
    community: Account,
    msgMetadata: NoteMetadata,
    discussing: "note" | "record",
    noteIdOrRecordId: string,
    adminPrivateKey: `0x${string}`,
    appName: string
) {
    const { contract, admin } = await setup(adminPrivateKey);

    const communityChar = await getCharacterByAcc({
        c: contract,
        acc: community,
    });
    const communityId = communityChar.characterId;

    const posterId = await getCharacter(contract, admin, poster, [
        "POST_NOTE_FOR_NOTE",
        "POST_NOTE_FOR_CHARACTER",
        "POST_NOTE",
        "LINK_NOTE",
        "LINK_CHARACTER",
    ]);
    const noteOptions = {
        characterId: posterId,
        metadataOrUri: {
            ...msgMetadata,
            attributes: [
                {
                    trait_type: "entity type",
                    value: "discussion",
                },
                {
                    trait_type: "discussion community",
                    value: communityId,
                },
            ],
        },
    };

    let sources = [appName];
    if (msgMetadata.sources) sources = sources.concat(msgMetadata.sources);

    noteOptions.metadataOrUri.sources = sources;

    let noteId: bigint;
    if (discussing === "note") {
        const noteIds = noteIdOrRecordId.split("-"); // characterId-noteId
        const cId = Number(noteIds[0]);
        const nId = Number(noteIds[1]);
        const refNote = {
            cId,
            nId,
        };
        noteId = (
            await contract.note.postForNote({
                targetCharacterId: refNote.cId,
                targetNoteId: refNote.nId,
                ...noteOptions,
            })
        ).data.noteId;
    } else {
        // but it's not useful... at least for now
        noteId = (
            await contract.note.postForCharacter({
                toCharacterId: noteIdOrRecordId,
                ...noteOptions,
            })
        ).data.noteId;
    }
    return { characterId: posterId, noteId } as NoteId;
}
