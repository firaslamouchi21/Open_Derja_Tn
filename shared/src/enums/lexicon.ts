import { z } from "zod";

export const DOMAINS = [
  "everyday",
  "food",
  "admin",
  "agriculture",
  "kinship",
  "other",
] as const;

export const DomainSchema = z.enum(DOMAINS);

export type Domain = z.infer<typeof DomainSchema>;

export const PARTS_OF_SPEECH = ["noun", "verb", "adj", "particle"] as const;

export const PartOfSpeechSchema = z.enum(PARTS_OF_SPEECH);

export type PartOfSpeech = z.infer<typeof PartOfSpeechSchema>;
