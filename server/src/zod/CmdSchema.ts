import z from "zod";

export const CmdOperationSchema = z.enum([
  "PlaceBuilding",
  "MoveBuilding",
  "UpgradeBuilding",
  "CancelUpgrade",
  "CollectHarvester",
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

export const CmdArgsByOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("PlaceBuilding"), args: PlaceBuildingArgsSchema }),
  z.object({ op: z.literal("MoveBuilding"), args: MoveBuildingArgsSchema }),
  z.object({ op: z.literal("UpgradeBuilding"), args: UpgradeBuildingArgsSchema }),
  z.object({ op: z.literal("CancelUpgrade"), args: CancelUpgradeArgsSchema }),
  z.object({ op: z.literal("CollectHarvester"), args: CollectHarvesterArgsSchema }),
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
export type CmdEnvelope = z.infer<typeof CmdEnvelopeSchema>;
export type CmdArgsByOperation = z.infer<typeof CmdArgsByOperationSchema>;
export type CmdSuccessResponse = z.infer<typeof CmdSuccessResponseSchema>;
