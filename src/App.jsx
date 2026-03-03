import { useState, useCallback } from "react";
import UploadZone from "./components/UploadZone.jsx";
import MetadataForm from "./components/MetadataForm.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import {
  extractTextFromPDF,
  extractParagraphs,
  extractMetadataFromFilename,
  extractFirstPages,
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
import { REGIONS, INDUSTRIES } from "./data/codebook.js";
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

export default function App() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(DEFAULT_METADATA);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [step, setStep] = useState("upload"); // 'upload' | 'configure' | 'results'

  const handleFileSelected = useCallback(async (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setAnalysisResult(null);

    // Auto-extract from filename
    const { code } = extractMetadataFromFilename(selectedFile.name);
    setMetadata((prev) => ({
      ...prev,
      companyCode: code || prev.companyCode,
    }));

    // Attempt AI-based company profile extraction from first pages
    try {
      const firstPages = await extractFirstPages(selectedFile, 3);
      const rawText = firstPages
        .map((p) => p.text)
        .join(" ")
        .slice(0, 8000);
      const aiProfile = await generateCompanyProfileFromText(rawText, {
        regions: REGIONS,
        industries: INDUSTRIES,
      });
      if (aiProfile) {
        setMetadata((prev) => ({
          ...prev,
          companyName:
            prev.companyName || aiProfile.companyName || prev.companyName,
          country: prev.country || aiProfile.country || prev.country,
          region:
            prev.region ||
            (REGIONS.includes(aiProfile.region)
              ? aiProfile.region
              : prev.region),
          industry:
            prev.industry ||
            (INDUSTRIES.includes(aiProfile.industry)
              ? aiProfile.industry
              : prev.industry),
          reportName:
            prev.reportName || aiProfile.reportName || prev.reportName,
          reportYear:
            prev.reportYear || aiProfile.reportYear || prev.reportYear,
        }));
      }
    } catch (e) {
      console.warn("Profil AI gagal diekstrak:", e?.message || e);
    }

    setStep("configure");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      setProgress("Mengekstrak teks dari PDF...");
      const pages = await extractTextFromPDF(file);

      setProgress("Memisahkan paragraf...");
      const paragraphs = extractParagraphs(pages);

      // Auto-detect year and report name if not set
      const autoYear = detectYear(pages);
      const autoReportName = detectReportName(pages);

      setMetadata((prev) => ({
        ...prev,
        reportYear: prev.reportYear || autoYear,
        reportName: prev.reportName || autoReportName.substring(0, 80),
      }));

      setProgress(
        `Menganalisis ${paragraphs.length} paragraf dengan codebook...`,
      );
      // Small delay to allow UI update
      await new Promise((r) => setTimeout(r, 50));

      const result = analyzeParagraphs(paragraphs);

      if (metadata.useAI) {
        setProgress("Menghasilkan ringkasan AI (Qwen3.5)...");
        try {
          const aiText = await generateAISummary(result, {
            ...metadata,
            reportYear: autoYear || metadata.reportYear,
          });
          result.aiSummary = aiText;
        } catch (e) {
          console.warn("Gagal mendapatkan ringkasan AI:", e?.message || e);
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
  }, [file]);

  const handleReset = () => {
    setFile(null);
    setAnalysisResult(null);
    setError(null);
    setMetadata(DEFAULT_METADATA);
    setStep("upload");
  };

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
          ].map((s, i) => (
            <div key={s.key} className={styles.stepItem}>
              <span
                className={`${styles.stepDot} ${
                  s.key === step
                    ? styles.stepActive
                    : ["upload", "configure", "results"].indexOf(s.key) <
                        ["upload", "configure", "results"].indexOf(step)
                      ? styles.stepDone
                      : ""
                }`}
              >
                {["upload", "configure", "results"].indexOf(s.key) <
                ["upload", "configure", "results"].indexOf(step)
                  ? "✓"
                  : i + 1}
              </span>
              <span className={styles.stepLabel}>{s.label}</span>
              {i < 2 && <div className={styles.stepLine} />}
            </div>
          ))}
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
                    "14 kode sesuai codebook + 2 kode tambahan",
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
              <UploadZone
                onFileSelected={handleFileSelected}
                isLoading={isLoading}
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
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
                  </p>
                </div>
              </div>

              <MetadataForm metadata={metadata} onChange={setMetadata} />

              {error && (
                <div className={styles.errorBox}>
                  <strong>Error:</strong> {error}
                </div>
              )}

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
                  disabled={isLoading || !metadata.companyName}
                >
                  {isLoading ? "Menganalisis..." : "Mulai Analisis →"}
                </button>
                {!metadata.companyName && (
                  <p className={styles.requiredNote}>
                    * Nama perusahaan wajib diisi
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
