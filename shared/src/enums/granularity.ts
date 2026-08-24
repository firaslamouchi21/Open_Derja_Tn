import { z } from "zod";

export const GRANULARITIES = ["word", "phrase", "sentence"] as const;

export const GranularitySchema = z.enum(GRANULARITIES);

export type Granularity = z.infer<typeof GranularitySchema>;
