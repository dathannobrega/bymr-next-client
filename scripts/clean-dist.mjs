import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const trashRootDir = path.join(root, ".dist-trash");

async function rotateDist() {
  const trashDir = path.join(
    trashRootDir,
    `.dist-trash-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  await fs.mkdir(trashRootDir, { recursive: true });

  let rotated = false;
  try {
    await fs.rename(distDir, trashDir);
    rotated = true;
  } catch (error) {
    const maybeError = /** @type {{ code?: string }} */ (error);
    if (maybeError?.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(distDir, { recursive: true });
  if (rotated) {
    console.log(`[clean-dist] rotated previous dist to ${path.relative(root, trashDir)}`);
  }
}

await rotateDist();
console.log(`[clean-dist] prepared ${path.relative(root, distDir)}`);
