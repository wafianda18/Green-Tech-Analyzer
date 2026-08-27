/**
 * Browser-side client for the /api LLM routes.
 *
 * Both providers are optional: when no API key is configured the request fails
 * and callers fall back to the deterministic, offline analysis.
 */

const AI_UNAVAILABLE =
  "Endpoint AI tidak tersedia. Jalankan lewat Vercel atau set API key di environment.";

async function readJSONResponse(resp) {
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    // A dev server without the API routes answers with the SPA's index.html.
    throw new Error(AI_UNAVAILABLE);
  }
  return resp.json();
}

async function postJSON(url, body) {
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Tidak dapat menghubungi ${url}: ${err.message}`);
  }

  if (!resp.ok) {
    let message = `Permintaan ke ${url} gagal (${resp.status})`;
    try {
      const data = await readJSONResponse(resp);
      if (data?.error) message = data.error;
    } catch {
      // Keep the status-based message.
    }
    const error = new Error(message);
    error.status = resp.status;
    throw error;
  }

  return readJSONResponse(resp);
}

function extractText(data) {
  return (
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.generated_text ||
    ""
  );
}

/**
 * Try the Hugging Face route first, then the OpenAI-compatible one. Each route
 * gets the request shape it actually expects — the previous version posted the
 * OpenAI payload to both, so Hugging Face silently ignored every generation
 * setting.
 */
export async function requestChatCompletion({ messages, options = {} }) {
  const errors = [];

  for (const attempt of [
    { url: "/api/hf-chat", body: { messages, options } },
    {
      url: "/api/chat",
      body: {
        messages,
        max_tokens: options.max_tokens ?? 800,
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        presence_penalty: options.presence_penalty ?? 0.2,
        ...(options.top_k != null ? { top_k: options.top_k } : {}),
      },
    },
  ]) {
    try {
      const text = extractText(await postJSON(attempt.url, attempt.body));
      if (text.trim()) return text;
      errors.push(`${attempt.url}: respons kosong`);
    } catch (err) {
      errors.push(`${attempt.url}: ${err.message}`);
    }
  }

  throw new Error(`Gagal memanggil AI — ${errors.join(" | ")}`);
}

export async function requestHFChatRawPrompt({ prompt, params = {} }) {
  const data = await postJSON("/api/hf-chat", { prompt, params });
  return extractText(data);
}

export async function generateAISummary(analysisResult, metadata) {
  const counts = Object.entries(analysisResult.codeSummary)
    .filter(([, value]) => value.count > 0)
    .map(([id, value]) => ({ id, code: value.code, count: value.count }));

  const payload = {
    companyName: metadata.companyName,
    industry: metadata.industry,
    region: metadata.region,
    year: metadata.reportYear,
    counts,
    totalCoded: analysisResult.codedParagraphs.length,
    negativeCases: analysisResult.negativeCase.length,
    newCodes: analysisResult.newCodes.map((x) => x.code),
  };

  const messages = [
    {
      role: "system",
      content:
        "Anda adalah analis keberlanjutan berpengalaman. Buat ringkasan singkat (4-6 bullet) dalam Bahasa Indonesia tentang pola temuan berdasarkan distribusi code berikut. Hindari jargon, fokus pada insight yang dapat ditindaklanjuti.",
    },
    {
      role: "user",
      content:
        "Berdasarkan rekap berikut, rangkum pola utama, stage dominan, dan rekomendasi singkat perbaikan:\n" +
        JSON.stringify(payload),
    },
  ];

  return requestChatCompletion({
    messages,
    options: {
      temperature: 0.6,
      max_tokens: 700,
      top_p: 0.9,
      presence_penalty: 0.1,
      top_k: 40,
    },
  });
}

export async function generateCompanyProfileFromText(
  rawText,
  { regions = [], industries = [] } = {},
) {
  if (!rawText || !rawText.trim()) return null;

  const instruction =
    "Ekstrak profil perusahaan dari cuplikan laporan keberlanjutan berikut. " +
    "Jawab dalam JSON valid tanpa teks lain, dengan key persis: " +
    "companyName, country, region, industry, reportName, reportYear. " +
    `Region HARUS salah satu dari daftar berikut: ${regions.join(", ")}. ` +
    `Industry HARUS salah satu dari daftar berikut: ${industries.join(", ")}. ` +
    "Jika tidak yakin, isi dengan string kosong. " +
    "Prioritaskan nama perusahaan resmi dan tahun laporan yang disebutkan.";

  const text = await requestChatCompletion({
    messages: [
      { role: "system", content: instruction },
      { role: "user", content: "Teks:\n" + rawText.substring(0, 4000) },
    ],
    options: { temperature: 0.2, max_tokens: 400, top_p: 0.9 },
  });

  return parseProfileJSON(text);
}

/** Models often wrap JSON in prose or a code fence; pull the object back out. */
export function parseProfileJSON(text) {
  if (!text) return null;
  const withoutFence = text.replace(/```(?:json)?/gi, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let obj;
  try {
    obj = JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    return null;
  }

  const asString = (value) =>
    typeof value === "string" ? value.trim() : value == null ? "" : String(value);

  return {
    companyName: asString(obj.companyName),
    country: asString(obj.country),
    region: asString(obj.region),
    industry: asString(obj.industry),
    reportName: asString(obj.reportName),
    reportYear: asString(obj.reportYear),
  };
}
