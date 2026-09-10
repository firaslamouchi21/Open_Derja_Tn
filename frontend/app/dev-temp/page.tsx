"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

interface CoverageReport {
  regions: { region: string; corpusItemCount: number; wordCount: number; translationCount: number; share: number | null }[];
  levelDistribution: { unit: string; count: number }[];
  translator: { hitRate: number; lookupCount: number } | null;
}

interface GapsReport {
  translatorMisses: { region: string; missRate: number }[];
  weakRegions: { region: string; corpusItemCount: number }[];
}

interface LeaderboardEntry {
  contributorName: string | null;
  region: string | null;
  approvedCount: number;
  lastContributedAt: string | null;
}

interface ExploreResult {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
}

interface LexiconSearchResult {
  items: unknown[];
  total: number;
}

interface TranslateCoverageResult {
  wordCount: number;
  sentenceCount: number;
}

interface PublicSnapshotListing {
  id: string;
  version: string;
  corpusItemCount: number;
}

function useCount<T>(label: string, path: string, query: Record<string, string | number> | undefined, extract: (data: T) => number) {
  const result = useQuery<T>({
    queryKey: ["dev-temp", label],
    queryFn: () => apiRequest<T>(path, { query }),
  });
  return { label, path, result, count: result.data ? extract(result.data) : null };
}

function CountCard({
  label,
  path,
  result,
  count,
}: {
  label: string;
  path: string;
  result: UseQueryResult<unknown>;
  count: number | null;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border p-4">
      <p className="text-xs text-muted-foreground">{path}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {result.isLoading ? "…" : result.isError ? "—" : (count ?? "—")}
      </p>
      {result.isError && (
        <p className="mt-2 text-xs text-destructive">
          {result.error instanceof Error ? result.error.message : "Request failed"}
        </p>
      )}
    </div>
  );
}

function RawSection({ title, result }: { title: string; result: UseQueryResult<unknown> }) {
  return (
    <details className="rounded-[var(--radius)] border border-border p-4">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      {result.isLoading && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
      {result.isError && (
        <p className="mt-2 text-sm text-destructive">
          {result.error instanceof Error ? result.error.message : "Request failed"}
        </p>
      )}
      {result.data !== undefined && (
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </details>
  );
}

export default function DevTempPage() {
  const corpusItems = useCount<ExploreResult>("Corpus items (total)", "/corpus-items", { pageSize: 1 }, (d) => d.total);
  const lexicon = useCount<LexiconSearchResult>("Lexicon entries (total)", "/lexicon", { limit: 1 }, (d) => d.total);
  const snapshots = useCount<PublicSnapshotListing[]>("Published dataset snapshots", "/data", undefined, (d) => d.length);

  const coverage = useQuery<CoverageReport>({ queryKey: ["dev-temp", "coverage"], queryFn: () => apiRequest("/coverage") });
  const gaps = useQuery<GapsReport>({ queryKey: ["dev-temp", "gaps"], queryFn: () => apiRequest("/gaps") });
  const leaderboard = useQuery<LeaderboardEntry[]>({
    queryKey: ["dev-temp", "leaderboard"],
    queryFn: () => apiRequest("/contributors", { query: { limit: 200 } }),
  });
  const translateCoverage = useQuery<TranslateCoverageResult>({
    queryKey: ["dev-temp", "translate-coverage"],
    queryFn: () => apiRequest("/translate/coverage"),
  });

  return (
    <main className="mx-auto max-w-4xl p-6">
      <p className="text-sm text-muted-foreground">/dev-temp</p>
      <h1 className="text-2xl font-semibold">Dev temp — every count in one place</h1>
      <p className="mt-2 text-muted-foreground">
        This is a throwaway developer page, not a real spec&apos;d page from the design — it exists to
        eyeball every public number the backend can report, in one screen, while there&apos;s no real
        dashboard yet. It calls only public, unauthenticated endpoints, so it&apos;s safe to leave
        reachable, but it&apos;s meant to be deleted once the real landing/coverage/leaderboard pages
        replace it — see the note at the bottom.
      </p>

      <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <CountCard label={corpusItems.label} path={corpusItems.path} result={corpusItems.result} count={corpusItems.count} />
        <CountCard label={lexicon.label} path={lexicon.path} result={lexicon.result} count={lexicon.count} />
        <CountCard label={snapshots.label} path={snapshots.path} result={snapshots.result} count={snapshots.count} />
        <CountCard
          label="Lexicon variants (word forms known)"
          path="/translate/coverage"
          result={translateCoverage}
          count={translateCoverage.data?.wordCount ?? null}
        />
        <CountCard
          label="Sentence-level corpus items"
          path="/translate/coverage"
          result={translateCoverage}
          count={translateCoverage.data?.sentenceCount ?? null}
        />
        <CountCard
          label="Contributors on the leaderboard (capped at 200)"
          path="/contributors"
          result={leaderboard}
          count={leaderboard.data?.length ?? null}
        />
        <CountCard
          label="Regions below the 15% balance threshold"
          path="/gaps"
          result={gaps}
          count={gaps.data?.weakRegions.length ?? null}
        />
        <CountCard
          label="Translator search terms with a logged miss"
          path="/gaps"
          result={gaps}
          count={gaps.data?.translatorMisses.length ?? null}
        />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Full responses</h2>
        <RawSection title="GET /coverage" result={coverage} />
        <RawSection title="GET /gaps" result={gaps} />
        <RawSection title="GET /contributors?limit=200" result={leaderboard} />
        <RawSection title="GET /translate/coverage" result={translateCoverage} />
        <RawSection title="GET /corpus-items?pageSize=1" result={corpusItems.result} />
        <RawSection title="GET /lexicon?limit=1" result={lexicon.result} />
        <RawSection title="GET /data" result={snapshots.result} />
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Every card reading &ldquo;—&rdquo; with a red line under it means that request failed — most
        likely because the backend isn&apos;t running, or the database has nothing seeded yet, not
        because anything here is broken. This route is intentionally outside the
        <code className="mx-1 rounded bg-muted px-1">(public)</code>
        route group and the landing page&apos;s link list, so it won&apos;t show up as a real page —
        delete <code className="mx-1 rounded bg-muted px-1">app/dev-temp/</code> once real pages cover
        this data.
      </p>
    </main>
  );
}
