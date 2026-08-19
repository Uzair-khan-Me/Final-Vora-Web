import { publicError } from "./errors";

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return Response.json(data, { ...init, headers });
}

export function errorResponse(error: unknown) {
  const result = publicError(error);
  return json(result.body, { status: result.status });
}
