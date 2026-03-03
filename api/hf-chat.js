const MODEL = process.env.HF_MODEL || "Qwen/Qwen3.5-35B-A3B";
const BASE = "https://api-inference.huggingface.co/models";

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "HUGGINGFACE_API_KEY belum diset di environment" });
    }
    const body = await parseJSON(req);
    const { messages, prompt, params = {} } = body || {};

    const textPrompt = prompt ?? messagesToPrompt(messages || []);
    const endpoint = `${BASE}/${encodeURIComponent(MODEL)}`;

    const payload = {
      inputs: textPrompt,
      parameters: {
        max_new_tokens: params.max_tokens ?? 800,
        temperature: params.temperature ?? 0.7,
        top_p: params.top_p ?? 0.9,
      },
      options: {
        wait_for_model: true,
      },
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Non-JSON response", raw: text };
    }

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: data?.error || "Gagal memanggil Hugging Face Inference API",
        status: resp.status,
      });
    }

    const generated =
      Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : data?.generated_text || JSON.stringify(data);

    return res.status(200).json({ generated_text: generated });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}

function messagesToPrompt(messages) {
  // Simple role-tag format that works well for instruction-tuned chat LMs
  const lines = [];
  for (const m of messages) {
    const role = m.role || "user";
    lines.push(`[${role.toUpperCase()}]`);
    lines.push(m.content || "");
  }
  lines.push("[ASSISTANT]");
  return lines.join("\n");
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
