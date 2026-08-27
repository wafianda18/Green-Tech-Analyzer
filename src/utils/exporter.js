import { CODEBOOK, ADDITIONAL_CODES } from "../data/codebook.js";

const CSV_HEADER = [
  "Nama Perusahaan",
  "Kode Perusahaan",
  "Negara",
  "Wilayah",
  "Jenis Industri",
  "Nama Laporan",
  "Tahun Laporan",
  "Stage",
  "Code",
  "Jumlah Paragraf",
  "Jumlah Code Aktif di Stage",
  "Total Paragraf di Stage",
  "Contoh Paragraf (Page)",
  "Notes",
];

/**
 * Neutralise spreadsheet formula injection. Report text is untrusted input, and
 * a cell opening with =, + or @ is executed as a formula by Excel/Sheets.
 */
function sanitizeCell(value) {
  const text = String(value ?? "");
  return /^[=+@]/.test(text) ? `'${text}` : text;
}

function toCSVRow(cells) {
  return cells
    .map((cell) => `"${sanitizeCell(cell).replace(/"/g, '""')}"`)
    .join(",");
}

function metadataCells(metadata) {
  return [
    metadata.companyName || "",
    metadata.companyCode || "",
    metadata.country || "",
    metadata.region || "",
    metadata.industry || "",
    metadata.reportName || "",
    metadata.reportYear || "",
  ];
}

function exampleParagraphsFor(analysisResult, codeId) {
  return (analysisResult.codedParagraphs || [])
    .filter((p) => p.codes.some((c) => c.codeId === codeId))
    .slice(0, 2)
    .map((p) => `[p.${p.pageNum}] ${p.text.substring(0, 80)}...`)
    .join(" | ");
}

export function exportToCSV(analysisResult, metadata) {
  const rows = [CSV_HEADER];
  const { codeSummary } = analysisResult;

  for (const stageData of Object.values(CODEBOOK)) {
    // Totals must be known before the first row of the stage is written. The
    // previous version emitted a running counter, so each row showed a
    // different, wrong value for "codes active in this stage".
    const counts = stageData.codes.map(
      (codeEntry) => codeSummary[codeEntry.id]?.count || 0,
    );
    const stageTotal = counts.reduce((sum, count) => sum + count, 0);
    const activeCodeCount = counts.filter((count) => count > 0).length;

    stageData.codes.forEach((codeEntry, index) => {
      rows.push([
        ...metadataCells(metadata),
        `Stage ${codeEntry.stage}`,
        codeEntry.code,
        counts[index],
        activeCodeCount,
        stageTotal,
        exampleParagraphsFor(analysisResult, codeEntry.id),
        "",
      ]);
    });
  }

  const additionalCounts = ADDITIONAL_CODES.map(
    (codeEntry) => codeSummary[codeEntry.id]?.count || 0,
  );
  const additionalTotal = additionalCounts.reduce((sum, c) => sum + c, 0);
  const additionalActive = additionalCounts.filter((c) => c > 0).length;

  ADDITIONAL_CODES.forEach((codeEntry, index) => {
    rows.push([
      ...metadataCells(metadata),
      "Additional",
      codeEntry.code,
      additionalCounts[index],
      additionalActive,
      additionalTotal,
      exampleParagraphsFor(analysisResult, codeEntry.id),
      additionalCounts[index] > 0 ? "New emerging code" : "",
    ]);
  });

  return rows.map(toCSVRow).join("\n");
}

/**
 * Trigger a browser download. The link has to be in the document for Firefox
 * to honour the click, and the object URL can only be revoked once the download
 * has actually started — revoking synchronously cancelled it in some browsers.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadCSV(content, filename) {
  // The BOM keeps Excel from mangling UTF-8 company names.
  downloadBlob(
    new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" }),
    filename,
  );
}

export function downloadText(content, filename) {
  downloadBlob(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
    filename,
  );
}

/** Filesystem-safe download name built from the report metadata. */
export function buildExportFilename(metadata, suffix, extension) {
  const parts = [metadata.companyName || "analysis", metadata.reportYear || ""]
    .map((part) =>
      String(part)
        .replace(/[^\w\-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, ""),
    )
    .filter(Boolean);
  return `${parts.join("_")}_${suffix}.${extension}`;
}

export function exportFullReport(analysisResult, metadata) {
  const lines = [];

  lines.push(`GREEN TECHNOLOGY ANALYSIS REPORT`);
  lines.push(`${"=".repeat(60)}`);
  lines.push(`Nama Perusahaan  : ${metadata.companyName || "N/A"}`);
  lines.push(`Kode Perusahaan  : ${metadata.companyCode || "N/A"}`);
  lines.push(`Negara           : ${metadata.country || "N/A"}`);
  lines.push(`Wilayah          : ${metadata.region || "N/A"}`);
  lines.push(`Jenis Industri   : ${metadata.industry || "N/A"}`);
  lines.push(`Nama Laporan     : ${metadata.reportName || "N/A"}`);
  lines.push(`Tahun Laporan    : ${metadata.reportYear || "N/A"}`);
  lines.push("");

  const stats = analysisResult.stats;
  if (stats) {
    lines.push(`RINGKASAN PROSES`);
    lines.push(`${"-".repeat(60)}`);
    lines.push(`  Paragraf diekstrak       : ${stats.paragraphsTotal}`);
    lines.push(`  Paragraf dianalisis      : ${stats.paragraphsAnalyzed}`);
    lines.push(`  Paragraf dilewati        : ${stats.paragraphsSkipped}`);
    lines.push(
      `  Paragraf dikoding        : ${analysisResult.codedParagraphs.length}`,
    );
    lines.push(
      `  Negative case            : ${analysisResult.negativeCase.length}`,
    );
    lines.push(`  Tidak dikoding           : ${analysisResult.uncoded.length}`);
    lines.push("");
  }

  lines.push(`KLASIFIKASI BERDASARKAN CODEBOOK`);
  lines.push(`${"-".repeat(60)}`);

  const { codeSummary } = analysisResult;

  for (const stageData of Object.values(CODEBOOK)) {
    let stageTotal = 0;
    let stageCodeCount = 0;
    const stageLines = [];

    for (const codeEntry of stageData.codes) {
      const count = codeSummary[codeEntry.id]?.count || 0;
      stageTotal += count;
      if (count > 0) stageCodeCount++;
      stageLines.push(`  ${codeEntry.code.padEnd(45)} ${count}`);
    }

    lines.push(`\n${stageData.label} (${stageCodeCount} codes active)`);
    lines.push(...stageLines);
    lines.push(`  ${"Total".padEnd(45)} ${stageTotal}`);
  }

  lines.push("");
  lines.push(`KEMUNCULAN CODE BARU`);
  lines.push(`${"-".repeat(60)}`);
  if (analysisResult.newCodes.length > 0) {
    for (const nc of analysisResult.newCodes) {
      lines.push(`  ${nc.code}: ${nc.count} paragraphs`);
    }
  } else {
    lines.push("  Tidak ada code baru");
  }

  lines.push("");
  lines.push(`NEGATIVE CASES`);
  lines.push(`${"-".repeat(60)}`);
  if (analysisResult.negativeCase.length > 0) {
    for (const nc of analysisResult.negativeCase.slice(0, 10)) {
      lines.push(`  [Page ${nc.pageNum}] Code: ${nc.code}`);
      lines.push(`  Reason: ${nc.reason}`);
      lines.push(`  Text: ${nc.text.substring(0, 150)}...`);
      lines.push("");
    }
    if (analysisResult.negativeCase.length > 10) {
      lines.push(
        `  ... dan ${analysisResult.negativeCase.length - 10} negative case lainnya`,
      );
    }
  } else {
    lines.push("  Tidak ada negative case teridentifikasi");
  }

  if (analysisResult.aiSummary) {
    lines.push("");
    lines.push(`RINGKASAN AI`);
    lines.push(`${"-".repeat(60)}`);
    lines.push(analysisResult.aiSummary.trim());
  }

  return lines.join("\n");
}
