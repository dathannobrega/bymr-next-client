export type LegacyBuildingCategory =
  | "resource"
  | "storage"
  | "defense"
  | "wall"
  | "trap"
  | "hatchery"
  | "utility"
  | "special";

export type PlacementTypeCatalogEntry = {
  code: number;
  canonicalType: string;
  label: string;
  category: LegacyBuildingCategory;
  legacyClass: string;
};

type CatalogSeed = {
  code: number;
  label: string;
  category: LegacyBuildingCategory;
  legacyClass: string;
  canonicalType?: string;
  aliases?: string[];
};

const LEGACY_BUILDING_CATALOG_SEED: CatalogSeed[] = [
  {
    code: 14,
    canonicalType: "hq",
    label: "Town Hall (HQ)",
    category: "storage",
    legacyClass: "BSTORAGE",
    aliases: ["th", "townhall", "town-hall", "town_hall", "headquarters"],
  },
  { code: 1, label: "Resource Collector I", category: "resource", legacyClass: "BRESOURCE" },
  { code: 2, label: "Resource Collector II", category: "resource", legacyClass: "BRESOURCE" },
  { code: 3, label: "Resource Collector III", category: "resource", legacyClass: "BRESOURCE" },
  { code: 4, label: "Resource Collector IV", category: "resource", legacyClass: "BRESOURCE" },
  { code: 5, label: "Building 5", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 6, label: "Storage 6", category: "storage", legacyClass: "BSTORAGE" },
  { code: 7, label: "Mushroom", category: "special", legacyClass: "BMUSHROOM" },
  { code: 8, label: "Building 8", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 9, label: "Building 9", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 10, label: "Building 10", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 11, label: "Building 11", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 12, label: "Building 12", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 13, label: "Hatchery 13", category: "hatchery", legacyClass: "HatcheryBase" },
  { code: 15, label: "Building 15", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 16, label: "Hatchery 16", category: "hatchery", legacyClass: "HatcheryBase" },
  { code: 17, label: "Wall 17", category: "wall", legacyClass: "BWALL" },
  { code: 18, label: "Wall 18", category: "wall", legacyClass: "BWALL" },
  { code: 19, label: "Building 19", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 20, label: "Tower 20", category: "defense", legacyClass: "BTOWER" },
  { code: 21, label: "Tower 21", category: "defense", legacyClass: "BTOWER" },
  { code: 22, label: "Bunker", category: "defense", legacyClass: "Bunker", aliases: ["bunker"] },
  { code: 23, label: "Tower 23", category: "defense", legacyClass: "BTOWER" },
  { code: 24, label: "Trap 24", category: "trap", legacyClass: "BTRAP" },
  { code: 25, label: "Tower 25", category: "defense", legacyClass: "BTOWER" },
  { code: 26, label: "Building 26", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 27, label: "Building 27", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 51, label: "Building 51", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 52, label: "Expirable 52", category: "special", legacyClass: "BEXPIRABLE" },
  { code: 112, label: "Storage 112", category: "storage", legacyClass: "BSTORAGE" },
  { code: 113, label: "Building 113", category: "utility", legacyClass: "BFOUNDATION" },
  { code: 115, label: "Tower 115", category: "defense", legacyClass: "BTOWER" },
  { code: 117, label: "Heavy Trap 117", category: "trap", legacyClass: "BHEAVYTRAP" },
  { code: 118, label: "Tower 118", category: "defense", legacyClass: "BTOWER" },
];

const LEGACY_BUILDING_CATALOG: PlacementTypeCatalogEntry[] = LEGACY_BUILDING_CATALOG_SEED
  .map((entry) => ({
    ...entry,
    canonicalType: entry.canonicalType ?? `building-${entry.code}`,
  }))
  .sort((a, b) => a.code - b.code);

const LEGACY_SUPPORTED_BUILDING_CODES = new Set<number>(
  LEGACY_BUILDING_CATALOG.map((entry) => entry.code)
);

const BUILDING_ALIAS_TO_CODE = buildAliasToCodeMap(LEGACY_BUILDING_CATALOG_SEED);
const CODE_TO_BUILDING_ALIAS: Record<number, string> = Object.fromEntries(
  LEGACY_BUILDING_CATALOG.map((entry) => [entry.code, entry.canonicalType])
);

export type NormalizedPlacementType = {
  code: number;
  canonicalType: string;
};

export function normalizePlacementBuildingTypeInput(
  rawInput: string
): NormalizedPlacementType | null {
  const input = rawInput.trim().toLowerCase();
  if (!input) return null;

  const aliasCode = BUILDING_ALIAS_TO_CODE[input];
  if (aliasCode && isSupportedBuildingCode(aliasCode)) {
    return {
      code: aliasCode,
      canonicalType: canonicalBuildingTypeFromCode(aliasCode),
    };
  }

  const prefixed = input.match(/^building-(\d+)$/);
  if (prefixed) {
    const code = parseIntSafe(prefixed[1], -1);
    if (isSupportedBuildingCode(code)) {
      return {
        code,
        canonicalType: canonicalBuildingTypeFromCode(code),
      };
    }
    return null;
  }

  const compactPrefixed = input.match(/^building(\d+)$/);
  if (compactPrefixed) {
    const code = parseIntSafe(compactPrefixed[1], -1);
    if (isSupportedBuildingCode(code)) {
      return {
        code,
        canonicalType: canonicalBuildingTypeFromCode(code),
      };
    }
    return null;
  }

  if (/^\d+$/.test(input)) {
    const code = parseIntSafe(input, -1);
    if (isSupportedBuildingCode(code)) {
      return {
        code,
        canonicalType: canonicalBuildingTypeFromCode(code),
      };
    }
  }

  return null;
}

export function coerceBuildingTypeFromRecord(
  rawType: unknown,
  rawCode: unknown
): string {
  if (typeof rawType === "string") {
    const normalized = normalizePlacementBuildingTypeInput(rawType);
    if (normalized) return normalized.canonicalType;
    const fallback = rawType.trim();
    if (fallback.length > 0) return fallback;
  }

  const code = parseCode(rawCode);
  if (code !== null && isSupportedBuildingCode(code)) {
    return canonicalBuildingTypeFromCode(code);
  }

  return "unknown";
}

export function getPlacementTypeExamples(): string[] {
  return ["hq", "building-1", "building-6", "building-22", "building-118"];
}

export function listPlacementTypeCatalogEntries(): PlacementTypeCatalogEntry[] {
  return LEGACY_BUILDING_CATALOG;
}

export function describePlacementType(input: string | number): PlacementTypeCatalogEntry | null {
  const normalized =
    typeof input === "number"
      ? isSupportedBuildingCode(Math.trunc(input))
        ? { code: Math.trunc(input), canonicalType: canonicalBuildingTypeFromCode(Math.trunc(input)) }
        : null
      : normalizePlacementBuildingTypeInput(String(input));

  if (!normalized) return null;
  return LEGACY_BUILDING_CATALOG.find((entry) => entry.code === normalized.code) ?? null;
}

function canonicalBuildingTypeFromCode(code: number): string {
  return CODE_TO_BUILDING_ALIAS[code] ?? `building-${code}`;
}

function isSupportedBuildingCode(code: number): boolean {
  return LEGACY_SUPPORTED_BUILDING_CODES.has(code);
}

function parseCode(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return parseIntSafe(value.trim(), -1);
  }

  return null;
}

function parseIntSafe(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildAliasToCodeMap(seed: CatalogSeed[]): Record<string, number> {
  const out: Record<string, number> = {};

  for (const entry of seed) {
    const canonical = (entry.canonicalType ?? `building-${entry.code}`).toLowerCase();
    const aliases = new Set<string>([
      canonical,
      `building-${entry.code}`,
      `building${entry.code}`,
      String(entry.code),
      entry.legacyClass.toLowerCase(),
      ...(entry.aliases ?? []).map((value) => value.toLowerCase()),
    ]);

    for (const alias of aliases) {
      const normalized = alias.trim();
      if (!normalized) continue;
      if (!(normalized in out)) {
        out[normalized] = entry.code;
      }
    }
  }

  return out;
}
