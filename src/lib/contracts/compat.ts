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
  protocol: z
    .object({
      canonicalStateRequired: z.boolean().optional(),
      legacyBaseLoadFallbackAllowed: z.boolean().optional(),
      stateStreamRequired: z.boolean().optional(),
    })
    .optional(),
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

const RegisterPasswordSchema = z.string().trim()
  .min(8)
  .regex(new RegExp(".*[A-Z].*"))
  .regex(new RegExp(".*[`~<>?,./!@#$%^&*()\\-_+=\"'|{}\\[\\];:\\\\].*"));

export const RegisterRequestSchema = z.object({
  username: z.string().trim().min(2).max(12),
  email: z.string().email(),
  password: RegisterPasswordSchema,
});

export const RegisterResponseSchema = z.object({
  user: z.object({
    userid: z.union([z.number(), z.string()]),
    username: z.string().optional(),
    email: z.string().optional(),
  }),
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
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type GetNewMapResponse = z.infer<typeof GetNewMapResponseSchema>;
