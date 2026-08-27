/**
 * Helpers shared by the serverless routes.
 *
 * Files in api/ that start with "_" are not exposed as routes.
 *
 * Everything here works both on the Vercel Node runtime (where res has the
 * express-style .status()/.json() sugar) and behind a plain Node http server,
 * which is what the Vite dev middleware uses.
 */

export const UPSTREAM_TIMEOUT_MS = 60_000;

export function sendJSON(res, status, payload) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(payload);
  }
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
  return res;
}

export async function readJSONBody(req) {
  if (req.body !== undefined && req.body !== null) {
    // Vercel may have parsed the body already.
    if (typeof req.body === "string") {
      return req.body ? JSON.parse(req.body) : {};
    }
    if (typeof req.body === "object") return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function methodNotAllowed(req, res) {
  if (req.method === "POST") return false;
  res.setHeader("Allow", "POST");
  sendJSON(res, 405, { error: "Method Not Allowed" });
  return true;
}

/** fetch() with a timeout so a stalled provider cannot hang the function. */
export async function fetchWithTimeout(url, init, timeoutMs = UPSTREAM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`Permintaan ke penyedia AI melewati batas waktu ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function parseUpstreamPayload(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/** Provider errors arrive in several shapes; reduce them to a single string. */
export function upstreamErrorMessage(data, fallback) {
  const error = data?.error ?? data?.message;
  if (typeof error === "string") return error;
  if (error && typeof error.message === "string") return error.message;
  return fallback;
}
