import { z } from "zod";
import { RegionSchema } from "../enums/region";
import { ScopeSchema } from "../enums/scope";

export const RegionSetSchema = z
  .object({
    scope: ScopeSchema,
    region: z.array(RegionSchema).max(4),
  })
  .refine(
    (value) =>
      value.scope === "pan_tunisian"
        ? value.region.length === 0
        : value.region.length >= 1,
    {
      message:
        "region must be empty when scope is pan_tunisian, and non-empty when scope is regional",
      path: ["region"],
    },
  )
  .refine((value) => new Set(value.region).size === value.region.length, {
    message: "region must not contain duplicates",
    path: ["region"],
  });

export type RegionSet = z.infer<typeof RegionSetSchema>;
