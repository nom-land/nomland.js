export interface BotConfig {
    prod: boolean;
}

const botConfig = {
    prod: process.env.NODE_ENV === "development" ? false : true,
} as BotConfig;

export const settings = {
    botConfig,
    graphqlEndpoint: "https://indexer.crossbell.io/v1/graphql",
};
