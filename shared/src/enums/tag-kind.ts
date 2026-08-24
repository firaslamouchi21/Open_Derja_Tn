import { z } from "zod";

export const TAG_KINDS = [
  "scope",
  "region",
  "era",
  "setting",
  "register",
  "code_switch",
  "sense",
  "quality",
] as const;

export const TagKindSchema = z.enum(TAG_KINDS);

export type TagKind = z.infer<typeof TagKindSchema>;
