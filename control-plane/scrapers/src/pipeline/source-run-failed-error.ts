export class SourceRunFailedError extends Error {
  constructor(
    public readonly sourceId: string,
    public readonly sourceDisabled: boolean,
    public readonly cause: unknown,
  ) {
    super(`Scraper run failed for source ${sourceId}${sourceDisabled ? ' (source disabled after repeated failures)' : ''}`);
    this.name = 'SourceRunFailedError';
  }
}
