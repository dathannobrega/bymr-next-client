import { createHash } from "node:crypto";

import type { Save } from "../../models/save.model.js";
import type { User } from "../../models/user.model.js";
import {
  type CombatReplayFrame,
  type CombatReplayResult,
  type CombatReplaySession,
} from "../../zod/CombatReplaySchema.js";
import { parseIntSafe, toResourceSummary } from "../state/normalizeState.js";
import { getCurrentDateTime } from "../../utils/getCurrentDateTime.js";

const REPLAY_TTL_SECONDS = 60 * 15;

type TargetType = "player" | "wild";

type BuildReplaySessionInput = {
  replayId: string;
  attackerUser: User;
  attackerSave: Save;
  defenderSave: Save;
  targetType: TargetType;
  durationSec: number;
  tickMs: number;
};

export function buildCombatReplaySession(
  input: BuildReplaySessionInput
): CombatReplaySession {
  const createdAt = getCurrentDateTime();
  const expiresAt = createdAt + REPLAY_TTL_SECONDS;
  const totalTicks = Math.max(1, Math.trunc((input.durationSec * 1000) / input.tickMs));
  const seed = buildDeterministicSeed(input.attackerUser.userid, input.replayId, input.defenderSave.baseid);
  const rng = createDeterministicRng(seed);

  const attackerLevel = Math.max(1, parseIntSafe(input.attackerSave.level, 1));
  const attackerBaseValue = Math.max(0, parseIntSafe(input.attackerSave.basevalue, 0));
  const attackerPower = deriveCombatPower(attackerLevel, attackerBaseValue);
  const attackerHpMax = 2500 + attackerPower * 14;

  const defenderLevel = Math.max(1, parseIntSafe(input.defenderSave.level, 1));
  const defenderBaseValue = Math.max(0, parseIntSafe(input.defenderSave.basevalue, 0));
  const defenderPower = deriveCombatPower(defenderLevel, defenderBaseValue);
  const defenderHpMax = 2600 + defenderPower * 16;

  const frames: CombatReplayFrame[] = [];
  let attackerHp = attackerHpMax;
  let defenderHp = defenderHpMax;

  for (let tick = 1; tick <= totalTicks; tick += 1) {
    const attackerCrit = rng() < 0.12;
    const defenderCrit = rng() < 0.1;

    const attackerVariance = 0.8 + rng() * 0.5;
    const defenderVariance = 0.78 + rng() * 0.52;

    const attackerDamage = Math.max(
      0,
      Math.round((attackerPower * 1.8 + 40) * attackerVariance * (attackerCrit ? 1.55 : 1))
    );
    const defenderDamage = Math.max(
      0,
      Math.round((defenderPower * 1.7 + 35) * defenderVariance * (defenderCrit ? 1.5 : 1))
    );

    defenderHp = Math.max(0, defenderHp - attackerDamage);
    attackerHp = Math.max(0, attackerHp - defenderDamage);

    frames.push({
      tick,
      serverTime: createdAt + Math.max(1, Math.trunc((tick * input.tickMs) / 1000)),
      attackerHp,
      defenderHp,
      attackerDamage,
      defenderDamage,
      attackerCrit,
      defenderCrit,
    });

    if (attackerHp === 0 || defenderHp === 0) {
      break;
    }
  }

  const result = buildCombatResult(frames, createdAt, input.tickMs, input.defenderSave, rng);

  return {
    schemaVersion: 1,
    replayId: input.replayId,
    userId: input.attackerUser.userid,
    targetBaseId: input.defenderSave.baseid,
    createdAt,
    expiresAt,
    tickMs: input.tickMs,
    totalTicks: frames.length,
    seed,
    attacker: {
      userId: input.attackerUser.userid,
      username: input.attackerUser.username,
      baseId: String(input.attackerSave.baseid),
      level: attackerLevel,
      power: attackerPower,
      hpMax: attackerHpMax,
    },
    defender: {
      userId: Math.max(0, parseIntSafe(input.defenderSave.saveuserid ?? input.defenderSave.userid, 0)),
      username: input.defenderSave.name || "Wild Monsters",
      baseId: String(input.defenderSave.baseid),
      level: defenderLevel,
      power: defenderPower,
      hpMax: defenderHpMax,
      targetType: input.targetType,
    },
    frames,
    result,
  };
}

function buildCombatResult(
  frames: CombatReplayFrame[],
  createdAt: number,
  tickMs: number,
  defenderSave: Save,
  rng: () => number
): CombatReplayResult {
  const lastFrame = frames.at(-1);
  if (!lastFrame) {
    return {
      winner: "draw",
      endedAt: createdAt,
      durationTicks: 1,
      loot: { r1: 0, r2: 0, r3: 0, r4: 0 },
    };
  }

  const winner = resolveWinner(lastFrame);
  const endedAt = createdAt + Math.max(1, Math.trunc((lastFrame.tick * tickMs) / 1000));
  const loot = winner === "attacker" ? deriveLoot(defenderSave, rng) : { r1: 0, r2: 0, r3: 0, r4: 0 };

  return {
    winner,
    endedAt,
    durationTicks: lastFrame.tick,
    loot,
  };
}

function resolveWinner(frame: CombatReplayFrame): "attacker" | "defender" | "draw" {
  if (frame.defenderHp === 0 && frame.attackerHp > 0) return "attacker";
  if (frame.attackerHp === 0 && frame.defenderHp > 0) return "defender";
  if (frame.attackerHp === 0 && frame.defenderHp === 0) return "draw";
  if (frame.attackerHp > frame.defenderHp) return "attacker";
  if (frame.defenderHp > frame.attackerHp) return "defender";
  return "draw";
}

function deriveLoot(defenderSave: Save, rng: () => number) {
  const resources = toResourceSummary(defenderSave.resources);
  const factor = 0.18 + rng() * 0.12;

  return {
    r1: Math.max(0, Math.min(resources.r1, Math.trunc(resources.r1 * factor))),
    r2: Math.max(0, Math.min(resources.r2, Math.trunc(resources.r2 * factor))),
    r3: Math.max(0, Math.min(resources.r3, Math.trunc(resources.r3 * factor))),
    r4: Math.max(0, Math.min(resources.r4, Math.trunc(resources.r4 * factor))),
  };
}

function deriveCombatPower(level: number, baseValue: number): number {
  const levelWeight = level * 12;
  const baseWeight = Math.log10(baseValue + 10) * 18;
  return Math.max(1, Math.round(levelWeight + baseWeight));
}

function buildDeterministicSeed(userId: number, replayId: string, targetBaseId: string): number {
  const raw = `${userId}:${replayId}:${targetBaseId}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const seedHex = hash.slice(0, 8);
  const parsed = Number.parseInt(seedHex, 16);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function createDeterministicRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

