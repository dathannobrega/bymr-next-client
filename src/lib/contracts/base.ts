import { z } from "zod";

export const BaseLoadRequestSchema = z.object({
  baseId: z.string().min(1),
  mode: z.enum(["view", "build"]),
});

export const BaseBuildingSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

export const BaseLoadResponseSchema = z.object({
  yardWidth: z.number().int().positive().default(20),
  yardHeight: z.number().int().positive().default(14),
  buildings: z.array(BaseBuildingSchema).default([]),
});

export const NonCriticalBaseSaveActionSchema = z.enum([
  "SetDecorationVisibility",
  "SetCosmeticLoadout",
  "SetUiPreference",
]);

export const BaseSaveAuditSchema = z.object({
  action: NonCriticalBaseSaveActionSchema,
  at: z.string().datetime(),
  clientVersion: z.string().min(1),
});

export const BaseSaveRequestSchema = z.object({
  baseId: z.string().min(1),
  action: NonCriticalBaseSaveActionSchema,
  payload: z.record(z.string(), z.unknown()),
  audit: BaseSaveAuditSchema,
});

export const BaseSaveResponseSchema = z.object({
  ok: z.boolean(),
  savedAt: z.string().optional(),
});

export type BaseLoadRequest = z.infer<typeof BaseLoadRequestSchema>;
export type BaseLoadResponse = z.infer<typeof BaseLoadResponseSchema>;
export type BaseSaveRequest = z.infer<typeof BaseSaveRequestSchema>;
export type BaseSaveResponse = z.infer<typeof BaseSaveResponseSchema>;
export type NonCriticalBaseSaveAction = z.infer<typeof NonCriticalBaseSaveActionSchema>;
