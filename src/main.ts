import "./style.css";
import { GameApp } from "./game/GameApp";
import { loadClientConfig } from "./lib/config";
import { installGlobalErrorModal, showGlobalError } from "./lib/ui/globalErrorModal";

installGlobalErrorModal();

async function main() {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Missing #game-canvas");

  const config = await loadClientConfig();
  const app = new GameApp({ canvas, config });

  await app.start();
}

main().catch((err) => {
  console.error(err);
  showGlobalError(err, {
    title: "Falha na inicialização",
    fatal: true,
  });
});
