export interface BotConfig {
    prod: boolean;
    adminPrivateKey: `0x${string}`;
}

const adminKey = () => {
    let adminPrivateKey =
        "8e56414358af3498bc7ed4e85e8559ce18415d971def753f14a8522bfb68e5ad";
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
