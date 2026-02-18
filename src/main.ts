import "./style.css";
import { GameApp } from "./game/GameApp";
import { loadClientConfig } from "./lib/config";

async function main() {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Missing #game-canvas");

  const config = await loadClientConfig();
  const app = new GameApp({ canvas, config });

  await app.start();
}

main().catch((err) => {
  console.error(err);
  const el = document.createElement("pre");
  el.style.color = "white";
  el.textContent = String(err?.stack || err);
  document.body.appendChild(el);
});
