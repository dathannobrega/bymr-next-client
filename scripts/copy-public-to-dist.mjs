import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

if (!fs.existsSync(publicDir)) {
  console.warn("[copy-public-to-dist] public dir not found, skipping");
  process.exit(0);
}

fs.mkdirSync(distDir, { recursive: true });
fs.cpSync(publicDir, distDir, { recursive: true, force: true });

console.log("[copy-public-to-dist] copied public/ into dist/");
