import { z } from "zod";

export const LICENSES = [
  "cc_by_sa",
  "cc_by_nc",
  "research_use_only",
  "public_domain",
  "unknown",
] as const;

export const LicenseSchema = z.enum(LICENSES);

export type License = z.infer<typeof LicenseSchema>;
