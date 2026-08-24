import { z } from "zod";

export const FLAG_REASONS = [
  "offensive",
  "personal_data",
  "wrong",
  "copyright",
  "other",
] as const;

export const FlagReasonSchema = z.enum(FLAG_REASONS);

export type FlagReason = z.infer<typeof FlagReasonSchema>;

export const FLAG_STATUSES = ["open", "resolved", "dismissed"] as const;

export const FlagStatusSchema = z.enum(FLAG_STATUSES);

export type FlagStatus = z.infer<typeof FlagStatusSchema>;

export const CORRECTION_STATUSES = ["proposed", "accepted", "rejected"] as const;

export const CorrectionStatusSchema = z.enum(CORRECTION_STATUSES);

export type CorrectionStatus = z.infer<typeof CorrectionStatusSchema>;
