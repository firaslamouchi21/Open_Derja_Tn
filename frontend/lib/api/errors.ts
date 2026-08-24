export const API_ERROR_CODES = [
  "NotFound",
  "Conflict",
  "NotPermitted",
  "InsufficientTrust",
  "InvalidTransition",
  "RuleViolated",
  "ValidationError",
  "Unauthenticated",
  "RateLimited",
  "Unknown",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly path?: string;

  constructor(params: {
    code: ApiErrorCode;
    statusCode: number;
    message: string;
    path?: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.path = params.path;
  }
}

function isKnownCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (API_ERROR_CODES as readonly string[]).includes(value);
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const code = isKnownCode(record.code) ? record.code : "Unknown";
  const message = typeof record.message === "string" ? record.message : response.statusText;
  const path = typeof record.path === "string" ? record.path : undefined;

  return new ApiError({ code, statusCode: response.status, message, path });
}
