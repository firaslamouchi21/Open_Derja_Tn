export interface FetchedItem {
  externalRef: string;
  title?: string;
  rawBody: string;
  fetchedAt: Date;
}

export interface SourceRunner {
  fetch(since?: Date): AsyncIterable<FetchedItem>;
}
