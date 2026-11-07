// Same-origin by default: requests go to this site's /api, which next.config.ts forwards to Django.
const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const BASE_URL = RAW_BASE.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  /** The parsed JSON error body, if there was one (Django field errors live here). */
  data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** The visitor gate registers this so any 401 from the API signs the visitor out. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function messageFromBody(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return `Request failed (${status})`;
}

interface RequestOptions {
  signal?: AbortSignal;
  /** Lets the request finish even if the page is closing or reloading. */
  keepalive?: boolean;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // The browser attaches the HttpOnly sign-in cookie by itself; this code never sees the token.
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
      keepalive: options.keepalive,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    );
  }

  if (response.status === 401) unauthorizedHandler?.();

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    throw new ApiError(
      messageFromBody(data, response.status),
      response.status,
      data,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Helpers for the Django API.
 * `path` must start with "/" and keep Django's trailing slash, e.g. "/games/".
 */
export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>("GET", path, undefined, { signal });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>("POST", path, body ?? {}, { signal });
}

export function apiPut<T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PUT", path, body, options);
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PATCH", path, body, options);
}

export function apiDelete<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("DELETE", path, undefined, options);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
