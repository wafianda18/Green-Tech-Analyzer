import {
  fetchWithTimeout,
  methodNotAllowed,
  parseUpstreamPayload,
  readJSONBody,
  sendJSON,
  upstreamErrorMessage,
} from "./_shared.js";

const DEFAULT_BASE = "https://openrouter.ai/api/v1";
// OpenRouter model slugs are lowercase; the Hugging Face style casing
// ("Qwen/Qwen3.5-35B-A3B") is rejected as an unknown model here.
const DEFAULT_MODEL = "qwen/qwen3.5-35b-a3b";

export default async function handler(req, res) {
  if (methodNotAllowed(req, res)) return;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJSON(res, 500, {
        error: "OPENAI_API_KEY belum diset di environment",
      });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE).replace(
      /\/+$/,
      "",
    );
    const endpoint = `${baseUrl}/chat/completions`;
    const model = process.env.LLM_MODEL || DEFAULT_MODEL;

    let body;
    try {
      body = await readJSONBody(req);
    } catch {
      return sendJSON(res, 400, { error: "Body request bukan JSON yang valid" });
    }

    const {
      messages = [],
      max_tokens,
      temperature,
      top_p,
      presence_penalty,
      top_k,
      extra_body = {},
    } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return sendJSON(res, 400, { error: "Field 'messages' wajib diisi" });
    }

    const payload = {
      model,
      messages,
      ...(max_tokens != null ? { max_tokens } : {}),
      ...(temperature != null ? { temperature } : {}),
      ...(top_p != null ? { top_p } : {}),
      ...(presence_penalty != null ? { presence_penalty } : {}),
      ...(top_k != null ? { top_k } : {}),
      ...extra_body,
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (process.env.OPENROUTER_REFERRER) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_REFERRER;
    }
    if (process.env.OPENROUTER_TITLE) {
      headers["X-Title"] = process.env.OPENROUTER_TITLE;
    }

    const resp = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = parseUpstreamPayload(await resp.text());

    if (!resp.ok) {
      return sendJSON(res, resp.status, {
        error: upstreamErrorMessage(data, "Gagal memanggil penyedia LLM"),
        status: resp.status,
      });
    }

    return sendJSON(res, 200, data);
  } catch (err) {
    return sendJSON(res, 500, { error: err?.message || String(err) });
  }
}
