const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

export interface BackendResult<T> {
  ok: boolean;
  status: number;
  body: T;
}

/** Calls the NestJS backend API, optionally forwarding a bearer token. */
export async function backendFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<BackendResult<T>> {
  const response = await fetch(`${BACKEND_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const body = (await response.json()) as T;

  return { ok: response.ok, status: response.status, body };
}
