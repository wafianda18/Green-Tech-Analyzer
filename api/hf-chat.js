import {
  fetchWithTimeout,
  methodNotAllowed,
  parseUpstreamPayload,
  readJSONBody,
  sendJSON,
  upstreamErrorMessage,
} from "./_shared.js";

// Hugging Face repo id keeps its original casing.
const DEFAULT_MODEL = "Qwen/Qwen3.5-35B-A3B";
const BASE = "https://api-inference.huggingface.co/models";

/** Role-tagged prompt that works well for instruction-tuned chat models. */
function messagesToPrompt(messages) {
  const lines = [];
  for (const m of messages) {
    lines.push(`[${String(m.role || "user").toUpperCase()}]`);
    lines.push(m.content || "");
  }
  lines.push("[ASSISTANT]");
  return lines.join("\n");
}

export default async function handler(req, res) {
  if (methodNotAllowed(req, res)) return;

  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return sendJSON(res, 500, {
        error: "HUGGINGFACE_API_KEY belum diset di environment",
      });
    }

    let body;
    try {
      body = await readJSONBody(req);
    } catch {
      return sendJSON(res, 400, { error: "Body request bukan JSON yang valid" });
    }

    // The client sends generation settings as `options`; `params` is still
    // accepted so either shape works.
    const { messages, prompt, params = {}, options = {} } = body || {};
    const settings = { ...params, ...options };

    const hasContent =
      Array.isArray(messages) &&
      messages.some((m) => String(m?.content || "").trim());
    const textPrompt = prompt ?? (hasContent ? messagesToPrompt(messages) : "");
    if (!textPrompt.trim()) {
      return sendJSON(res, 400, {
        error: "Field 'messages' atau 'prompt' wajib diisi",
      });
    }

    const model = process.env.HF_MODEL || DEFAULT_MODEL;
    const endpoint = `${BASE}/${model.split("/").map(encodeURIComponent).join("/")}`;

    const payload = {
      inputs: textPrompt,
      parameters: {
        max_new_tokens: settings.max_tokens ?? 800,
        temperature: settings.temperature ?? 0.7,
        top_p: settings.top_p ?? 0.9,
        ...(settings.top_k != null ? { top_k: settings.top_k } : {}),
        return_full_text: false,
      },
      options: { wait_for_model: true },
    };

    const resp = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = parseUpstreamPayload(await resp.text());

    if (!resp.ok) {
      return sendJSON(res, resp.status, {
        error: upstreamErrorMessage(
          data,
          "Gagal memanggil Hugging Face Inference API",
        ),
        status: resp.status,
      });
    }

    const generated =
      (Array.isArray(data) ? data[0]?.generated_text : data?.generated_text) ||
      "";

    if (!generated) {
      return sendJSON(res, 502, {
        error: "Penyedia AI tidak mengembalikan teks",
      });
    }

    return sendJSON(res, 200, { generated_text: generated });
  } catch (err) {
    return sendJSON(res, 500, { error: err?.message || String(err) });
  }
}
