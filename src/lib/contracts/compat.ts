import { z } from "zod";

export const InitRequestSchema = z.object({
  apiVersion: z.string().min(1),
  runtime: z.enum(["web", "desktop"]).optional(),
  platform: z.enum(["windows", "macos", "linux", "unknown"]).optional(),
  clientBuild: z.string().min(1).optional(),
});

export const InitResponseSchema = z.object({
  debugMode: z.boolean().optional(),
  requiredClientBuild: z.string().min(1).optional(),
  downloadUrl: z.string().url().optional(),
  versionMismatch: z.boolean().optional(),
  error: z.string().optional(),
});

export const LoginRequestSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    token: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.token || (value.email && value.password)), {
    message: "Login requires token or email+password",
  });

export const LoginResponseSchema = z.object({
  error: z.union([z.number(), z.string()]).optional(),
  token: z.string().min(1),
  userId: z.union([z.number(), z.string()]).optional(),
});

const GetNewMapV3Schema = z.object({
  newmap: z.literal(true),
  mapheaderurl: z.string(),
  width: z.number(),
  height: z.number(),
  data: z.array(z.any()),
});

const GetNewMapLegacySchema = z.object({
  newmap: z.literal(false),
  mapheaderurl: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.array(z.any()).optional(),
});

export const GetNewMapResponseSchema = z.union([
  GetNewMapV3Schema,
  GetNewMapLegacySchema,
]);

export type InitRequest = z.infer<typeof InitRequestSchema>;
export type InitResponse = z.infer<typeof InitResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type GetNewMapResponse = z.infer<typeof GetNewMapResponseSchema>;
