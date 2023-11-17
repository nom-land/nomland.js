// TODO: upgrade record type with considering entity types...
export interface Record {
    url: string;
    title?: string;
    author?: string;
    translator?: string;
    refers?: {
        commitMsg: string;
        upStream: string; // Another record
    }[];
    language?: string;
    record_type?: "article" | "book";
    source?: string;
    last_modified?: Date;
    parsed: boolean;
}

export type Parser = "elephant" | "extractus";
