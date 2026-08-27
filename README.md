# Green Tech Analyzer

Aplikasi analisis laporan keberlanjutan otomatis berbasis **Green Manufacturing Maturity Framework**.

## Fitur
- Upload PDF laporan keberlanjutan (Sustainability Report / Data Book)
- Analisis otomatis dengan 17 kode dari codebook + 2 kode tambahan
- Deteksi paragraf tindakan nyata vs intent-only (negative case)
- Export hasil ke CSV dan laporan teks
- Tampilan per stage (Stage 1–4) sesuai framework

## Menjalankan Aplikasi

### 1. Install Node.js & npm
Pastikan Node.js >= 18 terinstall.

### 2. Install dependencies
```bash
npm install
```

### 3. Test lokal
```bash
npm run dev
```

### 4. Menjalankan unit test
```bash
npm test
```

## Konfigurasi AI (opsional)

Ringkasan AI dan pengisian otomatis profil perusahaan bersifat opsional —
seluruh analisis codebook berjalan tanpa API key. Endpoint di `api/` akan
dicoba berurutan: `api/hf-chat` (Hugging Face) lalu `api/chat`
(OpenAI-compatible / OpenRouter).

| Environment variable | Digunakan oleh | Keterangan |
| --- | --- | --- |
| `HUGGINGFACE_API_KEY` | `api/hf-chat` | API key Hugging Face Inference |
| `HF_MODEL` | `api/hf-chat` | Default `Qwen/Qwen3.5-35B-A3B` |
| `OPENAI_API_KEY` | `api/chat` | API key penyedia OpenAI-compatible |
| `OPENAI_BASE_URL` | `api/chat` | Default `https://openrouter.ai/api/v1` |
| `LLM_MODEL` | `api/chat` | Default `qwen/qwen3.5-35b-a3b` (slug OpenRouter huruf kecil) |
| `OPENROUTER_REFERRER`, `OPENROUTER_TITLE` | `api/chat` | Header opsional OpenRouter |

Saat `npm run dev`, folder `api/` dilayani oleh middleware Vite sehingga
endpoint `/api/*` juga berfungsi di lokal, bukan hanya di Vercel.

## Catatan Teknis
- PDF harus berupa teks (bukan scan gambar)
- Analisis codebook dilakukan sepenuhnya di browser; teks hanya dikirim ke
  server bila fitur AI diaktifkan
- Untuk PDF berukuran besar (>10MB), proses mungkin memakan 30-60 detik

## Aturan Coding (decision rules)

Unit analisis adalah **paragraf**. Sebuah paragraf dikoding bila:

1. Mengandung kata kunci code (pencocokan **kata utuh**, bukan substring)
2. Bukan sekadar intent/rencana — paragraf dengan bahasa niat tanpa tindakan
   nyata dicatat sebagai **negative case**
3. Kata kunci umum tunggal harus didukung kata kerja tindakan atau bukti
   kuantitatif; istilah spesifik (mis. "wastewater treatment") berdiri sendiri

## Kerangka Konseptual
Berdasarkan:
- Shukla, N. & Adil, G.K. (2022). Green Manufacturing Maturity
- Abraham & Dao (2019) - Unit of analysis: paragraf
- Coding decision rules: hanya tindakan nyata, bukan intent/rencana
