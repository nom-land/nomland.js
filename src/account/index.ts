import { Guild } from "discord.js";
import {
    Account,
    DiscordAccount,
    TelegramGroup,
    TelegramUser,
} from "../types/account";
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
