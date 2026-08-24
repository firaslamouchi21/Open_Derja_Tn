import { z } from "zod";

export const CharSpanSchema = z
  .object({
    char_start: z.number().int().nonnegative(),
    char_end: z.number().int().nonnegative(),
  })
  .refine((span) => span.char_end > span.char_start, {
    message: "char_end must be greater than char_start",
    path: ["char_end"],
  });

export type CharSpan = z.infer<typeof CharSpanSchema>;
