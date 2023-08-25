// nomland.processCuration(curation, url)
// // url will parsed as record
// // 在 curation 过程中，用自己定义的解析器，可以将其解析为不同的品类
// nomland.processCuration(curation, options: {parser: xxx})

import { Accountish } from "./types/account";
import {
    createCurationList,
    getCommunityLists,
    processCuration,
} from "./curation";
import { crossbell } from "crossbell/network";
// import * as cn from "crossbell/network";
import { Contract } from "crossbell";
import { Curation } from "./types/curation";
import { type EIP1193Provider } from "eip1193-types";

//Localhost
// (crossbell.id as any) = 31337;
// const localUrl = "http://127.0.0.1:8545" as string;
// cn.setJsonRpcAddress(localUrl);
//Localhost End

export default class Nomland {
    #appKeyOrProvider: `0x${string}` | EIP1193Provider;

    constructor(appKeyOrProvider?: `0x${string}` | EIP1193Provider) {
        const key =
            appKeyOrProvider ||
            `0x0000000000000000000000000000000000000000000000000000000000000000`;
        this.#appKeyOrProvider = key;
    }
    processCuration(c: Curation, url: string) {
        return processCuration(c, url, this.#appKeyOrProvider);
    }
    processDiscussion() {}
    ls(c: Accountish) {
        return getCommunityLists(c);
    }
    add(c: Accountish, l: string) {
        return createCurationList(this.#appKeyOrProvider, c, l);
    }
    balanceOf(owner: `0x${string}`) {
        console.log(crossbell.id);
        return new Contract(undefined).csb.getBalance({ owner });
    }
}
