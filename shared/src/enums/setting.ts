import { z } from "zod";

export const SETTINGS = ["urban", "rural", "unknown"] as const;

export const SettingSchema = z.enum(SETTINGS);

export type Setting = z.infer<typeof SettingSchema>;
