import type { ParsedBaseLoad, YardBuilding } from "../base/baseLoad";

type CmdDeltaItem = Record<string, unknown>;

export function applyCmdDeltaToBase(base: ParsedBaseLoad, delta: CmdDeltaItem[]): ParsedBaseLoad {
  const nextBuildings = [...base.buildings];
  let nextResources = base.resources;
  let nextCredits = base.credits;
  let nextStoreData = base.storeData ? { ...base.storeData } : undefined;
  let nextAcademy = base.academy;

  delta.forEach((item) => {
    const op = typeof item.op === "string" ? item.op : "";
    if (op === "addBuilding") {
      const created = parseBuilding(item);
      if (!created) return;
      const existingIndex = nextBuildings.findIndex((b) => b.id === created.id);
      if (existingIndex >= 0) {
        nextBuildings[existingIndex] = created;
      } else {
        nextBuildings.push(created);
      }
      return;
    }

    if (op === "moveBuilding") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const x = toNumber(item.x);
      const y = toNumber(item.y);
      const footprintW = toNumber(item.footprintW);
      const footprintH = toNumber(item.footprintH);
      if (!buildingId || x === null || y === null) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        x,
        y,
        ...(footprintW !== null ? { footprintW } : {}),
        ...(footprintH !== null ? { footprintH } : {}),
      };
      return;
    }

    if (op === "upgradeBuilding") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const level = toNumber(item.level);
      if (!buildingId || level === null) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        level,
        countdownUpgrade: undefined,
        upgradeToLevel: undefined,
      };
      return;
    }

    if (op === "startUpgrade") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const remainingSec = toNumber(item.remainingSec);
      const toLevel = toNumber(item.toLevel);
      if (!buildingId) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        ...(remainingSec !== null ? { countdownUpgrade: remainingSec } : {}),
        ...(toLevel !== null ? { upgradeToLevel: toLevel } : {}),
      };
      return;
    }

    if (op === "cancelUpgrade") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      if (!buildingId) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        countdownUpgrade: undefined,
        upgradeToLevel: undefined,
      };
      return;
    }

    if (op === "setBuildingRepairState") {
      const buildingId = typeof item.id === "string" ? item.id : null;
      const hp = toNumber(item.hp);
      const maxHp = toNumber(item.maxHp);
      const repairing = toBoolean(item.repairing);
      if (!buildingId) return;

      const index = nextBuildings.findIndex((b) => b.id === buildingId);
      if (index < 0) return;
      nextBuildings[index] = {
        ...nextBuildings[index],
        ...(hp !== null ? { hp } : {}),
        ...(maxHp !== null ? { maxHp } : {}),
        ...(repairing !== null ? { repairing } : {}),
      };
      return;
    }

    if (op === "setResources") {
      const bag = typeof item.bag === "string" ? item.bag : "resources";
      if (bag !== "resources") return;
      const resources = asRecord(item.resources);
      if (!resources) return;
      nextResources = {
        r1: toNumber(resources.r1) ?? 0,
        r2: toNumber(resources.r2) ?? 0,
        r3: toNumber(resources.r3) ?? 0,
        r4: toNumber(resources.r4) ?? 0,
        r1max: toNumber(resources.r1max) ?? 0,
        r2max: toNumber(resources.r2max) ?? 0,
        r3max: toNumber(resources.r3max) ?? 0,
        r4max: toNumber(resources.r4max) ?? 0,
      };
      return;
    }

    if (op === "setCredits") {
      const credits = toNumber(item.credits);
      if (credits === null || credits < 0) return;
      nextCredits = credits;
      return;
    }

    if (op === "setStoreItem") {
      const itemKey = typeof item.item === "string" ? item.item.trim().toUpperCase() : "";
      const q = toNumber(item.q);
      if (!itemKey || q === null || q < 0) return;

      const e = toNumber(item.e);
      const existing = nextStoreData ? { ...nextStoreData } : {};
      existing[itemKey] = {
        q,
        ...(e !== null && e >= 0 ? { e } : {}),
      };
      nextStoreData = existing;
      return;
    }

    if (op === "setAcademyState") {
      const academy = asRecord(item.academy);
      if (!academy) return;
      nextAcademy = parseAcademyStateDelta(academy);
    }
  });

  return {
    ...base,
    buildings: nextBuildings,
    resources: nextResources,
    credits: nextCredits,
    storeData: nextStoreData,
    academy: nextAcademy,
  };
}

function parseBuilding(raw: CmdDeltaItem): YardBuilding | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const type = typeof raw.type === "string" ? raw.type : null;
  const x = toNumber(raw.x);
  const y = toNumber(raw.y);

  if (!id || !type || x === null || y === null) return null;

  const level = toNumber(raw.level);
  const footprintW = toNumber(raw.footprintW);
  const footprintH = toNumber(raw.footprintH);
  const countdownUpgrade = toNumber(raw.countdownUpgrade ?? raw.cU);
  const upgradeToLevel = toNumber(raw.upgradeToLevel);
  const hp = toNumber(raw.hp);
  const maxHp = toNumber(raw.maxHp ?? raw.maxHealth);
  const repairing = toBoolean(raw.repairing ?? raw.rE);
  return {
    id,
    type,
    x,
    y,
    ...(level !== null ? { level } : {}),
    ...(footprintW !== null ? { footprintW } : {}),
    ...(footprintH !== null ? { footprintH } : {}),
    ...(countdownUpgrade !== null ? { countdownUpgrade } : {}),
    ...(upgradeToLevel !== null ? { upgradeToLevel } : {}),
    ...(hp !== null ? { hp } : {}),
    ...(maxHp !== null ? { maxHp } : {}),
    ...(repairing !== null ? { repairing } : {}),
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value) > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
    if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseAcademyStateDelta(raw: Record<string, unknown>): ParsedBaseLoad["academy"] {
  const monstersRaw = asRecord(raw.monsters) ?? {};
  const monsters: NonNullable<ParsedBaseLoad["academy"]>["monsters"] = {};

  for (const [rawMonsterId, rawMonsterEntry] of Object.entries(monstersRaw)) {
    const entry = asRecord(rawMonsterEntry);
    if (!entry) continue;

    const monsterId = rawMonsterId.trim().toUpperCase();
    if (!monsterId) continue;
    const level = toNumber(entry.level);
    const maxLevel = toNumber(entry.maxLevel);
    if (level === null || maxLevel === null) continue;
    const nextTrainingCostR3 = toNumber(entry.nextTrainingCostR3);
    const nextTrainingDurationSec = toNumber(entry.nextTrainingDurationSec);

    const trainingRaw = asRecord(entry.training);
    const startedAt = trainingRaw ? toNumber(trainingRaw.startedAt) : null;
    const durationSec = trainingRaw ? toNumber(trainingRaw.durationSec) : null;
    const completesAt = trainingRaw ? toNumber(trainingRaw.completesAt) : null;
    const remainingSec = trainingRaw ? toNumber(trainingRaw.remainingSec) : null;
    const targetLevel = trainingRaw ? toNumber(trainingRaw.targetLevel) : null;

    monsters[monsterId] = {
      level,
      maxLevel,
      inLocker: Boolean(entry.inLocker),
      canTrain: Boolean(entry.canTrain),
      ...(nextTrainingCostR3 !== null ? { nextTrainingCostR3 } : {}),
      ...(nextTrainingDurationSec !== null ? { nextTrainingDurationSec } : {}),
      ...(startedAt !== null &&
      durationSec !== null &&
      completesAt !== null &&
      remainingSec !== null &&
      targetLevel !== null
        ? {
            training: {
              startedAt,
              durationSec,
              completesAt,
              remainingSec,
              targetLevel,
            },
          }
        : {}),
    };
  }

  const buildingIdRaw = raw.buildingId;
  const activeMonsterIdRaw = raw.activeMonsterId;
  return {
    buildingId:
      typeof buildingIdRaw === "string" && buildingIdRaw.trim().length > 0
        ? buildingIdRaw
        : null,
    buildingLevel: Math.max(0, toNumber(raw.buildingLevel) ?? 0),
    busy: Boolean(raw.busy),
    activeMonsterId:
      typeof activeMonsterIdRaw === "string" && activeMonsterIdRaw.trim().length > 0
        ? activeMonsterIdRaw.toUpperCase()
        : null,
    monsters,
  };
}
