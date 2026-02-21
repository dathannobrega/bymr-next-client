import { z } from "zod";

export const StoreCatalogItemSchema = z.object({
  t: z.string(),
  d: z.string(),
  du: z.number().int().nonnegative(),
  c: z.array(z.number().int().nonnegative()).min(1),
  i: z.number().int().nonnegative(),
  a: z.number().int().nonnegative(),
});

export const StoreInventoryEntrySchema = z.object({
  q: z.coerce.number().int().nonnegative(),
  e: z.coerce.number().int().nonnegative().optional(),
}).passthrough();

export const StoreCatalogResponseSchema = z.object({
  error: z.number().int().nonnegative().optional(),
  serverTime: z.number().int().nonnegative(),
  credits: z.number().int().nonnegative(),
  items: z.record(z.string(), StoreCatalogItemSchema),
  storeData: z.record(z.string(), StoreInventoryEntrySchema).default({}),
});

export type StoreCatalogItem = z.infer<typeof StoreCatalogItemSchema>;
export type StoreInventoryEntry = z.infer<typeof StoreInventoryEntrySchema>;
export type StoreCatalogResponse = z.infer<typeof StoreCatalogResponseSchema>;
