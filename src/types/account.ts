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

export type PlatformAccount = Guild;

export type Accountish = Account | Numberish;
