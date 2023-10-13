import { createClient, Client } from "@urql/core";
import { cacheExchange, fetchExchange } from "@urql/core";
import { settings } from "../config";

export const client: Client = createClient({
    url: settings.graphqlEndpoint,
    exchanges: [cacheExchange, fetchExchange],
});
