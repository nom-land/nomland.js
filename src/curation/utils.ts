import { AttributesMetadata, Contract, Numberish } from "crossbell";
import { makeListLinkType, getMembersLinkType } from "../utils";

export async function addMember(
    appName: string,
    c: Contract,
    communityId: Numberish,
    memberId: Numberish
) {
    return c.link.linkCharacter({
        fromCharacterId: communityId,
        toCharacterId: memberId,
        linkType: getMembersLinkType(appName),
    });
}

export async function removeMember(
    appName: string,
    c: Contract,
    communityId: Numberish,
    memberId: Numberish
) {
    return c.link.unlinkCharacter({
        fromCharacterId: communityId,
        toCharacterId: memberId,
        linkType: getMembersLinkType(appName),
    });
}

export async function addRecord(
    appName: string,
    c: Contract,
    communityId: Numberish,
    recordId: Numberish,
    list: string,
    notWrapLinkType?: boolean
) {
    return c.link.linkCharacter({
        fromCharacterId: communityId,
        toCharacterId: recordId,
        linkType: notWrapLinkType ? list : makeListLinkType(appName, list),
    });
}

export async function removeRecord(
    appName: string,
    c: Contract,
    communityId: Numberish,
    recordId: Numberish,
    list: string,
    notWrapLinkType?: boolean
) {
    return c.link.unlinkCharacter({
        fromCharacterId: communityId,
        toCharacterId: recordId,
        linkType: notWrapLinkType ? list : makeListLinkType(appName, list),
    });
}

export function getAttr(attrs: AttributesMetadata["attributes"], key: string) {
    return attrs?.find((a) => a.trait_type === key)?.value;
}
