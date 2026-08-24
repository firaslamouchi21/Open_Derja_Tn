import { z } from "zod";

export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "sent",
  "failed",
  "failed_permanent",
] as const;

export const OutboxStatusSchema = z.enum(OUTBOX_STATUSES);

export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;
