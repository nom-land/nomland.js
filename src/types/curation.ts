import { Accountish } from "./account";

export interface CurationReason {
    comment: string;
    tagSuggestions: string[];
    titleSuggestion?: string;
}

export interface RawCuration {
    content: string; // content will be parsed to record in Curation
    sources: string[];
    date_published: string;
    external_url?: string;
}

export interface Curation {
    curator: Accountish;
    community: Accountish;
    lists: string[];
    reason: CurationReason;
    raw?: RawCuration; // raw is only recorded, not be parsed
}

export interface NoteId {
    characterId: number | bigint;
    noteId: number | bigint;
}
