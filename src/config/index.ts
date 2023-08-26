export interface BotConfig {
    prod: boolean;
    adminPrivateKey: `0x${string}`;
}

const adminKey = () => {
    let adminPrivateKey =
        "***REMOVED***";
    if (!adminPrivateKey.startsWith("0x")) {
        adminPrivateKey = `0x${adminPrivateKey}`;
    }
    return adminPrivateKey;
};

const botConfig = {
    prod: true,
    adminPrivateKey: adminKey(),
} as BotConfig;

export const settings = {
    botConfig,
};
