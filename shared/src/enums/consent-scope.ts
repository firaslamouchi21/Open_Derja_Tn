import { z } from "zod";

export const CONSENT_SCOPES = ["text_only", "includes_voice"] as const;

export const ConsentScopeSchema = z.enum(CONSENT_SCOPES);

export type ConsentScope = z.infer<typeof ConsentScopeSchema>;
