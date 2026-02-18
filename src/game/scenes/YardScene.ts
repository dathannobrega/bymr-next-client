import { Container, Graphics, Text } from "pixi.js";

export class YardScene {
  constructor(private readonly deps: { root: Container }) {}

  async run(): Promise<void> {
    const { root } = this.deps;

    const title = new Text({ text: "Yard (placeholder renderer)", style: { fill: 0xffffff } as any });
    title.position.set(12, 80);
    root.addChild(title);

    // Render a simple grid to represent the yard.
    const g = new Graphics();
    g.position.set(12, 120);

    const cell = 24;
    const cols = 20;
    const rows = 14;

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

    root.addChild(g);
  }
}
