import { settings } from "../config";

import md5 from "md5";
// const punycode = require("punycode/");
import punycode from "punycode/";

export function hashOf(content: string, digits = 4, suffix = true): string {
    const hash = md5(content);
    if (suffix) return hash.slice(hash.length - digits, hash.length);
    else return hash.slice(0, digits);
}

export function encode(content: string) {
    let str = punycode.encode(content);
    // remove " " and "\n"
    str = str.replace(/[\s\n]/g, "");
    // if char is not in [a-z0-9-_], replace it with "-"
    str = str.replace(/[^a-z0-9-_]/g, "-");
    // remove all "-" at the beginning
    str = str.replace(/^-+/g, "");
    return str;
}

export function feedbackUrl(
    cid: string,
    rid: string,
    curatorId: string,
    noteId: string
) {
    if (settings.botConfig.prod === false) {
        // return `https://colib-home.vercel.app/community/${cid}/record/${rid}`;
        return `https://colib-home.vercel.app/curation/${curatorId}-${noteId}`;
    } else {
        return `https://colib.app/curation/${curatorId}-${noteId}`;
    }
}

const appPrefix = (appName: string) => appName.slice(0, 2);

export function makeListLinkType(appName: string, list: string) {
    return `${appPrefix(appName)}-ls-${list}`;
}

export function getListLinkTypePrefix(appName: string) {
    return `${appPrefix(appName)}-ls-`;
}

export function getMembersLinkType(appName: string) {
    return `${appPrefix(appName)}-members`;
}
