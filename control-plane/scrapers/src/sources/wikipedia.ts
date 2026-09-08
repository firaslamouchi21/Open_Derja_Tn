import { Readable } from 'node:stream';
import unbzip2 from 'unbzip2-stream';
import type { Source } from '@open-derja/db';
import type { FetchedItem, SourceRunner } from '@open-derja/core';
import { isPathAllowedByRobotsTxt } from '../http/robots';
import { scraperUserAgent } from '../http/user-agent';
import { collectDumpPages } from './dump-xml';
import { stripWikitext } from './wikitext';

const DEFAULT_DUMP_URL =
  'https://dumps.wikimedia.org/incubatorwiki/latest/incubatorwiki-latest-pages-articles-multistream.xml.bz2';
const DEFAULT_PAGE_TITLE_PREFIX = 'Wp/aeb/';

export interface WikipediaSourceRunnerOptions {
  dumpUrl?: string;
  pageTitlePrefix?: string;
}

export function createWikipediaSourceRunner(source: Source, options: WikipediaSourceRunnerOptions = {}): SourceRunner {
  const dumpUrl = options.dumpUrl ?? DEFAULT_DUMP_URL;
  const pageTitlePrefix = options.pageTitlePrefix ?? DEFAULT_PAGE_TITLE_PREFIX;
  const userAgent = scraperUserAgent();

  return {
    fetch(since?: Date): AsyncIterable<FetchedItem> {
      return fetchFromDump(dumpUrl, pageTitlePrefix, userAgent, since);
    },
  };
}

async function* fetchFromDump(
  dumpUrl: string,
  pageTitlePrefix: string,
  userAgent: string,
  since: Date | undefined,
): AsyncGenerator<FetchedItem> {
  const dumpUrlObject = new URL(dumpUrl);
  const robotsUrl = new URL('/robots.txt', dumpUrlObject).toString();
  const allowed = await isPathAllowedByRobotsTxt(robotsUrl, dumpUrlObject.pathname, userAgent);
  if (!allowed) {
    throw new Error(`robots.txt disallows ${userAgent} from ${dumpUrlObject.pathname} on ${dumpUrlObject.host}`);
  }

  const headResponse = await fetch(dumpUrl, { method: 'HEAD', headers: { 'User-Agent': userAgent } });
  if (!headResponse.ok) throw new Error(`Dump HEAD request failed: ${headResponse.status}`);

  const lastModifiedHeader = headResponse.headers.get('last-modified');
  const dumpLastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : undefined;
  if (since && dumpLastModified && dumpLastModified <= since) {
    return;
  }

  const response = await fetch(dumpUrl, { headers: { 'User-Agent': userAgent } });
  if (!response.ok || !response.body) throw new Error(`Dump download failed: ${response.status}`);

  const compressedStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  const decompressedStream = compressedStream.pipe(unbzip2());
  const pages = await collectDumpPages(decompressedStream, pageTitlePrefix);

  for (const page of pages) {
    const plainText = stripWikitext(page.text);
    if (!plainText) continue;
    yield { externalRef: page.title, title: page.title, rawBody: plainText, fetchedAt: new Date() };
  }
}
