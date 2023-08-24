import { Guild } from "discord.js";
import { Account, PlatformAccount } from "../types/account";
import { hashOf } from "../utils";

function parseCommunity(guild: Guild) {
    const { name, id } = guild;
    return {
        platform: "Discord",
        nickname: name,
        handle: hashOf(id, 12),
        dao: true,
    } as Account;
}

/** This function converts platform account to community id in nomland. */
export function getAccount(account: PlatformAccount) {
    parseCommunity(account);
}
