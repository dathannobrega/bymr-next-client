import z from "zod";

export const StateScopeSchema = z.enum(["auto", "main", "inferno"]);

export const StateQuerySchema = z.object({
  baseId: z.string().min(1).optional(),
  scope: StateScopeSchema.default("auto"),
});

export const StateResourceSummarySchema = z.object({
  r1: z.number().int().nonnegative(),
  r2: z.number().int().nonnegative(),
  r3: z.number().int().nonnegative(),
  r4: z.number().int().nonnegative(),
  r1max: z.number().int().nonnegative(),
  r2max: z.number().int().nonnegative(),
  r3max: z.number().int().nonnegative(),
  r4max: z.number().int().nonnegative(),
});

export const StateStoreItemSchema = z.object({
  q: z.number().int().nonnegative(),
  e: z.number().int().nonnegative().optional(),
});

export const StateAcademyTrainingSchema = z.object({
  startedAt: z.number().int().nonnegative(),
  durationSec: z.number().int().positive(),
  completesAt: z.number().int().positive(),
  remainingSec: z.number().int().nonnegative(),
  targetLevel: z.number().int().positive(),
});

export const StateAcademyMonsterSchema = z.object({
  level: z.number().int().positive(),
  maxLevel: z.number().int().positive(),
  inLocker: z.boolean(),
  canTrain: z.boolean(),
  nextTrainingCostR3: z.number().int().nonnegative().optional(),
  nextTrainingDurationSec: z.number().int().nonnegative().optional(),
  training: StateAcademyTrainingSchema.optional(),
});

export const StateAcademySchema = z.object({
  buildingId: z.string().nullable(),
  buildingLevel: z.number().int().nonnegative(),
  busy: z.boolean(),
  activeMonsterId: z.string().nullable(),
  monsters: z.record(z.string(), StateAcademyMonsterSchema),
});

export const StateBuildingSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  level: z.number().int().positive().optional(),
  footprintW: z.number().int().positive().optional(),
  footprintH: z.number().int().positive().optional(),
  countdownUpgrade: z.number().int().nonnegative().optional(),
  upgradeToLevel: z.number().int().positive().optional(),
  hp: z.number().int().nonnegative().optional(),
  maxHp: z.number().int().positive().optional(),
  repairing: z.boolean().optional(),
});

export const StateYardThemeSchema = z.enum(["grass", "sand", "lava", "rock", "crater"]);

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
    yardTheme: StateYardThemeSchema,
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
    active: StateResourceSummarySchema,
    main: StateResourceSummarySchema.optional(),
    inferno: StateResourceSummarySchema.optional(),
  }),
  storeData: z.record(z.string(), StateStoreItemSchema).optional(),
  academy: StateAcademySchema.optional(),
  buildings: z.array(StateBuildingSchema),
  maproom: z.object({
    worldId: z.string().nullable(),
    mapVersion: z.number().int().nonnegative(),
    outpostCount: z.number().int().nonnegative(),
    canAttack: z.boolean(),
  }),
});

export type StateScope = z.infer<typeof StateScopeSchema>;
export type StateQuery = z.infer<typeof StateQuerySchema>;
export type StateSnapshotResponse = z.infer<typeof StateSnapshotResponseSchema>;
