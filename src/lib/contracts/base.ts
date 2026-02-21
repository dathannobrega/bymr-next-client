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
  fortification: z.number().int().nonnegative().optional(),
  footprintW: z.number().int().positive().optional(),
  footprintH: z.number().int().positive().optional(),
  countdownBuild: z.number().int().nonnegative().optional(),
  countdownUpgrade: z.number().int().nonnegative().optional(),
  countdownFortify: z.number().int().nonnegative().optional(),
  upgradeToLevel: z.number().int().positive().optional(),
  hp: z.number().int().nonnegative().optional(),
  maxHp: z.number().int().positive().optional(),
  repairing: z.boolean().optional(),
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

export const YardThemeSchema = z.enum(["grass", "sand", "lava", "rock", "crater"]);

export const BaseLoadResponseSchema = z.object({
  yardWidth: z.number().int().positive().default(20),
  yardHeight: z.number().int().positive().default(14),
  yardTheme: YardThemeSchema.optional(),
  buildings: z.array(BaseBuildingSchema).default([]),
  resources: BaseResourcesSchema.optional(),
  progression: z
    .object({
      level: z.number().int().positive(),
      tutorialStage: z.number().int().nonnegative(),
      points: z.number().int().nonnegative(),
      baseValue: z.number().int().nonnegative(),
      empireValue: z.number().int().nonnegative(),
      protected: z.number().int().nonnegative(),
      damage: z.number().int().nonnegative(),
      destroyed: z.number().int().nonnegative(),
    })
    .optional(),
  repair: z
    .object({
      estimatedDurationSec: z.number().int().nonnegative(),
      repairingCount: z.number().int().nonnegative(),
      damagedCount: z.number().int().nonnegative(),
    })
    .optional(),
  academy: z
    .object({
      buildingId: z.string().nullable(),
      buildingLevel: z.number().int().nonnegative(),
      busy: z.boolean(),
      activeMonsterId: z.string().nullable(),
      monsters: z.record(
        z.string(),
        z.object({
          level: z.number().int().positive(),
          maxLevel: z.number().int().positive(),
          inLocker: z.boolean(),
          canTrain: z.boolean(),
          nextTrainingCostR3: z.number().int().nonnegative().optional(),
          nextTrainingDurationSec: z.number().int().nonnegative().optional(),
          training: z
            .object({
              startedAt: z.number().int().nonnegative(),
              durationSec: z.number().int().positive(),
              completesAt: z.number().int().positive(),
              remainingSec: z.number().int().nonnegative(),
              targetLevel: z.number().int().positive(),
            })
            .optional(),
        })
      ),
    })
    .optional(),
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
