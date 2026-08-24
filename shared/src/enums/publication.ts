import { z } from "zod";

export const PUBLICATION_KINDS = ["paper", "thesis", "corpus", "tool", "book"] as const;

export const PublicationKindSchema = z.enum(PUBLICATION_KINDS);

export type PublicationKind = z.infer<typeof PublicationKindSchema>;

export const PUBLICATION_STATUSES = ["pending", "approved", "rejected"] as const;

export const PublicationStatusSchema = z.enum(PUBLICATION_STATUSES);

export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;

export const COMMENT_STATUSES = ["pending", "approved", "rejected"] as const;

export const CommentStatusSchema = z.enum(COMMENT_STATUSES);

export type CommentStatus = z.infer<typeof CommentStatusSchema>;
