import z from "zod";

const DurationSecondsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 90;
  if (typeof value === "number") return Math.trunc(value);
  const parsed = Number.parseInt(String(value), 10);
  return parsed;
}, z.number().int().min(6).max(300));

const TickMsSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return 500;
  if (typeof value === "number") return Math.trunc(value);
  const parsed = Number.parseInt(String(value), 10);
  return parsed;
}, z.number().int().min(100).max(1500));

const PositiveIntSchema = z.number().int().nonnegative();

const ResourceLootSchema = z.object({
  r1: PositiveIntSchema.default(0),
  r2: PositiveIntSchema.default(0),
  r3: PositiveIntSchema.default(0),
  r4: PositiveIntSchema.default(0),
});

const ReplayTargetTypeSchema = z.enum(["player", "wild"]);

export const CombatStartRequestSchema = z.object({
  targetBaseId: z.string().min(1),
  durationSec: DurationSecondsSchema,
  tickMs: TickMsSchema,
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const CombatReplayParticipantSchema = z.object({
  userId: PositiveIntSchema,
  username: z.string().min(1),
  baseId: z.string().min(1),
  level: z.number().int().positive(),
  power: z.number().int().positive(),
  hpMax: z.number().int().positive(),
  targetType: ReplayTargetTypeSchema.optional(),
});

export const CombatReplayFrameSchema = z.object({
  tick: z.number().int().positive(),
  serverTime: z.number().int().positive(),
  attackerHp: PositiveIntSchema,
  defenderHp: PositiveIntSchema,
  attackerDamage: PositiveIntSchema,
  defenderDamage: PositiveIntSchema,
  attackerCrit: z.boolean(),
  defenderCrit: z.boolean(),
});

export const CombatReplayResultSchema = z.object({
  winner: z.enum(["attacker", "defender", "draw"]),
  endedAt: z.number().int().positive(),
  durationTicks: z.number().int().positive(),
  loot: ResourceLootSchema,
});

export const CombatReplaySessionSchema = z.object({
  schemaVersion: z.literal(1),
  replayId: z.string().min(1),
  userId: PositiveIntSchema,
  targetBaseId: z.string().min(1),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  tickMs: z.number().int().positive(),
  totalTicks: z.number().int().positive(),
  seed: z.number().int().positive(),
  attacker: CombatReplayParticipantSchema,
  defender: CombatReplayParticipantSchema.extend({
    targetType: ReplayTargetTypeSchema,
  }),
  frames: z.array(CombatReplayFrameSchema).min(1),
  result: CombatReplayResultSchema,
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
  attacker: CombatReplayParticipantSchema,
  defender: CombatReplayParticipantSchema.extend({
    targetType: ReplayTargetTypeSchema,
  }),
});

export type CombatStartRequest = z.infer<typeof CombatStartRequestSchema>;
export type CombatStartResponse = z.infer<typeof CombatStartResponseSchema>;
export type CombatReplaySession = z.infer<typeof CombatReplaySessionSchema>;
export type CombatReplayFrame = z.infer<typeof CombatReplayFrameSchema>;
export type CombatReplayResult = z.infer<typeof CombatReplayResultSchema>;
export type CombatReplayReadyPayload = z.infer<typeof CombatReplayReadyPayloadSchema>;
export type CombatReplaySnapshotPayload = z.infer<typeof CombatReplaySnapshotPayloadSchema>;
