export async function requestChatCompletion({ messages, options = {} }) {
  const payload = {
    messages,
    max_tokens: options.max_tokens ?? 800,
    temperature: options.temperature ?? 0.7,
    top_p: options.top_p ?? 0.9,
    presence_penalty: options.presence_penalty ?? 0.2,
    extra_body: {},
  };
  if (options.top_k != null) {
    payload.top_k = options.top_k;
  }
  let resp = await fetch("/api/hf-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, options }),
  });
  if (!resp.ok) {
    resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || "Gagal memanggil AI");
  }
  const data = await resp.json();
  const text =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.generated_text ||
    "";
  return text;
}

export async function requestHFChatRawPrompt({ prompt, params = {} }) {
  const resp = await fetch("/api/hf-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, params }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || "Gagal memanggil AI");
  }
  const data = await resp.json();
  const text =
    data?.generated_text ||
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    "";
  return text;
}

export async function generateAISummary(analysisResult, metadata) {
  const counts = Object.entries(analysisResult.codeSummary).map(([id, v]) => ({
    id,
    count: v.count,
  }));
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
  const instruction =
    "Ekstrak profil perusahaan dari cuplikan laporan keberlanjutan berikut. " +
    "Jawab dalam JSON valid tanpa teks lain, dengan key persis: " +
    "companyName, country, region, industry, reportName, reportYear. " +
    `Region HARUS salah satu dari daftar berikut: ${regions.join(", ")}. ` +
    `Industry HARUS salah satu dari daftar berikut: ${industries.join(", ")}. ` +
    "Jika tidak yakin, isi dengan string kosong. " +
    "Prioritaskan nama perusahaan resmi dan tahun laporan yang disebutkan.";
  const user = "Teks:\n" + rawText.substring(0, 4000);
  const messages = [
    { role: "system", content: instruction },
    { role: "user", content: user },
  ];
  const text = await requestChatCompletion({
    messages,
    options: { temperature: 0.2, max_tokens: 400, top_p: 0.9 },
  });
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonStr =
      jsonStart >= 0 && jsonEnd > jsonStart
        ? text.slice(jsonStart, jsonEnd + 1)
        : text;
    const obj = JSON.parse(jsonStr);
    return {
      companyName: obj.companyName || "",
      country: obj.country || "",
      region: obj.region || "",
      industry: obj.industry || "",
      reportName: obj.reportName || "",
      reportYear: obj.reportYear || "",
    };
  } catch {
    return null;
  }
}
