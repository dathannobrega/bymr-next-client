import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const tasks = [
  {
    from: path.join(root, "server/public/assets/yardbg"),
    to: path.join(root, "public/assets/yardbg"),
    recursive: true,
  },
  {
    from: path.join(root, "server/public/assets/buildings/yardplanner/top.1.png"),
    to: path.join(root, "public/assets/buildings/yardplanner/top.1.png"),
    recursive: false,
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

