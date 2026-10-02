import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getUser, type SessionUser } from "@/server/auth";

/** An error a route handler can throw to produce a specific HTTP response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "unauthorized", "Sign in to continue.");
export const notFound = (what = "Resource") => new ApiError(404, "not_found", `${what} not found.`);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route ids are UUIDs. Anything else is a 404, not a database error. */
export function requireUuid(value: string, what = "Resource") {
  if (!UUID.test(value)) throw notFound(what);
  return value;
}

/** Parse and validate a JSON body. Throws a 400 with field errors on failure. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, "validation_failed", "Some fields are invalid.", result.error.flatten().fieldErrors);
  }
  return result.data;
}

type Handler<Ctx> = (args: { request: Request; user: SessionUser; context: Ctx }) => Promise<Response | unknown>;

/**
 * Wraps a route handler: verifies the session, then turns thrown ApiErrors
 * (and anything unexpected) into JSON responses. Every API route uses this,
 * so no route can forget to authenticate.
 */
export function withUser<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (request: Request, context: Ctx): Promise<Response> => {
    try {
      const user = await getUser();
      if (!user) throw unauthorized();
      const result = await handler({ request, user, context });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message, details: error.details } },
          { status: error.status }
        );
      }
      console.error(JSON.stringify({ level: "error", where: "api", message: String(error) }));
      return NextResponse.json(
        { error: { code: "internal_error", message: "Something went wrong." } },
        { status: 500 }
      );
    }
  };
}
