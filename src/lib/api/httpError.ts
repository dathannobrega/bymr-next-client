import {
  ClientSafeErrorEnvelopeSchema,
  StructuredHttpErrorSchema,
} from "../contracts/http";

export type HttpMethod = "GET" | "POST";

export type ParsedHttpErrorPayload = {
  error: string;
  code?: string;
  traceId?: string;
  issue?: string;
};

export type ClientHttpErrorInput = {
  status: number;
  statusText: string;
  method: HttpMethod;
  path: string;
  payload: unknown;
};

export class ClientHttpError extends Error {
  readonly name = "ClientHttpError";
  readonly status: number;
  readonly statusText: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly code?: string;
  readonly traceId?: string;
  readonly issue?: string;
  readonly payload: unknown;

  constructor(input: ClientHttpErrorInput) {
    const fallback = `HTTP ${input.status} ${input.statusText}`;
    const parsed = parseHttpErrorPayload(input.payload);
    super(formatHttpErrorMessage(parsed, input.method, input.path, fallback));

    this.status = input.status;
    this.statusText = input.statusText;
    this.method = input.method;
    this.path = input.path;
    this.code = parsed?.code;
    this.traceId = parsed?.traceId;
    this.issue = parsed?.issue;
    this.payload = input.payload;
  }
}

export function parseHttpErrorPayload(data: unknown): ParsedHttpErrorPayload | null {
  const clientSafe = ClientSafeErrorEnvelopeSchema.safeParse(data);
  if (clientSafe.success && clientSafe.data.errorDetails) {
    const envelope = clientSafe.data;
    const code = envelope.errorDetails?.data?.code ?? envelope.errorDetails?.code;
    const traceId = envelope.errorDetails?.traceId;
    const issueCandidate = envelope.errorDetails?.data?.issues?.[0];
    const issue =
      issueCandidate && issueCandidate !== envelope.error
        ? issueCandidate
        : undefined;

    return {
      error: envelope.error,
      ...(code ? { code } : {}),
      ...(traceId ? { traceId } : {}),
      ...(issue ? { issue } : {}),
    };
  }

  const structured = StructuredHttpErrorSchema.safeParse(data);
  if (structured.success) {
    return {
      error: structured.data.error,
      ...(structured.data.code ? { code: structured.data.code } : {}),
      ...(structured.data.traceId ? { traceId: structured.data.traceId } : {}),
    };
  }

  const rawError = asRecord(data)?.error;
  if (typeof rawError === "string" && rawError.trim().length > 0) {
    return { error: rawError };
  }

  return null;
}

function formatHttpErrorMessage(
  parsed: ParsedHttpErrorPayload | null,
  method: HttpMethod,
  path: string,
  fallback: string
): string {
  if (!parsed) {
    return `${fallback} (${method} ${path})`;
  }

  const suffix = [
    parsed.code ? `code=${parsed.code}` : null,
    parsed.traceId ? `traceId=${parsed.traceId}` : null,
    parsed.issue ? `issue=${parsed.issue}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return `${parsed.error}${suffix ? ` (${suffix})` : ""} (${method} ${path})`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}
