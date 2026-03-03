# Green Tech Analyzer

Aplikasi analisis laporan keberlanjutan otomatis berbasis **Green Manufacturing Maturity Framework**.

## Fitur
- Upload PDF laporan keberlanjutan (Sustainability Report / Data Book)
- Analisis otomatis dengan 14 kode dari codebook + 2 kode tambahan
- Deteksi paragraf tindakan nyata vs intent-only (negative case)
- Export hasil ke CSV dan laporan teks
- Tampilan per stage (Stage 1–4) sesuai framework

## Cara Deploy ke Vercel

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

### 4. Deploy ke Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Atau deploy production
vercel --prod
```

### 5. Alternatif: Deploy via GitHub
1. Push ke GitHub repository
2. Buka vercel.com → New Project → Import repository
3. Framework: Vite (auto-detected)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy!

## Catatan Teknis
- PDF harus berupa teks (bukan scan gambar)
- Analisis dilakukan sepenuhnya di browser (tidak ada data yang dikirim ke server)
- Untuk PDF berukuran besar (>10MB), proses mungkin memakan 30-60 detik

## Kerangka Konseptual
Berdasarkan:
- Shukla, N. & Adil, G.K. (2022). Green Manufacturing Maturity
- Abraham & Dao (2019) - Unit of analysis: paragraf
- Coding decision rules: hanya tindakan nyata, bukan intent/rencana
