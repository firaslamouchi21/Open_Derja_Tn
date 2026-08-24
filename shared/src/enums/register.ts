import { z } from "zod";

export const REGISTERS = ["neutral", "formal", "vulgar", "archaic", "unknown"] as const;

export const RegisterSchema = z.enum(REGISTERS);

export type Register = z.infer<typeof RegisterSchema>;
