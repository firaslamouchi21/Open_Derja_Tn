import { z } from "zod";

export const CORPUS_UNITS = ["paragraph", "sentence", "phrase"] as const;

export const CorpusUnitSchema = z.enum(CORPUS_UNITS);

export type CorpusUnit = z.infer<typeof CorpusUnitSchema>;
