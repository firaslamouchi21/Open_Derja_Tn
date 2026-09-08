import type { Source } from '@open-derja/db';
import type { SourceRunner } from '@open-derja/core';
import { createWikipediaSourceRunner } from './wikipedia';

export function createSourceRunner(source: Source): SourceRunner {
  switch (source.kind) {
    case 'wikipedia':
      return createWikipediaSourceRunner(source);
    default:
      throw new Error(`No scraper implemented yet for source kind "${source.kind}"`);
  }
}
