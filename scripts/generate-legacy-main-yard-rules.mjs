import fs from "node:fs";

const [, , sourcePath, targetPath] = process.argv;

if (!sourcePath || !targetPath) {
  console.error("Usage: node scripts/generate-legacy-main-yard-rules.mjs <source.as> <target.ts>");
  process.exit(1);
}

const SUPPORTED_CODES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 51, 52, 112, 113, 115, 117, 118,
];
const SUPPORTED_CODE_SET = new Set(SUPPORTED_CODES);

const source = fs.readFileSync(sourcePath, "utf8");
const sourceLabel = sourcePath.replaceAll("\\", "/");
const marker = "public static const _yardProps:Array = [";
const markerIndex = source.indexOf(marker);
if (markerIndex < 0) {
  throw new Error("Could not locate _yardProps array in source file.");
}

const contentStart = markerIndex + marker.length;
let cursor = contentStart;
let depth = 1;

while (cursor < source.length && depth > 0) {
  const ch = source[cursor];
  if (ch === "[") {
    depth += 1;
  } else if (ch === "]") {
    depth -= 1;
  }
  cursor += 1;
}

if (depth !== 0) {
  throw new Error("Unbalanced brackets while extracting _yardProps array.");
}

const arrayExpression = `[${source.slice(contentStart, cursor - 1)}]`;

const normalizedExpression = arrayExpression
  .replace(/new\s+SecNum\(([^()]*)\)/g, "($1)")
  .replace(/new\s+Rectangle\([^()]*\)/g, "null")
  .replace(/new\s+Point\([^()]*\)/g, "null")
  .replace(/\bINFERNOQUAKETOWER\.UNDERHALL_ID\b/g, "-1000")
  .replace(/\bSiegeLab\.ID\b/g, "-1001")
  .replace(/"cls":([A-Za-z_][A-Za-z0-9_\.]*)/g, '"cls":"$1"');

const UNKNOWN = new Proxy(
  function unknownProxy() {
    return UNKNOWN;
  },
  {
    apply: () => UNKNOWN,
    construct: () => UNKNOWN,
    get: (_target, prop) => (prop === Symbol.unscopables ? undefined : UNKNOWN),
    has: () => true,
  }
);

const sandbox = new Proxy(
  {
    SecNum: (value) => Number(value),
    Rectangle: () => null,
    Point: () => null,
    INFERNOQUAKETOWER: { UNDERHALL_ID: -1000 },
    SiegeLab: { ID: -1001 },
    SiegeFactory: UNKNOWN,
    BUILDING14: { k_TYPE: 14 },
  },
  {
    has: () => true,
    get: (target, prop) => {
      if (prop === Symbol.unscopables) {
        return undefined;
      }
      return prop in target ? target[prop] : UNKNOWN;
    },
  }
);

let yardProps = null;

try {
  yardProps = Function("sandbox", `with (sandbox) { return ${normalizedExpression}; }`)(sandbox);
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  throw new Error(`Failed to evaluate YARD_PROPS expression: ${message}`);
}

if (!Array.isArray(yardProps)) {
  throw new Error("Parsed YARD_PROPS value is not an array.");
}

const byCode = {};

for (const raw of yardProps) {
  const code = toInt(raw?.id, -1);
  if (!SUPPORTED_CODE_SET.has(code)) {
    continue;
  }

  const quantityByTownHall = toIntArray(raw?.quantity);
  const costs = Array.isArray(raw?.costs)
    ? raw.costs.map((entry) => parseCost(entry)).filter((entry) => entry !== null)
    : [];

  byCode[code] = {
    code,
    yardType: "main",
    category: typeof raw?.type === "string" ? raw.type : "unknown",
    quantityByTownHall: quantityByTownHall.length > 0 ? quantityByTownHall : [0],
    costs,
    ...(typeof toBoolean(raw?.can_fortify) === "boolean"
      ? { canFortify: toBoolean(raw?.can_fortify) }
      : {}),
    ...(Array.isArray(raw?.fortify_costs)
      ? {
          fortifyCosts: raw.fortify_costs
            .map((entry) => parseCost(entry))
            .filter((entry) => entry !== null),
        }
      : {}),
    ...(toIntArray(raw?.hp).length > 0 ? { hpByLevel: toIntArray(raw?.hp) } : {}),
    ...(toIntArray(raw?.capacity).length > 0 ? { capacityByLevel: toIntArray(raw?.capacity) } : {}),
    ...(toIntArray(raw?.produce).length > 0 ? { produceByLevel: toIntArray(raw?.produce) } : {}),
    ...(toIntArray(raw?.cycleTime).length > 0 ? { cycleTimeByLevel: toIntArray(raw?.cycleTime) } : {}),
    ...(toIntArray(raw?.repairTime).length > 0 ? { repairTimeByLevel: toIntArray(raw?.repairTime) } : {}),
  };
}

for (const code of SUPPORTED_CODES) {
  if (!Object.prototype.hasOwnProperty.call(byCode, String(code))) {
    byCode[code] = {
      code,
      yardType: "main",
      category: "unknown",
      quantityByTownHall: [0],
      costs: [],
    };
  }
}

const output = `/*
 * Auto-generated from legacy YARD_PROPS.as.
 * Source: ${sourceLabel}
 * Generator: scripts/generate-legacy-main-yard-rules.mjs
 */

export type LegacyBuildRequirement = {
  typeCode: number;
  count: number;
  minLevel: number;
};

export type LegacyBuildCost = {
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  time: number;
  requirements: LegacyBuildRequirement[];
};

export type LegacyMainYardRule = {
  code: number;
  yardType: "main";
  category: string;
  quantityByTownHall: number[];
  costs: LegacyBuildCost[];
  canFortify?: boolean;
  fortifyCosts?: LegacyBuildCost[];
  hpByLevel?: number[];
  capacityByLevel?: number[];
  produceByLevel?: number[];
  cycleTimeByLevel?: number[];
  repairTimeByLevel?: number[];
};

export const legacyMainYardBuildingRules: Record<number, LegacyMainYardRule> = ${JSON.stringify(
  byCode,
  null,
  2
)};
`;

fs.writeFileSync(targetPath, output, "utf8");

function parseCost(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const requirements = Array.isArray(raw.re)
    ? raw.re.map((entry) => parseRequirement(entry)).filter((entry) => entry !== null)
    : [];

  return {
    r1: toInt(raw.r1, 0),
    r2: toInt(raw.r2, 0),
    r3: toInt(raw.r3, 0),
    r4: toInt(raw.r4, 0),
    time: toInt(raw.time, 0),
    requirements,
  };
}

function parseRequirement(raw) {
  if (!Array.isArray(raw) || raw.length < 3) {
    return null;
  }

  const typeCode = toInt(raw[0], -1);
  const count = toInt(raw[1], 0);
  const minLevel = toInt(raw[2], 0);

  if (typeCode <= 0 || count <= 0 || minLevel <= 0) {
    return null;
  }

  return {
    typeCode,
    count,
    minLevel,
  };
}

function toIntArray(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const out = [];
  for (const entry of raw) {
    const parsed = toInt(entry, Number.NaN);
    if (Number.isFinite(parsed)) {
      out.push(parsed);
    }
  }
  return out;
}

function toInt(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const parsed = Number.parseFloat(trimmed);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
  }
  return fallback;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return Math.trunc(value) !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return undefined;
}
