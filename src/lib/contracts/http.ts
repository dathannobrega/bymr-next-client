import { z } from "zod";

export const StructuredHttpErrorSchema = z.object({
  error: z.string().min(1),
  code: z.string().optional(),
  traceId: z.string().optional(),
  details: z.unknown().optional(),
});

export const ClientSafeErrorEnvelopeSchema = z.object({
  error: z.string().min(1),
  errorDetails: z
    .object({
      status: z.number().optional(),
      message: z.string().optional(),
      code: z.string().optional(),
      traceId: z.string().optional(),
      data: z
        .object({
          code: z.string().optional(),
          issues: z.array(z.string()).optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

export type StructuredHttpError = z.infer<typeof StructuredHttpErrorSchema>;
export type ClientSafeErrorEnvelope = z.infer<typeof ClientSafeErrorEnvelopeSchema>;
