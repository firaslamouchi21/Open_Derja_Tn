import { z } from "zod";

export const DATASET_SPLITS = ["train", "dev", "test"] as const;

export const DatasetSplitSchema = z.enum(DATASET_SPLITS);

export type DatasetSplit = z.infer<typeof DatasetSplitSchema>;
