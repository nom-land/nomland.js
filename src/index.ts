// nomland.processCuration(curation, url)
// // url will parsed as record
// // 在 curation 过程中，用自己定义的解析器，可以将其解析为不同的品类
// nomland.processCuration(curation, options: {parser: xxx})

import { Accountish } from "./types/account";
import { crossbell } from "crossbell/network";
import * as nw from "crossbell/network";
import { Contract, Numberish } from "crossbell";

import {
    getCharacter,
    getCommunityLists,
    getList,
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

    /* Community id */
    ls(c: Accountish) {
        return getCommunityLists(this.appName, c);
    }
    /* get curations by linklist id */
    lsById(id: Numberish) {
        return getList(this.appName, id);
    }
    /* Linklist id */
    getMetadataById(id: Numberish) {
        return getList(this.appName, id, true);
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
    /* Get tags and list */
    async getTagsAndLists(tagsOrList: string[], c: Accountish) {
        tagsOrList = tagsOrList.map((t) =>
            t.startsWith("#") ? t.slice(1) : t
        );
        const listNames = (await getCommunityLists(this.appName, c)).list.map(
            (l) => l.listName
        );

        const tagSuggestions = [] as string[];
        const listSuggestions = [] as string[];

        tagsOrList?.forEach((tagOrList) => {
            if (listNames.includes(tagOrList)) {
                listSuggestions.push(tagOrList);
            } else {
                tagSuggestions.push(tagOrList);
            }
        });

        return { tagSuggestions, listSuggestions };
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
