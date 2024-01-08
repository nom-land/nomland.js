import { processCuration, processDiscussion } from "./curation/actions";
import NomlandBase from "./index";
import { type EIP1193Provider } from "eip1193-types";
import { Accountish, Curation, Parser } from "./types";
import { Contract, NoteMetadata } from "crossbell";
import { setup } from "./crossbell";

export default class NomlandNode extends NomlandBase {
    public contract: Contract;

    admin: `0x${string}`;

    constructor(
        appName: string,
        appKeyOrProvider?: `0x${string}` | EIP1193Provider
    ) {
        super(appName);
        const key =
            appKeyOrProvider ||
            `0x0000000000000000000000000000000000000000000000000000000000000000`;
        const { contract, admin } = setup(key);

        this.contract = contract;
        this.admin = admin;
    }
    processCuration(c: Curation, url: string, parser?: Parser) {
        return processCuration(
            this.contract,
            this.admin,
            this.appName,
            c,
            url,
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
            this.contract,
            this.admin,
            this.appName,
            poster,
            community,
            msg,
            replyToPostId
        );
    }
}

export * from "./types";

export * from "./record/parser";
export * from "./account";
