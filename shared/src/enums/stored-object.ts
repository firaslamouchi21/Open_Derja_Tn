import { z } from "zod";

export const STORED_OBJECT_KINDS = [
  "voice_clip",
  "dataset_snapshot",
  "db_backup",
  "book_scan",
  "other",
] as const;

export const StoredObjectKindSchema = z.enum(STORED_OBJECT_KINDS);

export type StoredObjectKind = z.infer<typeof StoredObjectKindSchema>;

export const STORED_OBJECT_STATUSES = ["pending", "stored", "deleted"] as const;

export const StoredObjectStatusSchema = z.enum(STORED_OBJECT_STATUSES);

export type StoredObjectStatus = z.infer<typeof StoredObjectStatusSchema>;
