import { z } from "zod";
import { BaseBuildingSchema, BaseResourcesSchema, YardThemeSchema } from "./base";

export const StateScopeSchema = z.enum(["auto", "main", "inferno"]);

export const StateSnapshotQuerySchema = z.object({
  baseId: z.string().min(1).optional(),
  scope: StateScopeSchema.optional(),
});

export const StateSnapshotResponseSchema = z.object({
  snapshotVersion: z.literal(1),
  serverTime: z.number().int().nonnegative(),
  player: z.object({
    userId: z.number().int().positive(),
    username: z.string().min(1),
    banned: z.boolean(),
    chatEnabled: z.boolean(),
    friendCount: z.number().int().nonnegative(),
  }),
  base: z.object({
    baseId: z.string().min(1),
    baseSaveId: z.number().int().positive(),
    type: z.string().min(1),
    yardWidth: z.number().int().positive(),
    yardHeight: z.number().int().positive(),
    yardTheme: YardThemeSchema,
  }),
  progression: z.object({
    level: z.number().int().positive(),
    tutorialStage: z.number().int().nonnegative(),
    points: z.number().int().nonnegative(),
    baseValue: z.number().int().nonnegative(),
    empireValue: z.number().int().nonnegative(),
    credits: z.number().int().nonnegative(),
    protected: z.number().int().nonnegative(),
    damage: z.number().int().nonnegative(),
    destroyed: z.number().int().nonnegative(),
  }),
  resources: z.object({
    active: BaseResourcesSchema,
    main: BaseResourcesSchema.optional(),
    inferno: BaseResourcesSchema.optional(),
  }),
  storeData: z
    .record(
      z.string(),
      z.object({
        q: z.number().int().nonnegative(),
        e: z.number().int().nonnegative().optional(),
      })
    )
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
  buildings: z.array(BaseBuildingSchema).default([]),
  maproom: z.object({
    worldId: z.string().nullable(),
    mapVersion: z.number().int().nonnegative(),
    outpostCount: z.number().int().nonnegative(),
    canAttack: z.boolean(),
  }),
});

export type StateScope = z.infer<typeof StateScopeSchema>;
export type StateSnapshotQuery = z.infer<typeof StateSnapshotQuerySchema>;
export type StateSnapshotResponse = z.infer<typeof StateSnapshotResponseSchema>;
