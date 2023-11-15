import { log } from "../utils/log";
import { Record } from "../types/record";
import { BaseEntity, Entity } from "./entity/entityTypes";

export interface EleEntry {
    url: string;
    platform?: "mp.weixin" | "Mirror" | "Medium" | "Matters" | "Personal Blog" | "Other" | "douban";
    IPFSUrl?: string;
    name?: string;
    type?: "post" /* Default type. Any content like a blog post, a tweet post, an article... */ | "book" /* book */ | "video" /* video */ | "podcast" /* podcast */ | "paper" /* academic paper, scholarly articles, formal piece of writing about an academic subject. */;
    metaData?: ElePostMetaData | EleBookMetaData;
}

export interface EleBookMetaData {
    title: string;
    // author names
    authors: string[];
    // language of this book, iso6391Name
    language: string;
    // translator names
    translators?: string[];
    // Publish date
    publishDate?: string;
    // how many pages
    pages?: number;
    ISBN?: string;
}
export interface ElePostMetaData {
    title: string;
    // author names
    authors: string[];
    // type of post
    type: "post" | "blog" | "poem" | "essay" | "comment" | "novel";
    // language of this post entry, iso6391Name
    language: string;
    // keywords
    keywords?: string[];
    // translator names
    translators?: string[];
    url?: string;
    // post date or modified date
    lastModified?: string;
    // original post title
    originalTitle?: string;
    originalUrl?: string;
    originalLanguage?: string;
}

export interface ExtractusArticleData {
    url?: string;
    links?: string[];
    title?: string;
    description?: string;
    image?: string;
    author?: string;
    content?: string;
    source?: string;
    published?: string;
    ttr?: number;
}

type Parser = "elephant" | "extractus";
const parsers = {
    elephant: {
        module: "elephant-sdk",
    },
    extractus: {
        module: "@extractus/article-extractor",
    },
};

function formatElephantData(data: EleEntry, baseEntity: BaseEntity): Entity {
    return {
        title: data.name,
        description: "",
        covers: [],
        type: data.type,
        metaData: {
            platform: data.platform,
            ...data.metaData,
        },
        ...baseEntity,
    };
}

function formatExtractusData(data: ExtractusArticleData, baseEntity: BaseEntity): Entity {
    return {
        title: data.title,
        description: data.description,
        covers: [
            {
                address: data.image,
            },
        ],
        type: "post",
        links: data.links,
        metaData: {
            type: "post",
            platform: data.source,
            authors: [data.author || ""],
            language: "unknown",
        },
        ...baseEntity,
    } as Entity;
}

async function extractData(url: string, parser: "elephant" | "extractus"): Promise<Entity> {
    const baseEntity = {
        url,
        version: "20231115",
        parser,
    } as BaseEntity;

    switch (parser) {
        case "elephant":
            try {
                const { extract } = await import("elephant-sdk");
                const data = (await extract(url)) as EleEntry;
                return formatElephantData(data, baseEntity);
            } catch (e) {
                log.error(e);
                // If there's error, don't break and just try the next one.
            }
        case "extractus":
            try {
                const { extract } = await import("@extractus/article-extractor");
                const data = (await extract(url)) as ExtractusArticleData;
                return formatExtractusData(data, baseEntity);
            } catch (e) {
                log.error(e);
            }
        default:
            return baseEntity;
    }
}

export async function parseRecord(url: string, parser: Parser) {
    let article: Entity = await extractData(url, parser);

    return {
        ...article,
        record_type: article.type, // TODO: support book/video?
        parsed: true,
    } as Record;
}
