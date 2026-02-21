import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const serverAssetsRoot = path.join(root, "server/public");
const clientAssetsRoot = path.join(root, "public");
const buildingTextureMapPath = path.join(root, "assets/building-texture-map.json");
const buildingThumbnailMapPath = path.join(root, "assets/building-thumbnail-map.json");
const legacyUiMapPath = path.join(root, "assets/legacy-ui-map.json");

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

function asMapPath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid map path in ${legacyUiMapPath}: ${String(value)}`);
  }
  return value.replaceAll("\\", "/");
}
