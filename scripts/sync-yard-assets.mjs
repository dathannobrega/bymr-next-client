import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverAssetsRoot = path.join(root, "server/public");
const clientAssetsRoot = path.join(root, "public");
const buildingTextureMapPath = path.join(root, "assets/building-texture-map.json");
const buildingThumbnailMapPath = path.join(root, "assets/building-thumbnail-map.json");
const legacyUiMapPath = path.join(root, "assets/legacy-ui-map.json");
const legacyImageSemanticMapPath = path.join(root, "assets/legacy-image-semantic-map.json");

if (!fs.existsSync(buildingTextureMapPath)) {
  throw new Error(`Missing asset map: ${buildingTextureMapPath}`);
}
if (!fs.existsSync(buildingThumbnailMapPath)) {
  throw new Error(`Missing asset map: ${buildingThumbnailMapPath}`);
}

const buildingTextureMapRaw = fs.readFileSync(buildingTextureMapPath, "utf8");
const buildingThumbnailMapRaw = fs.readFileSync(buildingThumbnailMapPath, "utf8");
const buildingTextureMap = JSON.parse(buildingTextureMapRaw);
const buildingThumbnailMap = JSON.parse(buildingThumbnailMapRaw);
const legacyUiMap = fs.existsSync(legacyUiMapPath)
  ? JSON.parse(fs.readFileSync(legacyUiMapPath, "utf8"))
  : null;
const legacyImageSemanticMap = fs.existsSync(legacyImageSemanticMapPath)
  ? JSON.parse(fs.readFileSync(legacyImageSemanticMapPath, "utf8"))
  : null;
const mappedBuildingAssetPaths = [
  ...collectMappedBuildingTexturePaths(buildingTextureMap),
  ...collectMappedBuildingThumbnailPaths(buildingThumbnailMap),
];
const mappedUniqueAssetPaths = [...new Set(mappedBuildingAssetPaths)];

const tasks = [
  {
    from: path.join(serverAssetsRoot, "assets/yardbg"),
    to: path.join(clientAssetsRoot, "assets/yardbg"),
    recursive: true,
  },
];

for (const task of tasks) {
  if (!fs.existsSync(task.from)) {
    throw new Error(`Missing source asset: ${task.from}`);
  }

  const destinationDir = task.recursive ? task.to : path.dirname(task.to);
  fs.mkdirSync(destinationDir, { recursive: true });

  if (task.recursive) {
    fs.cpSync(task.from, task.to, { recursive: true, force: true });
  } else {
    fs.copyFileSync(task.from, task.to);
  }

  console.log(`[sync-yard-assets] ${path.relative(root, task.from)} -> ${path.relative(root, task.to)}`);
}

for (const relativePath of mappedUniqueAssetPaths) {
  const from = path.join(serverAssetsRoot, relativePath);
  const to = path.join(clientAssetsRoot, relativePath);

  if (!fs.existsSync(from)) {
    throw new Error(`Missing source asset: ${from}`);
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log(`[sync-yard-assets] ${path.relative(root, from)} -> ${path.relative(root, to)}`);
}

syncLegacyImageSemanticMappings(legacyImageSemanticMap);
syncLegacyUiAssets(legacyUiMap);

function collectMappedBuildingThumbnailPaths(rawMap) {
  const unique = new Set();

  const defaultThumbnailPath = asRelativeAssetPath(rawMap.defaultThumbnailPath);
  unique.add(defaultThumbnailPath);

  if (
    rawMap.thumbnailByCanonicalType &&
    typeof rawMap.thumbnailByCanonicalType === "object"
  ) {
    for (const relativePath of Object.values(rawMap.thumbnailByCanonicalType)) {
      unique.add(asRelativeAssetPath(relativePath));
    }
  }

  return [...unique];
}

function collectMappedBuildingTexturePaths(rawMap) {
  const unique = new Set();

  const defaultTexturePath = asRelativeAssetPath(rawMap.defaultTexturePath);
  const fallbackTexturePath = asRelativeAssetPath(rawMap.fallbackTexturePath);
  unique.add(defaultTexturePath);
  unique.add(fallbackTexturePath);

  if (
    rawMap.buildingTexturesByCanonicalType &&
    typeof rawMap.buildingTexturesByCanonicalType === "object"
  ) {
    for (const relativePath of Object.values(rawMap.buildingTexturesByCanonicalType)) {
      unique.add(asRelativeAssetPath(relativePath));
    }
  }

  return [...unique];
}

function asRelativeAssetPath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid asset path in map: ${String(value)}`);
  }
  return value.replaceAll("\\", "/");
}

function syncLegacyUiAssets(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return;

  const sourceRootRaw = rawMap.legacySourceRoot;
  const targetRootRaw = rawMap.targetRoot;
  const filesRaw = rawMap.files;
  if (
    typeof sourceRootRaw !== "string" ||
    sourceRootRaw.trim().length === 0 ||
    typeof targetRootRaw !== "string" ||
    targetRootRaw.trim().length === 0 ||
    !Array.isArray(filesRaw)
  ) {
    throw new Error(`Invalid legacy UI asset map: ${legacyUiMapPath}`);
  }

  const sourceRoot = path.join(root, sourceRootRaw);
  const targetRoot = path.join(root, targetRootRaw);
  fs.mkdirSync(targetRoot, { recursive: true });

  for (const entry of filesRaw) {
    const fromRelative = asMapPath(entry?.from);
    const toRelative = asMapPath(entry?.to);

    const from = path.join(sourceRoot, fromRelative);
    const to = path.join(targetRoot, toRelative);

    if (!fs.existsSync(from)) {
      if (fs.existsSync(to)) {
        console.warn(
          `[sync-yard-assets] skip missing legacy source (already present): ${path.relative(
            root,
            from
          )}`
        );
        continue;
      }
      throw new Error(`Missing legacy UI source asset: ${from}`);
    }

    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`[sync-yard-assets] ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  }
}

function syncLegacyImageSemanticMappings(rawMap) {
  if (!rawMap || typeof rawMap !== "object") return;

  const sourceRootRaw = rawMap.legacySourceRoot;
  const mappingsRaw = rawMap.mappings;
  if (
    typeof sourceRootRaw !== "string" ||
    sourceRootRaw.trim().length === 0 ||
    !Array.isArray(mappingsRaw)
  ) {
    throw new Error(`Invalid legacy image semantic map: ${legacyImageSemanticMapPath}`);
  }

  const sourceRoot = path.join(root, sourceRootRaw);
  for (const entry of mappingsRaw) {
    const numericRelative = asMapPath(entry?.numeric, legacyImageSemanticMapPath);
    const semanticToken = asMapPath(entry?.semantic, legacyImageSemanticMapPath);
    const targetRelative = asMapPath(entry?.target, legacyImageSemanticMapPath);
    const sourceMode = entry?.source === "numeric" ? "numeric" : "semantic";

    const numericPath = path.join(sourceRoot, numericRelative);
    const targetPath = path.join(root, targetRelative);

    if (!fs.existsSync(numericPath)) {
      throw new Error(`Missing legacy numeric source asset: ${numericPath}`);
    }

    const numericHash = sha1File(numericPath);
    let mappedSourcePath = numericPath;

    if (sourceMode === "semantic") {
      const semanticPath = path.join(sourceRoot, semanticToken);
      if (!fs.existsSync(semanticPath)) {
        throw new Error(`Missing legacy semantic source asset: ${semanticPath}`);
      }
      const semanticHash = sha1File(semanticPath);
      if (numericHash !== semanticHash) {
        throw new Error(
          `Hash mismatch for numeric/semantic mapping: ${numericRelative} != ${semanticToken}`
        );
      }
      mappedSourcePath = semanticPath;
    } else {
      const expectedSha1 = normalizeOptionalSha1(entry?.expectedSha1);
      if (expectedSha1 && expectedSha1 !== numericHash) {
        throw new Error(
          `Hash mismatch for numeric alias mapping: ${numericRelative} expected ${expectedSha1} got ${numericHash}`
        );
      }
    }

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(mappedSourcePath, targetPath);
      console.log(
        `[sync-yard-assets] materialized mapped target ${path.relative(root, targetPath)} from ${path.relative(root, mappedSourcePath)}`
      );
    }

    console.log(
      `[sync-yard-assets] mapped legacy numeric ${numericRelative} -> ${semanticToken} (source=${sourceMode}, sha1=${numericHash})`
    );
  }
}

function sha1File(filePath) {
  return createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
}

function normalizeOptionalSha1(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(normalized) ? normalized : null;
}

function asMapPath(value, sourceMapPath = legacyUiMapPath) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid map path in ${sourceMapPath}: ${String(value)}`);
  }
  return value.replaceAll("\\", "/");
}
