import { z } from "zod";

const YardPlannerTemplateInputSchema = z
  .object({
    slotid: z.number().int().nonnegative().optional(),
    slotId: z.number().int().nonnegative().optional(),
    name: z.string().optional(),
    data: z.record(z.string(), z.unknown()).default({}),
  })
  .transform((value) => ({
    slotId: value.slotId ?? value.slotid ?? 0,
    name: (value.name ?? "").trim(),
    data: value.data,
  }))
  .refine((value) => value.slotId > 0, {
    message: "slotId must be >= 1",
  });

export const YardPlannerTemplateSchema = z.object({
  slotId: z.number().int().positive(),
  name: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export const YardPlannerTemplatesResponseSchema = z.object({
  error: z.number().int().nonnegative().optional(),
  templates: z.array(YardPlannerTemplateSchema),
});

export const YardPlannerSaveTemplateRequestSchema = z.object({
  slotId: z.number().int().positive(),
  name: z.string().trim().min(1).max(64),
  data: z.record(z.string(), z.unknown()),
});

export type YardPlannerTemplate = z.infer<typeof YardPlannerTemplateSchema>;
export type YardPlannerTemplatesResponse = z.infer<typeof YardPlannerTemplatesResponseSchema>;
export type YardPlannerSaveTemplateRequest = z.infer<typeof YardPlannerSaveTemplateRequestSchema>;

export function parseYardPlannerTemplatesResponse(raw: unknown): YardPlannerTemplatesResponse {
  const source = asRecord(raw) ?? {};
  const templates = extractRawTemplates(source)
    .map((entry) => YardPlannerTemplateInputSchema.safeParse(entry))
    .filter((result): result is { success: true; data: YardPlannerTemplate } => result.success)
    .map((result) => result.data)
    .sort((a, b) => a.slotId - b.slotId);

  return YardPlannerTemplatesResponseSchema.parse({
    error: normalizeErrorField(source.error),
    templates,
  });
}

function extractRawTemplates(source: Record<string, unknown>): unknown[] {
  if (Array.isArray(source.templates)) {
    return source.templates;
  }

  return Object.entries(source)
    .filter(([key]) => /^\d+$/.test(key))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, value]) => value);
}

function normalizeErrorField(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}
