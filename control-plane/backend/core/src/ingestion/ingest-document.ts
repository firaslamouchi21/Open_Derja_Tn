import type { Prisma, PrismaClient, Source } from '@open-derja/db';
import { assignDatasetSplit, computeMatchKey, detectScript, detectUnit } from '../text';
import { onCorpusItemIngested, spawnTasks } from '../tasks';
import { cleanText } from './clean';
import { isWithinLengthBounds } from './length-filter';
import { matchesAnyMarker } from './marker-filter';
import { computeMinHashSignature, estimateJaccardSimilarity, NEAR_DUPLICATE_THRESHOLD } from './near-duplicate';
import type { FetchedItem } from './runner';
import { splitIntoParagraphs, splitIntoSentences } from './split-text';

const NEAR_DUPLICATE_CANDIDATE_LIMIT = 20;
const INITIAL_ITEM_VERSION = 1;

export interface IngestDocumentResult {
  documentId: string;
  corpusItemIds: string[];
  nearDuplicatesSkipped: number;
}

interface InsertLeafResult {
  inserted: boolean;
  corpusItemId?: string;
}

async function insertLeafIfNotDuplicate(
  tx: Prisma.TransactionClient,
  documentId: string,
  parentId: string | null,
  position: number,
  charOffset: number,
  text: string,
): Promise<InsertLeafResult> {
  const matchKey = computeMatchKey(text);

  const candidates = await tx.$queryRaw<Array<{ id: string; text: string }>>`
    SELECT id, text FROM corpus_items
    WHERE match_key % ${matchKey}
    ORDER BY similarity(match_key, ${matchKey}) DESC
    LIMIT ${NEAR_DUPLICATE_CANDIDATE_LIMIT}
  `;

  if (candidates.length > 0) {
    const signature = computeMinHashSignature(text);
    const isNearDuplicate = candidates.some(
      (candidate) =>
        estimateJaccardSimilarity(signature, computeMinHashSignature(candidate.text)) >= NEAR_DUPLICATE_THRESHOLD,
    );
    if (isNearDuplicate) return { inserted: false };
  }

  const corpusItem = await tx.corpusItem.create({
    data: {
      documentId,
      parentId: parentId ?? undefined,
      unit: detectUnit(text),
      position,
      text,
      script: detectScript(text),
      matchKey,
      charOffset,
      datasetSplit: assignDatasetSplit(),
    },
  });

  return { inserted: true, corpusItemId: corpusItem.id };
}

export async function ingestDocument(
  prisma: PrismaClient,
  source: Source,
  item: FetchedItem,
  markers: string[] = [],
): Promise<IngestDocumentResult> {
  const cleaned = cleanText(item.rawBody);

  return prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        sourceId: source.id,
        externalRef: item.externalRef,
        title: item.title,
        rawBody: item.rawBody,
        license: source.licenseDefault,
        ingestedAt: item.fetchedAt,
      },
    });

    const corpusItemIds: string[] = [];
    let nearDuplicatesSkipped = 0;

    if (isWithinLengthBounds(cleaned) && matchesAnyMarker(cleaned, markers)) {
      const paragraphs = splitIntoParagraphs(cleaned);
      let paragraphSearchFrom = 0;

      for (const [paragraphPosition, paragraphText] of paragraphs.entries()) {
        const paragraphOffset = cleaned.indexOf(paragraphText, paragraphSearchFrom);
        paragraphSearchFrom = paragraphOffset + paragraphText.length;

        const sentences = splitIntoSentences(paragraphText);

        if (sentences.length <= 1) {
          const result = await insertLeafIfNotDuplicate(tx, document.id, null, paragraphPosition, paragraphOffset, paragraphText);
          if (result.inserted) corpusItemIds.push(result.corpusItemId as string);
          else nearDuplicatesSkipped += 1;
          continue;
        }

        const parent = await tx.corpusItem.create({
          data: {
            documentId: document.id,
            unit: 'paragraph',
            position: paragraphPosition,
            text: paragraphText,
            script: detectScript(paragraphText),
            charOffset: paragraphOffset,
            datasetSplit: assignDatasetSplit(),
          },
        });

        let sentenceSearchFrom = 0;
        for (const [sentencePosition, sentenceText] of sentences.entries()) {
          const sentenceOffset = paragraphText.indexOf(sentenceText, sentenceSearchFrom);
          sentenceSearchFrom = sentenceOffset + sentenceText.length;

          const result = await insertLeafIfNotDuplicate(tx, document.id, parent.id, sentencePosition, sentenceOffset, sentenceText);
          if (result.inserted) corpusItemIds.push(result.corpusItemId as string);
          else nearDuplicatesSkipped += 1;
        }
      }
    }

    for (const corpusItemId of corpusItemIds) {
      await spawnTasks(tx, onCorpusItemIngested(corpusItemId, INITIAL_ITEM_VERSION));
    }

    return { documentId: document.id, corpusItemIds, nearDuplicatesSkipped };
  });
}
