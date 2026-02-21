import z from "zod";

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

export const PlaceBuildingArgsSchema = z.object({
  buildingType: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
});

export const MoveBuildingArgsSchema = z.object({
  buildingId: z.string().min(1),
  toX: z.number().int().nonnegative(),
  toY: z.number().int().nonnegative(),
});

export const UpgradeBuildingArgsSchema = z.object({
  buildingId: z.string().min(1),
  targetLevel: z.number().int().positive().optional(),
  deferSeconds: z.number().int().positive().max(60 * 60 * 24 * 7).optional(),
});

export const CancelUpgradeArgsSchema = z.object({
  buildingId: z.string().min(1),
});

export const CollectHarvesterArgsSchema = z.object({
  buildingId: z.string().min(1),
  amount: z.number().int().positive().optional(),
});

export const PurchaseStoreItemArgsSchema = z.object({
  item: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((value) => value.toUpperCase()),
  quantity: z.number().int().positive().max(999).default(1),
});

export const ApplyYardPlannerTemplateArgsSchema = z.object({
  slotId: z.number().int().positive().max(64),
});

export const StartRepairBuildingArgsSchema = z.object({
  buildingId: z.string().min(1),
});

export const StartRepairAllBuildingsArgsSchema = z.object({});

export const StartAcademyUpgradeArgsSchema = z.object({
  monsterId: z
    .string()
    .trim()
    .regex(/^(?:C|IC)\d{1,3}$/i)
    .transform((value) => value.toUpperCase()),
});

export const CancelAcademyUpgradeArgsSchema = z.object({
  monsterId: z
    .string()
    .trim()
    .regex(/^(?:C|IC)\d{1,3}$/i)
    .transform((value) => value.toUpperCase()),
});

export const FinishAcademyUpgradeNowArgsSchema = z.object({
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
  idempotencyKey: z.string().min(8).max(128),
  clientTime: z.number().int().optional(),
  nonce: z.string().min(1).max(128).optional(),
  signature: z.string().min(1).max(2048).optional(),
});

export const CmdSuccessResponseSchema = z.object({
  ok: z.literal(true),
  seq: z.number().int().positive(),
  serverTime: z.number().int().positive(),
  delta: z.array(z.record(z.string(), z.unknown())),
});

export type CmdOperation = z.infer<typeof CmdOperationSchema>;
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
export type CmdEnvelope = z.infer<typeof CmdEnvelopeSchema>;
export type CmdArgsByOperation = z.infer<typeof CmdArgsByOperationSchema>;
export type CmdSuccessResponse = z.infer<typeof CmdSuccessResponseSchema>;
