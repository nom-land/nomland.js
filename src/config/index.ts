export interface BotConfig {
    prod: boolean;
}

const botConfig = {
    prod: true,
} as BotConfig;

export const settings = {
    botConfig,
    graphqlEndpoint: "https://indexer.crossbell.io/v1/graphql",
};
