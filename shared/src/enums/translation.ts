import { z } from "zod";

export const TARGET_LANGS = ["msa", "fr", "en"] as const;

export const TargetLangSchema = z.enum(TARGET_LANGS);

export type TargetLang = z.infer<typeof TargetLangSchema>;

export const TRANSLATION_SOURCES = ["llm_draft", "human", "corrected_llm"] as const;

export const TranslationSourceSchema = z.enum(TRANSLATION_SOURCES);

export type TranslationSource = z.infer<typeof TranslationSourceSchema>;
