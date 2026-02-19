import { z } from "zod";

export const CmdOperationSchema = z.enum([
  "PlaceBuilding",
  "MoveBuilding",
  "UpgradeBuilding",
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
});

export const CmdArgsByOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("PlaceBuilding"), args: PlaceBuildingArgsSchema }),
  z.object({ op: z.literal("MoveBuilding"), args: MoveBuildingArgsSchema }),
  z.object({ op: z.literal("UpgradeBuilding"), args: UpgradeBuildingArgsSchema }),
]);

export const CmdEnvelopeSchema = z.object({
  op: CmdOperationSchema,
  args: z.record(z.string(), z.unknown()),
  seq: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8),
});

export const CmdResponseSchema = z.object({
  ok: z.boolean(),
  seq: z.number().int().nonnegative().optional(),
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
