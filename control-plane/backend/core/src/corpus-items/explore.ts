import type { CorpusUnit, Era, Prisma, PrismaClient, Region, Register, Scope, Script, Setting } from '@open-derja/db';

export interface ExploreFilters {
  q?: string;
  regions?: Region[];
  scope?: Scope;
  era?: Era;
  setting?: Setting;
  register?: Register;
  script?: Script;
  unit?: CorpusUnit;
  hasTranslation?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ExploreResultItem {
  id: string;
  text: string;
  unit: CorpusUnit;
  script: Script;
  canonicalForm: string | null;
  createdAt: Date;
}

export interface ExploreResult {
  items: ExploreResultItem[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function searchCorpusItems(prisma: PrismaClient, filters: ExploreFilters): Promise<ExploreResult> {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  const clauses: Prisma.CorpusItemWhereInput[] = [];

  if (filters.regions?.length) {
    clauses.push({ tagConsensus: { some: { kind: 'region', agreedValues: { hasSome: filters.regions } } } });
  }
  if (filters.scope) {
    clauses.push({ tagConsensus: { some: { kind: 'scope', agreedValues: { has: filters.scope } } } });
  }
  if (filters.era) {
    clauses.push({ tagConsensus: { some: { kind: 'era', agreedValues: { has: filters.era } } } });
  }
  if (filters.setting) {
    clauses.push({ tagConsensus: { some: { kind: 'setting', agreedValues: { has: filters.setting } } } });
  }
  if (filters.register) {
    clauses.push({ tagConsensus: { some: { kind: 'register', agreedValues: { has: filters.register } } } });
  }
  if (filters.script) {
    clauses.push({ script: filters.script });
  }
  if (filters.unit) {
    clauses.push({ unit: filters.unit });
  }
  if (filters.hasTranslation !== undefined) {
    clauses.push(filters.hasTranslation ? { translations: { some: {} } } : { translations: { none: {} } });
  }
  if (filters.q) {
    clauses.push({ text: { contains: filters.q, mode: 'insensitive' } });
  }

  const where: Prisma.CorpusItemWhereInput = clauses.length ? { AND: clauses } : {};

  const [items, total] = await Promise.all([
    prisma.corpusItem.findMany({
      where,
      select: { id: true, text: true, unit: true, script: true, canonicalForm: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.corpusItem.count({ where }),
  ]);

  return { items, total, page, pageSize };
}
