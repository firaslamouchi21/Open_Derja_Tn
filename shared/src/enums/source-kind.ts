import { z } from "zod";

export const SOURCE_KINDS = [
  "youtube",
  "forum",
  "book",
  "subtitle",
  "contribution",
  "elicitation",
  "wikipedia",
  "commoncrawl",
  "tatoeba",
] as const;

export const SourceKindSchema = z.enum(SOURCE_KINDS);

export type SourceKind = z.infer<typeof SourceKindSchema>;
