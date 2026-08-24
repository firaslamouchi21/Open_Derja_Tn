import { z } from "zod";

export const RIGHTS_STATUSES = ["granted", "revoked", "not_applicable"] as const;

export const RightsStatusSchema = z.enum(RIGHTS_STATUSES);

export type RightsStatus = z.infer<typeof RightsStatusSchema>;
