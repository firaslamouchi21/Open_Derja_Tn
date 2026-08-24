import { z } from "zod";

export const SCRIPTS = ["arabic", "arabizi", "mixed", "latin"] as const;

export const ScriptSchema = z.enum(SCRIPTS);

export type Script = z.infer<typeof ScriptSchema>;
