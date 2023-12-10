// nomland.processCuration(curation, url)
// // url will parsed as record
// // 在 curation 过程中，用自己定义的解析器，可以将其解析为不同的品类
// nomland.processCuration(curation, options: {parser: xxx})

import { crossbell } from "crossbell/network";
import * as nw from "crossbell/network";
import { Contract, Numberish } from "crossbell";

import {
    getCharacter,
    getFeeds,
    getMembers,
    getNote,
    getRecordStats,
    getReplies,
    getRepliesCount,
} from "./curation/ls";
import { settings } from "./config";
//Localhost
if (process.env.NODE_ENV === "local") {
    (crossbell.id as any) = 31337;
    const localUrl = "http://127.0.0.1:8545" as string;
    (nw.crossbell.rpcUrls as any) = {
        default: [localUrl],
        public: [localUrl],
    };
}
//Localhost End

export default class NomlandBase {
    appName: string;

    constructor(appName: string) {
        this.appName = appName;
    }

    /* Get all curations of a community */
    getFeeds(
        cId?: Numberish,
        tag?: string,
        options?: {
            skip?: number;
            take?: number;
            cursor?: string;
        }
    ) {
        return getFeeds(cId, tag, options);
    }

    /* Get curation note data */
    getCuration(characterId: Numberish, noteId: Numberish) {
        return getNote(characterId, noteId, "curation");
    }
    /* Get discussions toward a note */
    getDiscussions(characterId: Numberish, noteId: Numberish) {
        return getReplies(characterId, noteId);
    }
    /* Get count of discussions toward a note */
    getDiscussionsCount(characterId: Numberish, noteId: Numberish) {
        return getRepliesCount(characterId, noteId);
    }
    balanceOf(owner: `0x${string}`) {
        return new Contract(undefined).csb.getBalance({ owner });
    }
    getCommunityMembers(communityId: Numberish) {
        return getMembers(this.appName, communityId);
    }
    getCharacter(id: Numberish) {
        return getCharacter(id);
    }
    getRecordStats(recordId: Numberish) {
        return getRecordStats(recordId);
    }
    getConfig() {
        return settings;
    }
}
export * from "./account";
