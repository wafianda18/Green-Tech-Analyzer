import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeParagraphs,
  buildStageSummary,
  detectReportName,
  detectYear,
  matchesKeyword,
  scoreCode,
} from "../src/utils/analyzer.js";
import { ALL_CODES } from "../src/data/codebook.js";

const paragraph = (text, pageNum = 1, id = "p_0") => ({ id, text, pageNum });

const codeById = (id) => ALL_CODES.find((c) => c.id === id);

test("keyword matching respects word boundaries", () => {
  // These substring matches used to code unrelated paragraphs.
  assert.equal(matchesKeyword("the minutes were recorded", "rec"), false);
  assert.equal(matchesKeyword("a good year for the group", "go"), false);
  assert.equal(matchesKeyword("especially in Europe", "esp"), false);
  assert.equal(matchesKeyword("we are recycling waste", "recycling"), true);
  assert.equal(matchesKeyword("REC certificates purchased", "rec"), true);
});

test("phrase keywords tolerate hyphen and spacing variants", () => {
  assert.equal(matchesKeyword("our eco-design programme", "eco design"), true);
  assert.equal(matchesKeyword("wastewater  treatment plant", "wastewater treatment"), true);
  assert.equal(matchesKeyword("life cycle assessment", "life cycle assessment"), true);
});

test("an unrelated governance paragraph is not coded", () => {
  const result = analyzeParagraphs([
    paragraph(
      "The board of directors approved the annual dividend policy, and the results were recorded in the general shareholders meeting held in Tokyo with good attendance from investors.",
    ),
  ]);
  assert.equal(result.codedParagraphs.length, 0);
});

test("a real action paragraph is coded to the right code", () => {
  const result = analyzeParagraphs([
    paragraph(
      "In fiscal 2022 we installed a wastewater treatment plant at the Chiba factory, which reduced chemical oxygen demand in our effluent by 32 percent compared with the previous year.",
    ),
  ]);
  assert.equal(result.codedParagraphs.length, 1);
  const codes = result.codedParagraphs[0].codes.map((c) => c.codeId);
  assert.ok(codes.includes("1_end_of_pipe"), `got ${codes.join(",")}`);
  assert.equal(result.negativeCase.length, 0);
});

test("intent-only paragraphs become negative cases", () => {
  const result = analyzeParagraphs([
    paragraph(
      "We plan to install solar panels at three of our factories and we aim to reduce energy consumption significantly by the year 2030 as part of our long-term roadmap.",
    ),
  ]);
  assert.equal(result.codedParagraphs.length, 0);
  assert.equal(result.negativeCase.length, 1);
  assert.equal(result.negativeCase[0].type, "intent_only");
});

test("one negative case is recorded per paragraph, not per code", () => {
  const result = analyzeParagraphs([
    paragraph(
      "We will install solar panels, plan to recycle more packaging waste and intend to conduct a life cycle assessment of our products in the coming years.",
    ),
  ]);
  assert.equal(result.negativeCase.length, 1);
  assert.ok(result.negativeCase[0].codes.length >= 2);
});

test("an action that also states a target is still coded", () => {
  const result = analyzeParagraphs([
    paragraph(
      "During 2022 we reduced energy consumption at the Kawasaki plant by 12 percent through process optimization, and we aim to double that reduction by 2030.",
    ),
  ]);
  assert.equal(result.codedParagraphs.length, 1);
  assert.equal(result.negativeCase.length, 0);
});

test("a lone generic keyword without evidence of action is not coded", () => {
  const evaluation = scoreCode(
    paragraph(
      "Employees are encouraged to reuse office supplies and to keep a tidy workplace in every regional office worldwide.",
    ),
    codeById("2_recycling"),
  );
  assert.deepEqual(evaluation.matched, ["reuse"]);
  assert.equal(evaluation.qualifies, false);
  assert.match(evaluation.reason, /generic keyword/);
});

test("a specific term stands on its own for present-tense statements", () => {
  // "operates" is not in the past-tense action verb list, so this paragraph is
  // only coded because "wastewater treatment" is precise enough by itself.
  const evaluation = scoreCode(
    paragraph(
      "The Chiba plant operates a wastewater treatment facility that serves the entire production site and its laboratories.",
    ),
    codeById("1_end_of_pipe"),
  );
  assert.deepEqual(evaluation.matched, ["wastewater treatment"]);
  assert.equal(evaluation.qualifies, true);
});

test("table of contents and short fragments are skipped", () => {
  const result = analyzeParagraphs([
    paragraph(
      "Table of contents ..... 3 Environmental data ..... 12 Recycling performance ..... 24 Governance ..... 31",
    ),
    paragraph("We recycled waste.", 2, "p_1"),
  ]);
  assert.equal(result.codedParagraphs.length, 0);
  assert.equal(result.stats.paragraphsSkipped, 2);
});

test("stats account for every paragraph", () => {
  const result = analyzeParagraphs([
    paragraph(
      "In fiscal 2022 we recycled 4,500 tonnes of by-product into fertilizer, recovering material that had previously been sent to landfill sites.",
    ),
    paragraph("Too short", 2, "p_1"),
  ]);
  assert.equal(result.stats.paragraphsTotal, 2);
  assert.equal(result.stats.paragraphsAnalyzed, 1);
  assert.equal(result.stats.paragraphsSkipped, 1);
});

test("additional codes are reported as newly emerging codes", () => {
  const result = analyzeParagraphs([
    paragraph(
      "We installed solar panels with a capacity of 2,400 MWh across four plants and switched the remaining supply to renewable energy contracts.",
    ),
  ]);
  const renewable = result.newCodes.find((c) => c.code === "Renewable Energy");
  assert.ok(renewable, "expected a Renewable Energy new code entry");
  assert.equal(renewable.count, 1);
});

test("buildStageSummary totals each stage and bucket for unstaged codes", () => {
  const result = analyzeParagraphs([
    paragraph(
      "In fiscal 2022 we installed a wastewater treatment plant at the Chiba factory, which reduced chemical oxygen demand in our effluent by 32 percent.",
    ),
  ]);
  const stages = buildStageSummary(result.codeSummary);
  assert.equal(stages[1].total, 1);
  assert.equal(stages[1].count, 1);
  assert.equal(stages[4].total, 0);
  assert.ok(Array.isArray(stages.null.codes));
});

test("detectYear prefers the reporting year over stray dates", () => {
  const pages = [
    {
      pageNum: 1,
      text: "Founded in 1909. Head office established 1925.\nSustainability Report 2022\nFiscal 2022 highlights",
    },
  ];
  assert.equal(detectYear(pages), "2022");
});

test("detectYear falls back to the current year when none is present", () => {
  assert.equal(detectYear([{ pageNum: 1, text: "No dates here" }]), String(new Date().getFullYear()));
});

test("detectReportName returns the title line, not a wall of cover text", () => {
  const pages = [
    {
      pageNum: 1,
      text: "Ajinomoto Co., Inc.\nSustainability Data Book 2022\nFor the year ended March 31, 2022\nThis report covers the activities of the group.",
    },
  ];
  const name = detectReportName(pages);
  assert.equal(name, "Sustainability Data Book 2022");
  assert.ok(name.length <= 80);
});
