import { z } from "zod";

const ResourceBagSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .default({});

const WorldmapLegacyErrorSchema = z.union([z.literal(0), z.literal(1), z.number(), z.string()]);

export const WorldmapV3CellSchema = z.object({
  n: z.string().default("Unknown"),
  uid: z.number().int().nonnegative(),
  bid: z.string().min(1),
  tid: z.number().int().nonnegative().default(0),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  aid: z.number().int().nonnegative().default(0),
  l: z.number().int().nonnegative().default(1),
  pl: z.number().int().nonnegative().default(0),
  r: ResourceBagSchema,
  dm: z.number().int().nonnegative().default(0),
  rel: z.number().int().nonnegative().default(0),
  lo: z.number().int().nonnegative().default(0),
  fr: z.number().int().nonnegative().default(0),
  p: z.number().int().nonnegative().default(0),
  d: z.number().int().nonnegative().default(0),
  t: z.number().int().default(0),
  fbid: z.string().default(""),
  b: z.number().int().default(0),
  i: z.number().int().default(0),
  m: z.unknown().optional(),
});

export const WorldmapBookmarkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  x: z.number().int().min(0).max(799),
  y: z.number().int().min(0).max(799),
  bid: z.string().min(1).optional(),
  worldId: z.string().min(1).optional(),
  createdAt: z.string().optional(),
});

export const WorldmapV3InitResponseSchema = z.object({
  error: WorldmapLegacyErrorSchema.optional().default(0),
  celldata: z.array(WorldmapV3CellSchema),
  bookmarks: z.unknown().optional(),
});

export const WorldmapV3GetCellsRequestSchema = z.object({
  x: z.number().int().min(0).max(799),
  y: z.number().int().min(0).max(799),
  width: z.number().int().min(1).max(50),
  height: z.number().int().min(1).max(50),
});

export const WorldmapV3GetCellsResponseSchema = z.object({
  error: WorldmapLegacyErrorSchema.optional().default(0),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  celldata: z.array(WorldmapV3CellSchema),
});

export const WorldmapV3RelocateResponseSchema = z.object({
  error: WorldmapLegacyErrorSchema.optional().default(0),
  mapheaderurl: z.string().optional(),
  coords: z.tuple([z.number().int(), z.number().int()]),
});

export const WorldmapActionResponseSchema = z.object({
  error: WorldmapLegacyErrorSchema.optional().default(0),
});

export const WorldmapV2TakeoverCellRequestSchema = z
  .object({
    baseId: z.string().min(1),
    shiny: z.number().int().positive().optional(),
    resources: z.record(z.string(), z.number().int().nonnegative()).optional(),
  })
  .refine((value) => value.shiny !== undefined || value.resources !== undefined, {
    message: "Takeover requires shiny or resources",
  });

const TransferMonsterStateSchema = z.unknown();

export const WorldmapV2TransferAssetsRequestSchema = z
  .object({
    fromBaseId: z.string().min(1),
    toBaseId: z.string().min(1),
    fromMonsters: z.array(TransferMonsterStateSchema),
    toMonsters: z.array(TransferMonsterStateSchema),
  })
  .refine((value) => value.fromBaseId !== value.toBaseId, {
    message: "Transfer requires distinct source/target bases",
  });

export const WorldmapSaveBookmarksRequestSchema = z.object({
  bookmarks: z.array(WorldmapBookmarkSchema).max(200),
});

export type WorldmapV3Cell = z.infer<typeof WorldmapV3CellSchema>;
export type WorldmapBookmark = z.infer<typeof WorldmapBookmarkSchema>;
export type WorldmapV3InitResponse = z.infer<typeof WorldmapV3InitResponseSchema>;
export type WorldmapV3GetCellsRequest = z.infer<typeof WorldmapV3GetCellsRequestSchema>;
export type WorldmapV3GetCellsResponse = z.infer<typeof WorldmapV3GetCellsResponseSchema>;
export type WorldmapV3RelocateResponse = z.infer<typeof WorldmapV3RelocateResponseSchema>;
export type WorldmapActionResponse = z.infer<typeof WorldmapActionResponseSchema>;
export type WorldmapV2TakeoverCellRequest = z.infer<typeof WorldmapV2TakeoverCellRequestSchema>;
export type WorldmapV2TransferAssetsRequest = z.infer<typeof WorldmapV2TransferAssetsRequestSchema>;
export type WorldmapSaveBookmarksRequest = z.infer<typeof WorldmapSaveBookmarksRequestSchema>;
