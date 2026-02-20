import { z } from "zod";

const ResourceLootSchema = z.object({
  r1: z.number().int().nonnegative().default(0),
  r2: z.number().int().nonnegative().default(0),
  r3: z.number().int().nonnegative().default(0),
  r4: z.number().int().nonnegative().default(0),
});

const ReplayParticipantSchema = z.object({
  userId: z.number().int().nonnegative(),
  username: z.string().min(1),
  baseId: z.string().min(1),
  level: z.number().int().positive(),
  power: z.number().int().positive(),
  hpMax: z.number().int().positive(),
  targetType: z.enum(["player", "wild"]).optional(),
});

export const CombatStartRequestSchema = z.object({
  targetBaseId: z.string().min(1),
  durationSec: z.number().int().min(6).max(300).optional(),
  tickMs: z.number().int().min(100).max(1500).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const CombatStartResponseSchema = z.object({
  replayId: z.string().min(1),
  streamPath: z.string().min(1),
  startedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  tickMs: z.number().int().positive(),
  totalTicks: z.number().int().positive(),
  estimatedDurationMs: z.number().int().positive(),
});

export const CombatReplayReadyPayloadSchema = z.object({
  replayId: z.string().min(1),
  serverTime: z.number().int().positive(),
  schemaVersion: z.literal(1),
  tickMs: z.number().int().positive(),
  totalTicks: z.number().int().positive(),
});

export const CombatReplaySnapshotPayloadSchema = z.object({
  replayId: z.string().min(1),
  seed: z.number().int().positive(),
  startedAt: z.number().int().positive(),
  attacker: ReplayParticipantSchema,
  defender: ReplayParticipantSchema.extend({
    targetType: z.enum(["player", "wild"]),
  }),
});

export const CombatReplayFramePayloadSchema = z.object({
  tick: z.number().int().positive(),
  serverTime: z.number().int().positive(),
  attackerHp: z.number().int().nonnegative(),
  defenderHp: z.number().int().nonnegative(),
  attackerDamage: z.number().int().nonnegative(),
  defenderDamage: z.number().int().nonnegative(),
  attackerCrit: z.boolean(),
  defenderCrit: z.boolean(),
});

export const CombatReplayResultPayloadSchema = z.object({
  winner: z.enum(["attacker", "defender", "draw"]),
  endedAt: z.number().int().positive(),
  durationTicks: z.number().int().positive(),
  loot: ResourceLootSchema,
});

export type CombatStartRequest = z.infer<typeof CombatStartRequestSchema>;
export type CombatStartResponse = z.infer<typeof CombatStartResponseSchema>;
export type CombatReplayReadyPayload = z.infer<typeof CombatReplayReadyPayloadSchema>;
export type CombatReplaySnapshotPayload = z.infer<typeof CombatReplaySnapshotPayloadSchema>;
export type CombatReplayFramePayload = z.infer<typeof CombatReplayFramePayloadSchema>;
export type CombatReplayResultPayload = z.infer<typeof CombatReplayResultPayloadSchema>;

export type CombatReplayEvent =
  | { type: "ready"; payload: CombatReplayReadyPayload }
  | { type: "snapshot"; payload: CombatReplaySnapshotPayload }
  | { type: "frame"; payload: CombatReplayFramePayload }
  | { type: "result"; payload: CombatReplayResultPayload };

