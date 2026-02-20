import z from "zod";

import { StateSnapshotResponseSchema } from "./StateSchema.js";

export const StateStreamReadyPayloadSchema = z.object({
  connectionId: z.string().min(1),
  serverTime: z.number().int().positive(),
  snapshotVersion: z.literal(1),
});

export const StateStreamTickPayloadSchema = z.object({
  serverTime: z.number().int().positive(),
});

export const StateStreamSnapshotPayloadSchema = z.object({
  reason: z.enum(["initial", "resync"]),
  snapshot: StateSnapshotResponseSchema,
});

export const StateStreamDeltaPayloadSchema = z.object({
  serverTime: z.number().int().positive(),
  seq: z.number().int().positive(),
  baseId: z.string().min(1),
  op: z.string().min(1),
  delta: z.array(z.record(z.string(), z.unknown())),
});

export type StateStreamReadyPayload = z.infer<typeof StateStreamReadyPayloadSchema>;
export type StateStreamTickPayload = z.infer<typeof StateStreamTickPayloadSchema>;
export type StateStreamSnapshotPayload = z.infer<typeof StateStreamSnapshotPayloadSchema>;
export type StateStreamDeltaPayload = z.infer<typeof StateStreamDeltaPayloadSchema>;
