import { z } from "zod";

export const CmdOperationSchema = z.enum([
  "PlaceBuilding",
  "MoveBuilding",
  "UpgradeBuilding",
  "CancelUpgrade",
  "CollectHarvester",
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
