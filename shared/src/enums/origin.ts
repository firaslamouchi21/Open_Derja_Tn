import { z } from "zod";

export const ORIGIN_LAYERS = [
  "arabic",
  "arabic_derived",
  "french",
  "amazigh",
  "italian",
  "turkish",
  "spanish",
  "other",
  "unknown",
] as const;

export const OriginLayerSchema = z.enum(ORIGIN_LAYERS);

export type OriginLayer = z.infer<typeof OriginLayerSchema>;

export const ORIGIN_STATUSES = ["proposed", "confirmed", "disputed"] as const;

export const OriginStatusSchema = z.enum(ORIGIN_STATUSES);

export type OriginStatus = z.infer<typeof OriginStatusSchema>;
