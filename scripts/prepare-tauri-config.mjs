import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("src-tauri/tauri.conf.json");
const raw = fs.readFileSync(configPath, "utf8");
const config = JSON.parse(raw);

const env = (process.env.BYMR_ENV || process.env.NODE_ENV || "development").toLowerCase();
const presets = {
  development: ["'self'", "http://localhost:3001", "http://127.0.0.1:3001"],
  staging: ["'self'", "https://staging-api.bymr.com", "https://staging-cdn.bymr.com"],
  production: ["'self'", "https://api.bymr.com", "https://cdn.bymr.com"],
};

const fromEnv = process.env.BYMR_CONNECT_SRC
  ? process.env.BYMR_CONNECT_SRC.split(",").map((v) => v.trim()).filter(Boolean)
  : undefined;

const connectSrc = fromEnv && fromEnv.length ? fromEnv : (presets[env] ?? presets.development);
const connectSrcDirective = `connect-src ${connectSrc.join(" ")};`;

const baseCsp = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';";
config.app ??= {};
config.app.security ??= {};
config.app.security.csp = `${baseCsp} ${connectSrcDirective}`;

const targetPresets = {
  win32: ["msi", "nsis"],
  darwin: ["app", "dmg"],
  linux: ["appimage", "deb"],
};

const fromTargetsEnv = process.env.BYMR_TAURI_TARGETS
  ? process.env.BYMR_TAURI_TARGETS.split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  : undefined;

const platformTargets = fromTargetsEnv?.length
  ? fromTargetsEnv
  : (targetPresets[process.platform] ?? ["all"]);

config.bundle ??= {};
config.bundle.active = true;
config.bundle.targets = platformTargets;

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(
  `[prepare-tauri-config] env=${env} connect-src=${connectSrc.join(" ")} targets=${platformTargets.join(",")}`
);
