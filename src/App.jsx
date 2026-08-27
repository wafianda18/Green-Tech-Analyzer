import { useState, useCallback, useRef } from "react";
import UploadZone from "./components/UploadZone.jsx";
import MetadataForm from "./components/MetadataForm.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import {
  extractPages,
  extractParagraphs,
  extractMetadataFromFilename,
} from "./utils/pdfExtractor.js";
import {
  analyzeParagraphs,
  detectYear,
  detectReportName,
} from "./utils/analyzer.js";
import {
  generateAISummary,
  generateCompanyProfileFromText,
} from "./utils/llm.js";
import {
  REGIONS,
  INDUSTRIES,
  ALL_CODES,
  ADDITIONAL_CODES,
} from "./data/codebook.js";
import styles from "./App.module.css";

const DEFAULT_METADATA = {
  companyName: "",
  companyCode: "",
  country: "",
  region: "",
  industry: "",
  reportName: "",
  reportYear: "",
  useAI: false,
};

const STEPS = ["upload", "configure", "results"];

// Derived from the codebook so the claim on screen cannot drift from the data.
// (The hard-coded "14 kode" was already out of date by three codes.)
const CODEBOOK_CODE_COUNT = ALL_CODES.length - ADDITIONAL_CODES.length;

const REQUIRED_FIELDS = [
  ["companyName", "Nama perusahaan"],
  ["country", "Negara"],
  ["region", "Wilayah"],
  ["industry", "Jenis industri"],
];

export default function App() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [step, setStep] = useState("upload"); // 'upload' | 'configure' | 'results'

  // The extracted pages are reused by the analysis run, so the PDF is parsed
  // once per upload instead of once here and again on "Mulai Analisis".
  const pagesRef = useRef(null);

  const missingFields = REQUIRED_FIELDS.filter(
    ([field]) => !String(metadata[field] || "").trim(),
  ).map(([, label]) => label);

  /** Best-effort AI autofill; never blocks the user from continuing. */
  const enrichProfileWithAI = useCallback(async (pages) => {
    setIsProfiling(true);
    try {
      const rawText = pages
        .slice(0, 3)
        .map((p) => p.text)
        .join("\n")
        .slice(0, 8000);
      const aiProfile = await generateCompanyProfileFromText(rawText, {
        regions: REGIONS,
        industries: INDUSTRIES,
      });
      if (!aiProfile) return;

      setMetadata((prev) => ({
        ...prev,
        companyName: prev.companyName || aiProfile.companyName || "",
        country: prev.country || aiProfile.country || "",
        region:
          prev.region ||
          (REGIONS.includes(aiProfile.region) ? aiProfile.region : ""),
        industry:
          prev.industry ||
          (INDUSTRIES.includes(aiProfile.industry) ? aiProfile.industry : ""),
        reportName: prev.reportName || aiProfile.reportName || "",
        reportYear: prev.reportYear || aiProfile.reportYear || "",
      }));
    } catch (e) {
      // The AI autofill is optional: the form stays editable either way.
      console.warn("Profil AI gagal diekstrak:", e?.message || e);
    } finally {
      setIsProfiling(false);
    }
  }, []);

  const handleFileSelected = useCallback(
    async (selectedFile) => {
      setFile(selectedFile);
      setError(null);
      setAnalysisResult(null);
      pagesRef.current = null;

      const { code, year } = extractMetadataFromFilename(selectedFile.name);
      setMetadata((prev) => ({
        ...prev,
        companyCode: code || prev.companyCode,
        reportYear: prev.reportYear || year,
      }));

      setIsLoading(true);
      setProgress("Mengekstrak teks dari PDF...");

      try {
        const pages = await extractPages(selectedFile, {
          onProgress: (pageNum, total) =>
            setProgress(`Mengekstrak teks dari PDF... (halaman ${pageNum}/${total})`),
        });
        pagesRef.current = pages;

        setMetadata((prev) => ({
          ...prev,
          reportYear: prev.reportYear || detectYear(pages),
          reportName: prev.reportName || detectReportName(pages),
        }));
        setStep("configure");

        // Runs in the background so step 2 is usable immediately.
        enrichProfileWithAI(pages);
      } catch (err) {
        console.error(err);
        setFile(null);
        setError(
          `Gagal membaca PDF: ${err.message}. Pastikan file adalah PDF teks yang valid (bukan hasil scan gambar).`,
        );
      } finally {
        setIsLoading(false);
        setProgress("");
      }
    },
    [enrichProfileWithAI],
  );

  const handleAnalyze = useCallback(async () => {
    if (!file || missingFields.length > 0) return;
    setIsLoading(true);
    setError(null);

    try {
      let pages = pagesRef.current;
      if (!pages) {
        setProgress("Mengekstrak teks dari PDF...");
        pages = await extractPages(file, {
          onProgress: (pageNum, total) =>
            setProgress(`Mengekstrak teks dari PDF... (halaman ${pageNum}/${total})`),
        });
        pagesRef.current = pages;
      }

      setProgress("Memisahkan paragraf...");
      const paragraphs = extractParagraphs(pages);
      if (paragraphs.length === 0) {
        throw new Error(
          "Tidak ada paragraf yang dapat dianalisis dari dokumen ini",
        );
      }

      setProgress(
        `Menganalisis ${paragraphs.length} paragraf dengan codebook...`,
      );
      // Small delay to allow UI update
      await new Promise((r) => setTimeout(r, 50));

      const result = analyzeParagraphs(paragraphs);

      if (metadata.useAI) {
        setProgress("Menghasilkan ringkasan AI...");
        try {
          result.aiSummary = await generateAISummary(result, metadata);
        } catch (e) {
          console.warn("Gagal mendapatkan ringkasan AI:", e?.message || e);
          result.aiSummaryError =
            "Ringkasan AI tidak tersedia (periksa konfigurasi API di server).";
        }
      }

      setAnalysisResult(result);
      setStep("results");
    } catch (err) {
      console.error(err);
      setError(
        `Gagal menganalisis PDF: ${err.message}. Pastikan file adalah PDF yang valid dan dapat dibaca (bukan scan gambar).`,
      );
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  }, [file, metadata, missingFields.length]);

  const handleReset = () => {
    setFile(null);
    setAnalysisResult(null);
    setError(null);
    setProgress("");
    setMetadata(DEFAULT_METADATA);
    pagesRef.current = null;
    setStep("upload");
  };

  const errorBox = error ? (
    <div className={styles.errorBox} role="alert">
      <strong>Error:</strong> {error}
    </div>
  ) : null;

  return (
    <div className={styles.app}>
      {/* Decorative background */}
      <div className={styles.bgDecor} aria-hidden="true">
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path
                  d="M14 3L25 8.5V19.5L14 25L3 19.5V8.5L14 3Z"
                  fill="var(--accent)"
                  opacity="0.15"
                />
                <path
                  d="M14 3L25 8.5V19.5L14 25L3 19.5V8.5L14 3Z"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                />
                <path
                  d="M14 8v6l4 2"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h1 className={styles.logoTitle}>Green Tech Analyzer</h1>
              <p className={styles.logoSub}>
                Sustainability Report Coding Tool
              </p>
            </div>
          </div>

          {step !== "upload" && (
            <button className={styles.resetBtn} onClick={handleReset}>
              ← Analisis Baru
            </button>
          )}
        </header>

        {/* Step indicator */}
        <div className={styles.steps}>
          {[
            { key: "upload", label: "1. Upload PDF" },
            { key: "configure", label: "2. Konfigurasi" },
            { key: "results", label: "3. Hasil Analisis" },
          ].map((s, i) => {
            const isDone = STEPS.indexOf(s.key) < STEPS.indexOf(step);
            const isActive = s.key === step;
            return (
              <div key={s.key} className={styles.stepItem}>
                <span
                  className={`${styles.stepDot} ${
                    isActive
                      ? styles.stepActive
                      : isDone
                        ? styles.stepDone
                        : ""
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span className={styles.stepLabel}>{s.label}</span>
                {i < 2 && <div className={styles.stepLine} />}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <main className={styles.main}>
          {step === "upload" && (
            <div
              className={styles.uploadSection}
              style={{ animation: "fadeUp 0.4s ease" }}
            >
              <div className={styles.introBox}>
                <h2 className={styles.introTitle}>
                  Analisis Laporan Keberlanjutan Otomatis
                </h2>
                <p className={styles.introDesc}>
                  Upload file PDF laporan keberlanjutan (Sustainability Report /
                  Data Book) untuk menganalisis konten secara otomatis
                  berdasarkan kerangka Green Technology Maturity. Sistem akan
                  mengidentifikasi paragraf yang mengandung tindakan nyata
                  teknologi hijau dan mengklasifikasikannya ke dalam 4 stage
                  sesuai codebook.
                </p>
                <div className={styles.featureList}>
                  {[
                    `${CODEBOOK_CODE_COUNT} kode sesuai codebook + ${ADDITIONAL_CODES.length} kode tambahan`,
                    "Deteksi negative case & intent-only",
                    "Export CSV & laporan teks",
                    "Desain berdasarkan decision rules",
                  ].map((f) => (
                    <span key={f} className={styles.featureItem}>
                      <span className={styles.featureCheck}>✓</span> {f}
                    </span>
                  ))}
                </div>
              </div>

              {errorBox}

              <UploadZone
                onFileSelected={handleFileSelected}
                onInvalidFile={(message) => setError(message)}
                isLoading={isLoading}
                progress={progress}
              />
            </div>
          )}

          {step === "configure" && (
            <div
              className={styles.configSection}
              style={{ animation: "fadeUp 0.4s ease" }}
            >
              <div className={styles.fileInfo}>
                <div className={styles.fileIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 2.5A1.5 1.5 0 015.5 1h6l4 4v12.5A1.5 1.5 0 0114 19H5.5A1.5 1.5 0 014 17.5v-15z"
                      stroke="var(--crimson)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M11.5 1v4h4"
                      stroke="var(--crimson)"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <div>
                  <p className={styles.fileName}>{file?.name}</p>
                  <p className={styles.fileSize}>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${
                          pagesRef.current?.length ?? 0
                        } halaman`
                      : ""}
                  </p>
                </div>
              </div>

              <MetadataForm
                metadata={metadata}
                onChange={setMetadata}
                isProfiling={isProfiling}
              />

              {errorBox}

              <div className={styles.analyzeActions}>
                {isLoading && (
                  <div className={styles.progressBox}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} />
                    </div>
                    <p className={styles.progressText}>{progress}</p>
                  </div>
                )}
                <button
                  className={styles.analyzeBtn}
                  onClick={handleAnalyze}
                  disabled={isLoading || missingFields.length > 0}
                >
                  {isLoading ? "Menganalisis..." : "Mulai Analisis →"}
                </button>
                {missingFields.length > 0 && (
                  <p className={styles.requiredNote}>
                    * Wajib diisi: {missingFields.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === "results" && analysisResult && (
            <ResultsPanel analysisResult={analysisResult} metadata={metadata} />
          )}
        </main>

        <footer className={styles.footer}>
          <p>Green Tech Analyzer · Green Manufacturing Maturity Framework</p>
        </footer>
      </div>
    </div>
  );
}
