export {
  InitResponseSchema,
  GetNewMapResponseSchema,
  type InitResponse,
  type GetNewMapResponse,
} from "../contracts/compat";

// Base Load / Save are huge; we start with "unknown" and tighten per feature.
export type BaseLoadResponse = unknown;
export type BaseSaveResponse = unknown;
