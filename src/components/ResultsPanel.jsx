import { useState } from "react";
import { CODEBOOK, STAGE_COLORS } from "../data/codebook.js";
import { buildStageSummary } from "../utils/analyzer.js";
import {
  exportToCSV,
  downloadCSV,
  downloadText,
  exportFullReport,
  buildExportFilename,
} from "../utils/exporter.js";
import styles from "./ResultsPanel.module.css";

const TABS = [
  "Ringkasan",
  "Paragraf Dikoding",
  "Negative Case",
  "Tidak Dikoding",
];

export default function ResultsPanel({ analysisResult, metadata }) {
  const [activeTab, setActiveTab] = useState("Ringkasan");
  const [expandedParagraph, setExpandedParagraph] = useState(null);

  const stageSummary = buildStageSummary(analysisResult.codeSummary);
  const totalCoded = analysisResult.codedParagraphs.length;

  const handleExportCSV = () => {
    downloadCSV(
      exportToCSV(analysisResult, metadata),
      buildExportFilename(metadata, "coding", "csv"),
    );
  };

  const handleExportReport = () => {
    downloadText(
      exportFullReport(analysisResult, metadata),
      buildExportFilename(metadata, "report", "txt"),
    );
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.companyName}>
            {metadata.companyName || "Perusahaan"}
          </h2>
          <div className={styles.headerMeta}>
            {[metadata.reportYear, metadata.region, metadata.industry]
              .filter(Boolean)
              .map((value) => (
                <span key={value} className={styles.badge}>
                  {value}
                </span>
              ))}
          </div>
        </div>
        <div className={styles.exportButtons}>
          <button className={styles.btnSecondary} onClick={handleExportReport}>
            <IconTxt /> Ekspor TXT
          </button>
          <button className={styles.btnPrimary} onClick={handleExportCSV}>
            <IconCsv /> Ekspor CSV
          </button>
        </div>
      </div>

      {analysisResult.aiSummaryError && (
        <div className={styles.tabContent}>
          <p className={styles.listMeta}>⚠ {analysisResult.aiSummaryError}</p>
        </div>
      )}

      {analysisResult.aiSummary && (
        <div
          className={styles.tabContent}
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Ringkasan AI</h3>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                color: "var(--ink)",
              }}
            >
              {analysisResult.aiSummary}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{totalCoded}</span>
          <span className={styles.statLabel}>Paragraf Dikoding</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>
            {analysisResult.negativeCase.length}
          </span>
          <span className={styles.statLabel}>Negative Cases</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>
            {analysisResult.newCodes.length}
          </span>
          <span className={styles.statLabel}>Code Baru</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>
            {analysisResult.uncoded.length}
          </span>
          <span className={styles.statLabel}>Tidak Dikoding</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === "Ringkasan" && (
          <SummaryTab
            analysisResult={analysisResult}
            stageSummary={stageSummary}
            metadata={metadata}
          />
        )}
        {activeTab === "Paragraf Dikoding" && (
          <CodedParagraphsTab
            paragraphs={analysisResult.codedParagraphs}
            expandedParagraph={expandedParagraph}
            setExpandedParagraph={setExpandedParagraph}
          />
        )}
        {activeTab === "Negative Case" && (
          <NegativeCaseTab cases={analysisResult.negativeCase} />
        )}
        {activeTab === "Tidak Dikoding" && (
          <UncodedTab paragraphs={analysisResult.uncoded} />
        )}
      </div>
    </div>
  );
}

function SummaryTab({ analysisResult, stageSummary, metadata }) {
  return (
    <div className={styles.summaryTab}>
      {/* Company Info Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Informasi Laporan</h3>
        <table className={styles.infoTable}>
          <tbody>
            {[
              ["Nama Perusahaan", metadata.companyName],
              ["Kode Perusahaan", metadata.companyCode],
              ["Negara", metadata.country],
              ["Wilayah", metadata.region],
              ["Jenis Industri", metadata.industry],
              ["Nama Laporan", metadata.reportName],
              ["Tahun Laporan", metadata.reportYear],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className={styles.infoKey}>{k}</td>
                <td className={styles.infoVal}>{v || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stage coding table - main output */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Klasifikasi Berdasarkan Codebook
        </h3>
        <div className={styles.codingTable}>
          {Object.entries(CODEBOOK).map(([stageKey, stageData]) => {
            const stageNum = parseInt(stageKey.replace("stage", ""));
            const stageColors = STAGE_COLORS[stageNum];
            // Stage aggregates come from buildStageSummary so the header, the
            // total row and the CSV all count the same way.
            const { total: stageTotal, count: activeCodeCount } =
              stageSummary[stageNum];

            const codeRows = stageData.codes.map((codeEntry) => ({
              codeEntry,
              count: analysisResult.codeSummary[codeEntry.id]?.count || 0,
            }));

            return (
              <div key={stageKey} className={styles.stageBlock}>
                <div
                  className={styles.stageHeader}
                  style={{
                    background: stageColors.bg,
                    borderColor: stageColors.border,
                  }}
                >
                  <span
                    className={styles.stageLabel}
                    style={{ color: stageColors.text }}
                  >
                    {stageData.label}
                  </span>
                  <span
                    className={styles.stageStats}
                    style={{ color: stageColors.text }}
                  >
                    {activeCodeCount} code aktif &middot; Total = {stageTotal}
                  </span>
                </div>
                <table className={styles.codeTable}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th className={styles.numCol}>
                        Jumlah Paragraf Dikoding
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeRows.map(({ codeEntry, count }) => (
                      <tr
                        key={codeEntry.id}
                        className={count > 0 ? styles.activeRow : ""}
                      >
                        <td>{codeEntry.code}</td>
                        <td className={styles.numCol}>
                          {count > 0 ? (
                            <span
                              className={styles.countBadge}
                              style={{
                                background: stageColors.bg,
                                color: stageColors.text,
                                borderColor: stageColors.border,
                              }}
                            >
                              {count}
                            </span>
                          ) : (
                            <span className={styles.zeroCount}>0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td>
                        <strong>Total</strong>
                      </td>
                      <td className={styles.numCol}>
                        <strong>{stageTotal}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Additional codes */}
          {analysisResult.newCodes.length > 0 && (
            <div className={styles.stageBlock}>
              <div
                className={styles.stageHeader}
                style={{ background: "#f0e6ff", borderColor: "#d4b5f5" }}
              >
                <span
                  className={styles.stageLabel}
                  style={{ color: "#6b3fa0" }}
                >
                  Code Tambahan (Kemunculan Baru)
                </span>
              </div>
              <table className={styles.codeTable}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th className={styles.numCol}>Jumlah Paragraf</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.newCodes.map((nc) => (
                    <tr key={nc.code} className={styles.activeRow}>
                      <td>
                        {nc.code} <span className={styles.newBadge}>BARU</span>
                      </td>
                      <td className={styles.numCol}>
                        <span
                          className={styles.countBadge}
                          style={{
                            background: "#f0e6ff",
                            color: "#6b3fa0",
                            borderColor: "#d4b5f5",
                          }}
                        >
                          {nc.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodedParagraphsTab({
  paragraphs,
  expandedParagraph,
  setExpandedParagraph,
}) {
  return (
    <div className={styles.listTab}>
      <p className={styles.listMeta}>{paragraphs.length} paragraf dikoding</p>
      <div className={styles.paragraphList}>
        {paragraphs.map((p) => (
          <div
            key={p.id}
            className={`${styles.paragraphCard} ${expandedParagraph === p.id ? styles.expanded : ""}`}
          >
            <div
              className={styles.paragraphHeader}
              onClick={() =>
                setExpandedParagraph(expandedParagraph === p.id ? null : p.id)
              }
            >
              <span className={styles.pageTag}>Hal. {p.pageNum}</span>
              <div className={styles.codeTags}>
                {p.codes.map((c) => (
                  <span
                    key={c.codeId}
                    className={styles.codeTag}
                    style={{
                      background: STAGE_COLORS[c.stage]?.bg || "#f5f5f5",
                      color: STAGE_COLORS[c.stage]?.text || "#333",
                      borderColor: STAGE_COLORS[c.stage]?.border || "#ddd",
                    }}
                  >
                    {c.code}
                  </span>
                ))}
              </div>
              <span className={styles.expandToggle}>
                {expandedParagraph === p.id ? "▲" : "▼"}
              </span>
            </div>
            {expandedParagraph === p.id && (
              <div className={styles.paragraphBody}>
                <p className={styles.paragraphText}>{p.text}</p>
                <div className={styles.codeDetails}>
                  {p.codes.map((c) => (
                    <div key={c.codeId} className={styles.codeDetail}>
                      <strong>{c.code}</strong>
                      <span className={styles.matchedKeywords}>
                        Keyword: {c.matched.slice(0, 4).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {paragraphs.length === 0 && (
          <p className={styles.empty}>Tidak ada paragraf yang dikoding.</p>
        )}
      </div>
    </div>
  );
}

function NegativeCaseTab({ cases }) {
  return (
    <div className={styles.listTab}>
      <div className={styles.negativeExplain}>
        <strong>Apa itu Negative Case?</strong>
        <p>
          Potongan data yang menyimpang dari ekspektasi teori/kode — seperti
          pernyataan niat tanpa aksi nyata, klaim tanpa angka/bukti, atau
          advokasi tanpa perubahan sistem. Fungsinya untuk mengetes ketahanan
          kode dan mencegah confirmatory bias.
        </p>
      </div>
      <p className={styles.listMeta}>
        {cases.length} negative case teridentifikasi
      </p>
      <div className={styles.paragraphList}>
        {cases.slice(0, 50).map((nc, i) => (
          <div key={i} className={styles.negativeCard}>
            <div className={styles.negativeHeader}>
              <span className={styles.pageTag}>Hal. {nc.pageNum}</span>
              <span className={styles.negativeCode}>{nc.code}</span>
            </div>
            <p className={styles.negativeReason}>⚠ {nc.reason}</p>
            <p className={styles.paragraphText}>
              {nc.text.substring(0, 300)}
              {nc.text.length > 300 ? "..." : ""}
            </p>
          </div>
        ))}
        {cases.length === 0 && (
          <p className={styles.empty}>
            Tidak ada negative case teridentifikasi.
          </p>
        )}
      </div>
    </div>
  );
}

function UncodedTab({ paragraphs }) {
  return (
    <div className={styles.listTab}>
      <p className={styles.listMeta}>
        {paragraphs.length} paragraf mengandung kata kunci lingkungan tapi tidak
        dikoding
      </p>
      <div className={styles.paragraphList}>
        {paragraphs.slice(0, 100).map((p) => (
          <div key={p.id} className={styles.uncodedCard}>
            <div className={styles.negativeHeader}>
              <span className={styles.pageTag}>Hal. {p.pageNum}</span>
            </div>
            {p.notCodedReasons.map((r, i) => (
              <p key={i} className={styles.uncodedReason}>
                ✗ {r.reason}
              </p>
            ))}
            <p className={styles.paragraphText}>
              {p.text.substring(0, 250)}
              {p.text.length > 250 ? "..." : ""}
            </p>
          </div>
        ))}
        {paragraphs.length === 0 && (
          <p className={styles.empty}>
            Tidak ada paragraf yang ditemukan dalam kategori ini.
          </p>
        )}
      </div>
    </div>
  );
}

// Icons
function IconTxt() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="2"
        y="1"
        width="9"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 5h5M5 7.5h5M5 10h3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCsv() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="1"
        y="3"
        width="14"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M1 6.5h14M5.5 6.5v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
