import { z } from "zod";

export const ERAS = ["contemporary", "historical", "unknown"] as const;

export const EraSchema = z.enum(ERAS);

export type Era = z.infer<typeof EraSchema>;
