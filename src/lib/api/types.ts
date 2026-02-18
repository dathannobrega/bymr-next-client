import { z } from "zod";

/**
 * These are the *compatibility* shapes with the current BYMR server.
 * For the new "command-based" protocol, see docs/03-security-server-authoritative.md.
 */

export const InitResponseSchema = z.object({
  debugMode: z.boolean().optional(),
  versionMismatch: z.boolean().optional(),
  error: z.string().optional(),
});
export type InitResponse = z.infer<typeof InitResponseSchema>;

export const GetNewMapResponseSchema = z.object({
  newmap: z.boolean(),
  mapheaderurl: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.array(z.any()).optional(),
});
export type GetNewMapResponse = z.infer<typeof GetNewMapResponseSchema>;

// Base Load / Save are huge; we start with "unknown" and tighten per feature.
export type BaseLoadResponse = unknown;
export type BaseSaveResponse = unknown;
