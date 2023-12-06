import {
    createCurationList,
    processCuration,
    processDiscussion,
} from "./curation";
import NomlandBase from "./index";
import { type EIP1193Provider } from "eip1193-types";
import { Accountish, Curation, Parser } from "./types";
import { NoteMetadata } from "crossbell";

export default class NomlandNode extends NomlandBase {
    #appKeyOrProvider: `0x${string}` | EIP1193Provider;

    constructor(appName: string, appKeyOrProvider?: `0x${string}`) {
        super(appName);
        const key =
            appKeyOrProvider ||
            `0x0000000000000000000000000000000000000000000000000000000000000000`;
        this.#appKeyOrProvider = key;
    }
    processCuration(c: Curation, url: string, parser?: Parser) {
        return processCuration(
            c,
            url,
            this.#appKeyOrProvider,
            this.appName,
            parser
        );
    }
    processDiscussion(
        poster: Accountish,
        community: Accountish,
        msg: NoteMetadata,
        replyToPostId: string
    ) {
        return processDiscussion(
            poster,
            community,
            msg,
            replyToPostId,
            this.#appKeyOrProvider,
            this.appName
        );
    }
    add(c: Accountish, l: string) {
        return createCurationList(this.appName, this.#appKeyOrProvider, c, l);
    }
}

export * from "./types";

export * from "./record/parser";
export * from "./account";
