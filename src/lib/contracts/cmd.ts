import { z } from "zod";

export const CmdOperationSchema = z.enum([
  "PlaceBuilding",
  "MoveBuilding",
  "UpgradeBuilding",
  "CancelUpgrade",
  "CollectHarvester",
  "PurchaseStoreItem",
  "ApplyYardPlannerTemplate",
  "StartRepairBuilding",
  "StartRepairAllBuildings",
  "StartAcademyUpgrade",
  "CancelAcademyUpgrade",
  "FinishAcademyUpgradeNow",
]);

const PlaceBuildingArgsSchema = z.object({
  buildingType: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

const MoveBuildingArgsSchema = z.object({
  buildingId: z.string().min(1),
  toX: z.number().int().nonnegative(),
  toY: z.number().int().nonnegative(),
});

const UpgradeBuildingArgsSchema = z.object({
  buildingId: z.string().min(1),
  targetLevel: z.number().int().positive().optional(),
  deferSeconds: z.number().int().positive().max(60 * 60 * 24 * 7).optional(),
});

const CancelUpgradeArgsSchema = z.object({
  buildingId: z.string().min(1),
});

const CollectHarvesterArgsSchema = z.object({
  buildingId: z.string().min(1),
  amount: z.number().int().positive().optional(),
});

const PurchaseStoreItemArgsSchema = z.object({
  item: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((value) => value.toUpperCase()),
  quantity: z.number().int().positive().max(999).default(1),
});

const ApplyYardPlannerTemplateArgsSchema = z.object({
  slotId: z.number().int().positive().max(64),
});

const StartRepairBuildingArgsSchema = z.object({
  buildingId: z.string().min(1),
});

const StartRepairAllBuildingsArgsSchema = z.object({});

const StartAcademyUpgradeArgsSchema = z.object({
  monsterId: z
    .string()
    .trim()
    .regex(/^(?:C|IC)\d{1,3}$/i)
    .transform((value) => value.toUpperCase()),
});

const CancelAcademyUpgradeArgsSchema = z.object({
  monsterId: z
    .string()
    .trim()
    .regex(/^(?:C|IC)\d{1,3}$/i)
    .transform((value) => value.toUpperCase()),
});

const FinishAcademyUpgradeNowArgsSchema = z.object({
  monsterId: z
    .string()
    .trim()
    .regex(/^(?:C|IC)\d{1,3}$/i)
    .transform((value) => value.toUpperCase()),
});

export const CmdArgsByOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("PlaceBuilding"), args: PlaceBuildingArgsSchema }),
  z.object({ op: z.literal("MoveBuilding"), args: MoveBuildingArgsSchema }),
  z.object({ op: z.literal("UpgradeBuilding"), args: UpgradeBuildingArgsSchema }),
  z.object({ op: z.literal("CancelUpgrade"), args: CancelUpgradeArgsSchema }),
  z.object({ op: z.literal("CollectHarvester"), args: CollectHarvesterArgsSchema }),
  z.object({ op: z.literal("PurchaseStoreItem"), args: PurchaseStoreItemArgsSchema }),
  z.object({ op: z.literal("ApplyYardPlannerTemplate"), args: ApplyYardPlannerTemplateArgsSchema }),
  z.object({ op: z.literal("StartRepairBuilding"), args: StartRepairBuildingArgsSchema }),
  z.object({ op: z.literal("StartRepairAllBuildings"), args: StartRepairAllBuildingsArgsSchema }),
  z.object({ op: z.literal("StartAcademyUpgrade"), args: StartAcademyUpgradeArgsSchema }),
  z.object({ op: z.literal("CancelAcademyUpgrade"), args: CancelAcademyUpgradeArgsSchema }),
  z.object({ op: z.literal("FinishAcademyUpgradeNow"), args: FinishAcademyUpgradeNowArgsSchema }),
]);

export const CmdEnvelopeSchema = z.object({
  op: CmdOperationSchema,
  args: z.record(z.string(), z.unknown()),
  seq: z.number().int().positive(),
  idempotencyKey: z.string().min(8),
});

export const CmdResponseSchema = z.object({
  ok: z.boolean(),
  seq: z.number().int().positive().optional(),
  serverTime: z.number().int().optional(),
  delta: z.array(z.record(z.string(), z.unknown())).optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export type CmdOperation = z.infer<typeof CmdOperationSchema>;
export type CmdEnvelope = z.infer<typeof CmdEnvelopeSchema>;
export type CmdResponse = z.infer<typeof CmdResponseSchema>;
export type PlaceBuildingArgs = z.infer<typeof PlaceBuildingArgsSchema>;
export type MoveBuildingArgs = z.infer<typeof MoveBuildingArgsSchema>;
export type UpgradeBuildingArgs = z.infer<typeof UpgradeBuildingArgsSchema>;
export type CancelUpgradeArgs = z.infer<typeof CancelUpgradeArgsSchema>;
export type CollectHarvesterArgs = z.infer<typeof CollectHarvesterArgsSchema>;
export type PurchaseStoreItemArgs = z.infer<typeof PurchaseStoreItemArgsSchema>;
export type ApplyYardPlannerTemplateArgs = z.infer<typeof ApplyYardPlannerTemplateArgsSchema>;
export type StartRepairBuildingArgs = z.infer<typeof StartRepairBuildingArgsSchema>;
export type StartRepairAllBuildingsArgs = z.infer<typeof StartRepairAllBuildingsArgsSchema>;
export type StartAcademyUpgradeArgs = z.infer<typeof StartAcademyUpgradeArgsSchema>;
export type CancelAcademyUpgradeArgs = z.infer<typeof CancelAcademyUpgradeArgsSchema>;
export type FinishAcademyUpgradeNowArgs = z.infer<typeof FinishAcademyUpgradeNowArgsSchema>;
