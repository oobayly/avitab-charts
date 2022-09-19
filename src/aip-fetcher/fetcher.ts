export type Region = "BI" | "EG" | "EI";

export interface Airport {
  icao: string;
  name: string;
  uri: string;
  documents?: Document[];
}

export interface Document {
  icao: string;
  name: string;
  id?: string;
  uri: string;
  lastModified?: string;
  etag?: string;
}

export interface FetcherResult {
  region: Region;
  airports: Airport[];
}

export type Fetcher = () => Promise<FetcherResult>;
