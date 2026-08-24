import { z } from "zod";

export const TASK_TYPES = [
  "review",
  "region_tag",
  "confirm",
  "translate_msa",
  "translate_fr",
  "translate_en",
  "transliterate_to_arabic",
  "transliterate_to_arabizi",
  "standardise",
  "adjudicate",
  "link_lemma",
] as const;

export const TaskTypeSchema = z.enum(TASK_TYPES);

export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TASK_STATUSES = [
  "open",
  "claimed",
  "done",
  "rejected",
  "needs_rework",
] as const;

export const TaskStatusSchema = z.enum(TASK_STATUSES);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
