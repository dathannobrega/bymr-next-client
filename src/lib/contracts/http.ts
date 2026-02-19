import { z } from "zod";

export const StructuredHttpErrorSchema = z.object({
  error: z.string().min(1),
  code: z.string().optional(),
  traceId: z.string().optional(),
  details: z.unknown().optional(),
});

export type StructuredHttpError = z.infer<typeof StructuredHttpErrorSchema>;
