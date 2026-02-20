import { z } from "zod";

const NonNegativeIntFromUnknownSchema = z.preprocess((value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return value;
}, z.number().int().nonnegative());

const AttackLogDateSchema = z.union([z.string().min(1), z.number().int().nonnegative(), z.date()]);

export const SocialWorldSchema = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1).default("Unknown"),
  playerCount: NonNegativeIntFromUnknownSchema.default(0),
  createdAt: z.unknown().optional(),
  lastupdateAt: z.unknown().optional(),
});

export const SocialAvailableWorldsResponseSchema = z.object({
  worlds: z.array(SocialWorldSchema).default([]),
});

export const SocialLeaderboardEntrySchema = z.object({
  username: z.string().min(1),
  discord_tag: z.string().nullable().optional(),
  outpost_count: NonNegativeIntFromUnknownSchema,
});

export const SocialLeaderboardsResponseSchema = z.object({
  leaderboard: z.array(SocialLeaderboardEntrySchema).default([]),
});

export const AttackLogFilterSchema = z.enum(["both", "myattacks", "peopleattackingme"]);

export const SocialAttackLogEntrySchema = z.object({
  id: NonNegativeIntFromUnknownSchema,
  attacker_userid: NonNegativeIntFromUnknownSchema,
  attacker_username: z.string().min(1),
  attacker_pic_square: z.string().nullable().optional(),
  defender_userid: NonNegativeIntFromUnknownSchema,
  defender_username: z.string().min(1),
  defender_pic_square: z.string().nullable().optional(),
  type: z.string().min(1),
  x: z.number().int().optional().nullable(),
  y: z.number().int().optional().nullable(),
  loot: z.record(z.string(), z.unknown()).optional().nullable(),
  attackreport: z.record(z.string(), z.unknown()).optional().nullable(),
  attacktime: AttackLogDateSchema,
});

export const SocialAttackLogsResponseSchema = z.object({
  attackLogs: z.array(SocialAttackLogEntrySchema).default([]),
});

export type SocialWorld = z.infer<typeof SocialWorldSchema>;
export type SocialAvailableWorldsResponse = z.infer<typeof SocialAvailableWorldsResponseSchema>;
export type SocialLeaderboardEntry = z.infer<typeof SocialLeaderboardEntrySchema>;
export type SocialLeaderboardsResponse = z.infer<typeof SocialLeaderboardsResponseSchema>;
export type AttackLogFilter = z.infer<typeof AttackLogFilterSchema>;
export type SocialAttackLogEntry = z.infer<typeof SocialAttackLogEntrySchema>;
export type SocialAttackLogsResponse = z.infer<typeof SocialAttackLogsResponseSchema>;
