import { Container, Graphics, Text } from "pixi.js";
import type { ParsedBaseLoad } from "../../lib/base/baseLoad";

export class YardScene {
  constructor(
    private readonly deps: {
      root: Container;
      base: ParsedBaseLoad;
    }
  ) {}

  async run(): Promise<void> {
    const { root, base } = this.deps;

    const title = new Text({ text: "Yard (baseLoad parser v1)", style: { fill: 0xffffff } as any });
    title.position.set(12, 80);
    root.addChild(title);

    const g = new Graphics();
    g.position.set(12, 120);

    const cell = 24;
    const cols = Math.max(1, base.yardWidth);
    const rows = Math.max(1, base.yardHeight);

    g.rect(0, 0, cols * cell, rows * cell);
    g.stroke({ width: 1, color: 0x445066 });

    for (let x = 0; x <= cols; x++) {
      g.moveTo(x * cell, 0);
      g.lineTo(x * cell, rows * cell);
    }
    for (let y = 0; y <= rows; y++) {
      g.moveTo(0, y * cell);
      g.lineTo(cols * cell, y * cell);
    }
    g.stroke({ width: 1, color: 0x223044 });

    for (const building of base.buildings) {
      g.rect(building.x * cell, building.y * cell, cell, cell);
      g.fill({ color: 0x7bc96f, alpha: 0.8 });
    }

    root.addChild(g);

    const footer = new Text({
      text: `Buildings parsed: ${base.buildings.length}`,
      style: { fill: 0x8fa5d6 } as any,
    });
    footer.position.set(12, 120 + rows * cell + 8);
    root.addChild(footer);
  }
}
