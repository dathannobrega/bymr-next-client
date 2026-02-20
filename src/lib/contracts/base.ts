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
  level: z.number().int().positive().optional(),
  countdownUpgrade: z.number().int().nonnegative().optional(),
  upgradeToLevel: z.number().int().positive().optional(),
});

export const BaseResourcesSchema = z.object({
  r1: z.number().int().nonnegative().default(0),
  r2: z.number().int().nonnegative().default(0),
  r3: z.number().int().nonnegative().default(0),
  r4: z.number().int().nonnegative().default(0),
  r1max: z.number().int().nonnegative().default(0),
  r2max: z.number().int().nonnegative().default(0),
  r3max: z.number().int().nonnegative().default(0),
  r4max: z.number().int().nonnegative().default(0),
});

export const BaseLoadResponseSchema = z.object({
  yardWidth: z.number().int().positive().default(20),
  yardHeight: z.number().int().positive().default(14),
  buildings: z.array(BaseBuildingSchema).default([]),
  resources: BaseResourcesSchema.optional(),
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
