import { Guild } from "discord.js";
import {
    Account,
    DiscordAccount,
    TelegramGroup,
    TelegramUser,
} from "../types/account";
import { encode, hashOf } from "../utils";
import { settings } from "../config";

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
export function makeAccount(
    account: DiscordAccount | TelegramUser | TelegramGroup
) {
    if ("name" in account) {
        // Discord
        return parseCommunity(account);
    } else if ("first_name" in account) {
        // Telegram User
        return {
            platform: "Telegram",
            nickname: account.last_name
                ? account.first_name + " " + account.last_name
                : account.first_name,
            handle: hashOf(account.id.toString(), 12),
        } as Account;
    } else {
        // Telegram Group
        return {
            platform: "Telegram",
            nickname: account.title,
            handle: hashOf(account.id.toString(), 12),
            dao: true,
        } as Account;
    }
}

export function formatHandle(acc: Account) {
    const guildCode = encode(acc.guildId ?? acc.handle);
    const userCode = encode(acc.handle);
    let tmpHandle = userCode + "-" + guildCode;

    const suffix = hashOf(tmpHandle);

    tmpHandle = tmpHandle.slice(0, 31 - 5) + "-" + suffix;

    let handle = "";
    for (let i = 0; i < Math.min(31, tmpHandle.length); i++) {
        const c = tmpHandle[i];
        if (
            (c >= "a" && c <= "z") ||
            (c >= "0" && c <= "9") ||
            c == "_" ||
            c == "-"
        ) {
            handle += c;
            continue;
        } else {
            handle += "-";
        }
    }

    const prefix = settings.botConfig.prod ? "" : "test-";
    return (prefix + handle).slice(0, 31);
}
