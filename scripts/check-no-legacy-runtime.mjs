import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const listFiles = (cmd) =>
  execSync(cmd, { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const runtimeFiles = listFiles("rg --files src server/src public");
const clientFiles = listFiles("rg --files src");

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "");

const checks = [
  {
    name: "forbidden client(legacy) runtime import/reference",
    files: runtimeFiles.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
    match: (text) =>
      /from\s+["'][^"']*client\(legacy\)|import\(["'][^"']*client\(legacy\)|https?:\/\/[^\s"']*client\(legacy\)/.test(
        text
      ),
  },
  {
    name: "forbidden SWF runtime references",
    files: runtimeFiles,
    match: (text) => /\.swf\b/i.test(text),
  },
  {
    name: "forbidden insecure token storage",
    files: clientFiles.filter((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
    match: (text) => /\b(localStorage|sessionStorage)\b/.test(stripComments(text)),
  },
];

let failed = false;

for (const check of checks) {
  const hits = [];
  for (const file of check.files) {
    const text = readFileSync(file, "utf8");
    if (check.match(text)) hits.push(file);
  }

  if (hits.length > 0) {
    failed = true;
    console.error(`❌ ${check.name}`);
    for (const file of hits) console.error(`   - ${file}`);
  } else {
    console.log(`✅ ${check.name}`);
  }
}

if (failed) {
  console.error("\nLegacy runtime guard failed.");
  process.exit(1);
}

console.log("\nLegacy runtime guard passed.");
