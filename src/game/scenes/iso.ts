export const TILE_W = 96;
export const TILE_H = 48;

export function worldToScreen(tx: number, ty: number): { x: number; y: number } {
  const x = roundDeterministic((tx - ty) * (TILE_W / 2), 2);
  const y = roundDeterministic((tx + ty) * (TILE_H / 2), 2);
  return { x, y };
}

export function roundDeterministic(value: number, precision: number): number {
  const p = 10 ** precision;
  return Math.round(value * p) / p;
}
