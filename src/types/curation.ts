import { NoteEntity } from "crossbell";
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
    raws?: RawCuration[]; // raw is only recorded, not be parsed
}

export interface NoteId {
    characterId: number | bigint;
    noteId: number | bigint;
}

export interface CurationListData {
    curationList: CurationNote[];
    curationStat: Map<string, CurationStat>; // curationId -> CurationStat
}

export interface CurationNote {
    postId: string; // postId is {curationId}-{noteId}
    raw: NoteEntity;
    dateString: string;
    title: string;
    content: string;
    curatorAvatars: string[];
    curatorName: string;
    curatorHandle: string;
    suggestedTags: string[];
    listNames: string[];
    recordId: string;
    communityId: string;
    replies?: number;
}

export interface CurationStat {
    replies: number;
}

export interface ListData {
    listName: string;
    listId: number;
    count: number;
}
