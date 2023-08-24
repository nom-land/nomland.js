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
    appName: "nunti", //will be used in the "sources" of metadata
    curationCategoryName: "colib lists", //will be used in the new created category in discord server
    defaultCurationList: "general", //will be used in the new created linklist in the community
    botConfig,
    loadingPrompt:
        "⛏️ Processing...(I'm a little slow for now - but all my content is stored decentrally using blockchain so it's worth it)",
    curatorUsageMsg: `Usage: {{url}} reason to share... <@${botConfig.clientId}> #tag1 #tag2 #curation-list

Note: tags and curation list are optional.
    `,
    prodAddr: "0x82D071484572125A30e6190F79c2e746c160CDfC" as `0x${string}`,
};
