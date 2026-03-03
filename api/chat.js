const DEFAULT_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "Qwen/Qwen3.5-35B-A3B";

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "OPENAI_API_KEY belum diset di environment" });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE).replace(
      /\/+$/,
      "",
    );
    const endpoint = `${baseUrl}/chat/completions`;
    const model = process.env.LLM_MODEL || DEFAULT_MODEL;

    const body = await parseJSON(req);
    const {
      messages = [],
      max_tokens,
      temperature,
      top_p,
      presence_penalty,
      top_k,
      extra_body = {},
    } = body || {};

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

    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: data?.error || data?.message || "Gagal memanggil penyedia LLM",
        status: resp.status,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

async function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = handler;
