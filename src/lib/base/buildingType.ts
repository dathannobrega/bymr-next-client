const LEGACY_SUPPORTED_BUILDING_CODES = new Set<number>([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 51, 52, 112, 113, 115, 117, 118,
]);

const BUILDING_ALIAS_TO_CODE: Record<string, number> = {
  hq: 14,
  th: 14,
  townhall: 14,
  "town-hall": 14,
  town_hall: 14,
};

const CODE_TO_BUILDING_ALIAS: Record<number, string> = {
  14: "hq",
};

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
