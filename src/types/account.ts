import { Numberish } from "crossbell";
import { Guild } from "discord.js";

export interface Account {
    platform: "Discord" | "Telegram" | "General";
    handle: string; // unique handle in that platform
    guildId?: string;
    nickname?: string;
    avatar?: string;
    banner?: string;
    dao?: boolean;
    variant?: string;
}

export type DiscordAccount = Guild;

export type TelegramUser = {
    /** This object represents a Telegram user or bot. */
    /** Unique identifier for this user or bot. This number may have more than 32 significant bits and some programming languages may have difficulty/silent defects in interpreting it. But it has at most 52 significant bits, so a 64-bit integer or double-precision float type are safe for storing this identifier. */
    id: number;
    /** True, if this user is a bot */
    is_bot: boolean;
    /** User's or bot's first name */
    first_name: string;
    /** User's or bot's last name */
    last_name?: string;
    /** User's or bot's username */
    username?: string;
    /** IETF language tag of the user's language */
    language_code?: string;
    /** True, if this user is a Telegram Premium user */
    is_premium?: true;
    /** True, if this user added the bot to the attachment menu */
    added_to_attachment_menu?: true;
};

export type TelegramGroup = {
    /** Unique identifier for this chat. This number may have more than 32 significant bits and some programming languages may have difficulty/silent defects in interpreting it. But it has at most 52 significant bits, so a signed 64-bit integer or double-precision float type are safe for storing this identifier. */
    id: number;
    /** Type of chat, can be either “private”, “group”, “supergroup” or “channel” */
    type: string;
    /** Username, for private chats, supergroups and channels if available */
    username?: string;
    title: string;
};

export type Accountish = Account | Numberish;
