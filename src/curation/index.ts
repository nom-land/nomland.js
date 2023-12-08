/*
Based on Crossbell, process the curation.
*/

import { parseRecord } from "../record/parser";
import { Contract, NoteMetadata, Numberish, PostNoteOptions } from "crossbell";
import {
    Curation,
    CurationReason,
    NoteId,
    RawCuration,
} from "../types/curation";
import { getCharacter, getCharacterByAcc, setup } from "../crossbell";
import { getRecord } from "../record";
import { Accountish } from "../types/account";
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
        attachments: reason.attachments,
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
    contract: Contract,
    admin: `0x${string}`,
    appName: string,
    curation: Curation,
    url: string,
    parser?: Parser
) {
    const { curator, community, lists, reason, raw: rawData } = curation;

    if (!rawData) log.warn("rawData is not defined");
    log.info("[DEBUG] Contract has been setup");

    const record = await parseRecord(url, parser);
    log.info("[DEBUG] url has been parsed");

    const communityId = await getCharacter(contract, admin, community, [
        "POST_NOTE_FOR_NOTE",
        "POST_NOTE_FOR_CHARACTER",
        "POST_NOTE",
        "LINK_NOTE",
        "LINK_CHARACTER",
    ]);
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

    // Node env: Only if the admin is a private key, we can link the community to the curator
    // TODO
    await addMember(appName, contract, communityId, curatorId);

    log.info("[DEBUG] Community char has followed curator char");
    // TODO: admin follows communityId
    // contract.linkCharacter(admin, communityId, "follow")

    // curate
    const noteId = await curateRecordInCommunity(
        appName,
        contract,
        Number(curatorId),
        Number(communityId),
        Number(recordId),
        reason,
        rawData
    );
    for (const list of lists) {
        await addRecord(appName, contract, communityId, recordId, list);
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
    contract: Contract,
    admin: `0x${string}`,
    appName: string,
    poster: Accountish,
    community: Accountish,
    msgMetadata: NoteMetadata,
    replyToPostId: string
) {
    let communityId: Numberish, posterId: Numberish;

    if (typeof community === "object") {
        const communityChar = await getCharacterByAcc({
            c: contract,
            acc: community,
        });
        communityId = communityChar.characterId;
    } else {
        communityId = community;
    }

    if (typeof poster === "object") {
        posterId = await getCharacter(contract, admin, poster, [
            "POST_NOTE_FOR_NOTE",
            "POST_NOTE_FOR_CHARACTER",
            "POST_NOTE",
            "LINK_NOTE",
            "LINK_CHARACTER",
        ]);
    } else {
        posterId = poster;
    }

    const noteMetadata = {
        ...msgMetadata,
        attributes: [
            {
                trait_type: "entity type",
                value: "discussion",
            },
            {
                trait_type: "discussion community",
                value: Number(communityId),
            },
        ],
    } as NoteMetadata;

    let sources = [appName];
    if (msgMetadata.sources) sources = sources.concat(msgMetadata.sources);

    noteMetadata.sources = sources;

    const noteOptions = {
        characterId: posterId,
        metadataOrUri: noteMetadata,
    } as PostNoteOptions;

    let noteId: bigint;
    const replyToNoteIds = replyToPostId.split("-"); // characterId-noteId
    const cId = replyToNoteIds[0];
    const nId = replyToNoteIds[1];

    noteId = (
        await contract.note.postForNote({
            targetCharacterId: cId,
            targetNoteId: nId,
            ...noteOptions,
        })
    ).data.noteId;

    return { characterId: posterId, noteId } as NoteId;
}
