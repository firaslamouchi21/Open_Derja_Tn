import { z } from "zod";

export const REGIONS = ["northwest", "north", "sahel", "south"] as const;

export const RegionSchema = z.enum(REGIONS);

export type Region = z.infer<typeof RegionSchema>;
