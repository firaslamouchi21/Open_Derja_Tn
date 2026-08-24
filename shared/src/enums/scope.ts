import { z } from "zod";

export const SCOPES = ["pan_tunisian", "regional"] as const;

export const ScopeSchema = z.enum(SCOPES);

export type Scope = z.infer<typeof ScopeSchema>;
