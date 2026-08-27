import test from "node:test";
import assert from "node:assert/strict";
import {
  exportToCSV,
  exportFullReport,
  buildExportFilename,
} from "../src/utils/exporter.js";
import { extractMetadataFromFilename } from "../src/utils/pdfExtractor.js";
import { parseProfileJSON } from "../src/utils/llm.js";
import { ALL_CODES } from "../src/data/codebook.js";

const metadata = {
  companyName: 'Ajinomoto Co., "Inc"',
  companyCode: "2802-T",
  country: "Japan",
  region: "Asia Timur",
  industry: "Food Products",
  reportName: "Sustainability Data Book 2022",
  reportYear: "2022",
};

const analysisResult = {
  codedParagraphs: [
    {
      id: "p_0",
      pageNum: 12,
      text: "We installed a scrubber.",
      codes: [{ codeId: "1_end_of_pipe", code: "1 End-of-pipe", stage: 1 }],
    },
  ],
  codeSummary: {
    "1_end_of_pipe": { code: "1 End-of-pipe", stage: 1, count: 3 },
    "1_remediation": { code: "1 Remediation", stage: 1, count: 2 },
    renewable_energy: { code: "Renewable Energy", stage: null, count: 4 },
  },
  negativeCase: [],
  newCodes: [],
  uncoded: [],
  stats: { paragraphsTotal: 10, paragraphsAnalyzed: 8, paragraphsSkipped: 2 },
};

function parseRow(line) {
  return line
    .slice(1, -1)
    .split('","')
    .map((cell) => cell.replace(/""/g, '"'));
}

test("stage totals are identical on every row of the stage", () => {
  const rows = exportToCSV(analysisResult, metadata).split("\n");
  const stage1 = rows.slice(1, 3).map(parseRow);

  // Both Stage 1 rows must report the same "2 codes active / 5 paragraphs".
  assert.equal(stage1[0][9], "3");
  assert.equal(stage1[1][9], "2");
  assert.equal(stage1[0][10], "2");
  assert.equal(stage1[1][10], "2");
  assert.equal(stage1[0][11], "5");
  assert.equal(stage1[1][11], "5");
});

test("quotes inside values are escaped and metadata is repeated per row", () => {
  const rows = exportToCSV(analysisResult, metadata).split("\n");
  const row = parseRow(rows[1]);
  assert.equal(row[0], 'Ajinomoto Co., "Inc"');
  assert.equal(row[1], "2802-T");
  // Every code gets a row, whether or not it was found in the report.
  assert.equal(rows.length - 1, ALL_CODES.length);
});

test("cells that could execute as spreadsheet formulas are neutralised", () => {
  const risky = {
    ...metadata,
    companyName: '=HYPERLINK("http://evil","click")',
  };
  const row = parseRow(exportToCSV(analysisResult, risky).split("\n")[1]);
  assert.ok(row[0].startsWith("'="));
});

test("additional codes are always listed, flagged only when present", () => {
  const rows = exportToCSV(analysisResult, metadata).split("\n").map(parseRow);
  const renewable = rows.find((r) => r[8] === "Renewable Energy");
  const lowImpact = rows.find((r) => r[8] === "Low Impact Process");
  assert.equal(renewable[7], "Additional");
  assert.equal(renewable[9], "4");
  assert.equal(renewable[13], "New emerging code");
  assert.equal(lowImpact[9], "0");
  assert.equal(lowImpact[13], "");
});

test("text report includes process stats and the AI summary", () => {
  const report = exportFullReport(
    { ...analysisResult, aiSummary: "- Stage 2 mendominasi" },
    metadata,
  );
  assert.match(report, /Paragraf diekstrak\s+: 10/);
  assert.match(report, /Stage 1 \(2 codes active\)/);
  assert.match(report, /RINGKASAN AI/);
  assert.match(report, /Stage 2 mendominasi/);
});

test("export filenames are filesystem safe", () => {
  assert.equal(
    buildExportFilename(metadata, "coding", "csv"),
    "Ajinomoto_Co_Inc_2022_coding.csv",
  );
  assert.equal(buildExportFilename({}, "report", "txt"), "analysis_report.txt");
});

test("company code and year are read from the filename", () => {
  assert.deepEqual(extractMetadataFromFilename("2802-T_2022_SDB.pdf"), {
    code: "2802-T",
    year: "2022",
  });
  assert.deepEqual(extractMetadataFromFilename("report-2019.pdf"), {
    code: "",
    year: "2019",
  });
  assert.deepEqual(extractMetadataFromFilename("nocode.pdf"), {
    code: "",
    year: "",
  });
});

test("model JSON survives code fences and stray prose", () => {
  const parsed = parseProfileJSON(
    'Berikut hasilnya:\n```json\n{"companyName":"Ajinomoto","country":"Japan","region":"Asia Timur","industry":"Food Products","reportName":"SDB","reportYear":2022}\n```',
  );
  assert.equal(parsed.companyName, "Ajinomoto");
  assert.equal(parsed.reportYear, "2022"); // coerced to a string for the form
  assert.equal(parseProfileJSON("tidak ada JSON di sini"), null);
});
