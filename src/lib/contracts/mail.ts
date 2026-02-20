import { z } from "zod";

const PositiveIntFromUnknownSchema = z.preprocess((value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return value;
}, z.number().int().positive());

const NonNegativeIntFromUnknownSchema = z.preprocess((value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return value;
}, z.number().int().nonnegative());

const MessagePayloadSchema = z.object({
  messageid: z.string().min(1),
  threadid: PositiveIntFromUnknownSchema,
  updatetime: NonNegativeIntFromUnknownSchema.optional(),
  userid: PositiveIntFromUnknownSchema,
  targetid: PositiveIntFromUnknownSchema.optional(),
  messagetype: z.string().min(1),
  unread: NonNegativeIntFromUnknownSchema.optional(),
  message: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  messagecount: NonNegativeIntFromUnknownSchema.optional(),
  reportid: z.string().optional(),
  truceid: z.string().nullable().optional(),
  trucestate: z.string().nullable().optional(),
  migratestate: z.string().nullable().optional(),
  coords: z.array(z.number()).nullable().optional(),
  worldid: z.string().nullable().optional(),
  baseid: z.string().nullable().optional(),
}).passthrough();

const MessageMapSchema = z.record(z.string(), MessagePayloadSchema).default({});

const MailActionErrorSchema = z.union([z.number(), z.string()]);

export const MessageTargetSchema = z.object({
  friend: NonNegativeIntFromUnknownSchema.default(0),
  mapver: NonNegativeIntFromUnknownSchema.default(0),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  pic_square: z.string().optional(),
});

export const MessageTargetsResponseSchema = z.object({
  targets: z.record(z.string(), MessageTargetSchema).default({}),
});

export const MessageThreadsResponseSchema = z.object({
  error: MailActionErrorSchema.default(0),
  threads: MessageMapSchema,
});

export const MessageThreadResponseSchema = z.object({
  error: MailActionErrorSchema.default(0),
  thread: MessageMapSchema,
});

export const SendMessageRequestSchema = z.object({
  threadId: NonNegativeIntFromUnknownSchema.default(0),
  targetUserId: PositiveIntFromUnknownSchema,
  subject: z.string().trim().min(1).max(140),
  message: z.string().trim().min(1).max(580),
  type: z.string().trim().min(1).default("message"),
  targetBaseId: z.string().trim().min(1).default("0"),
  baseId: z.string().trim().min(1).optional(),
});

export const MessageActionResponseSchema = z.object({
  error: MailActionErrorSchema.default(0),
  messageid: z.union([z.string(), z.number()]).optional(),
  threadid: z.union([z.string(), z.number()]).optional(),
  message: z.string().optional(),
});

export const GetMessageThreadRequestSchema = z.object({
  threadId: PositiveIntFromUnknownSchema,
});

export const ReportMessageThreadRequestSchema = z.object({
  threadId: PositiveIntFromUnknownSchema,
  reason: z.string().trim().min(1).max(200).default("abuse"),
});

export type MessagePayload = z.infer<typeof MessagePayloadSchema>;
export type MessageTarget = z.infer<typeof MessageTargetSchema>;
export type MessageTargetsResponse = z.infer<typeof MessageTargetsResponseSchema>;
export type MessageThreadsResponse = z.infer<typeof MessageThreadsResponseSchema>;
export type MessageThreadResponse = z.infer<typeof MessageThreadResponseSchema>;
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type MessageActionResponse = z.infer<typeof MessageActionResponseSchema>;
export type GetMessageThreadRequest = z.infer<typeof GetMessageThreadRequestSchema>;
export type ReportMessageThreadRequest = z.infer<typeof ReportMessageThreadRequestSchema>;
