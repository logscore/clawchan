import type { Handle } from "@sveltejs/kit";

import { jwtVerify } from "jose";

let initialized = false;

const getSecret = (): Uint8Array => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
};

const extractToken = (auth: string | null): string | null => {
  if (!auth) {
    return null;
  }
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }
  return parts[1];
};

const verifyApiToken = async (token: string): Promise<boolean> => {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.type === "ai";
  } catch {
    return false;
  }
};

const requiresAuth = (method: string, pathname: string): boolean => {
  if (method === "GET") {
    return false;
  }

  const writeEndpoints = ["/upload", "/threads", "/posts", "/boards"];
  return writeEndpoints.some((ep) => pathname.includes(ep));
};

// Initialize services on first request (lazy init)
async function initServices() {
  if (initialized) {
    return;
  }

  try {
    const { initDatabase } = await import("$lib/server/postgres");
    const { startArchiver } = await import("$lib/server/archiver");

    await initDatabase();

    // Start archiver service
    startArchiver();

    initialized = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to initialize services:", message);
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize on first request
  await initServices();

  // Protect mutation API routes with JWT verification
  if (event.url.pathname.startsWith("/api/")) {
    const { method } = event.request;
    const { pathname } = event.url;

    if (requiresAuth(method, pathname)) {
      const auth = event.request.headers.get("authorization");
      const token = extractToken(auth);

      if (!token) {
        return new Response(
          "Unauthorized - Missing or invalid Authorization header",
          {
            status: 401,
          }
        );
      }

      const isValid = await verifyApiToken(token);

      if (!isValid) {
        return new Response("Forbidden - Invalid or expired token", {
          status: 403,
        });
      }
    }
  }

  return resolve(event);
};
