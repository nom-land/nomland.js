import { createCurationList, processCuration } from "./curation";
import NomlandBase from "./index";
import { type EIP1193Provider } from "eip1193-types";
import { Accountish, Curation } from "./types";

export default class NomlandNode extends NomlandBase {
    #appKeyOrProvider: `0x${string}` | EIP1193Provider;

    constructor(appName: string, appKeyOrProvider?: `0x${string}`) {
        super(appName);
        const key = appKeyOrProvider || `0x0000000000000000000000000000000000000000000000000000000000000000`;
        this.#appKeyOrProvider = key;
    }
    processCuration(c: Curation, url: string) {
        return processCuration(c, url, this.#appKeyOrProvider, this.appName);
    }
    processDiscussion() {}
    add(c: Accountish, l: string) {
        return createCurationList(this.appName, this.#appKeyOrProvider, c, l);
    }
}

export * from "./types";
