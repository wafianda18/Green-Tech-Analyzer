import { ALL_CODES, ADDITIONAL_CODES } from "../data/codebook.js";

const EXCLUDE_SECTIONS = [
  "table of contents",
  "contents",
  "index",
  "appendix",
  "references",
  "bibliography",
  "glossary",
  "daftar isi",
  "daftar pustaka",
  "gri index",
  "gri content index",
  "sasb",
  "data summary",
];

const INTENT_PATTERNS = [
  /\b(plans? to|will|intends? to|aims? to|going to|expects? to|hopes? to|targets? to|goals? to|commits? to|strives? to|seeks? to)\b/i,
  /\b(by \d{4}|in the future|next year|upcoming|future initiatives?)\b/i,
  /\b(we are considering|we are exploring|we are evaluating|we are assessing|under consideration|under review)\b/i,
];

const ACTION_VERB_PATTERNS =
  /\b(installed|implemented|reduced|replaced|recycled|reused|recovered|certified|achieved|deployed|adopted|operated|launched|introduced|established|obtained|conducted|performed|completed|delivered|produced|generated|converted|eliminated|substituted|redesigned|developed|created|built|initiated|began|started|maintained|organized|switched|upgraded|installed|commissioned|expanded|replaced|verified|audited|trained|published|disclosed|measured|monitored)\b/i;

/**
 * Quantified outcomes ("cut emissions by 32%", "1,200 MWh of solar") are the
 * strongest evidence that a paragraph reports a real action rather than a plan.
 */
const QUANTITATIVE_EVIDENCE =
  /(\d[\d.,]*\s*(%|percent|persen|kwh|mwh|gwh|gj|tj|kg|tons?|tonnes?|t-?co2e?|co2e|m3|m³|liters?|litres?|kl|units?|sites?|plants?|facilities|factories|vehicles?)\b)|(\b(19|20)\d{2}\b.{0,40}\b(compared|versus|vs\.?|from)\b)/i;

/** Keyword is precise enough to stand on its own without a supporting verb. */
function isSpecificKeyword(keyword) {
  return /\s/.test(keyword) || keyword.replace(/[^a-z0-9]/gi, "").length >= 8;
}

const keywordPatternCache = new Map();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a whole-word matcher for a keyword or phrase.
 *
 * The previous implementation used `text.includes(keyword)`, which matched
 * "rec" inside "recorded", "go" inside "good" and "esp" inside "especially" —
 * enough to code an unrelated paragraph as Renewable Energy. Anchoring on word
 * boundaries and allowing flexible space/hyphen separators inside phrases fixes
 * that while still matching "eco friendly" for "eco-friendly".
 */
export function keywordPattern(keyword) {
  const key = keyword.toLowerCase();
  let pattern = keywordPatternCache.get(key);
  if (!pattern) {
    const body = key
      .trim()
      .split(/[\s\-‐-―]+/)
      .filter(Boolean)
      .map(escapeRegExp)
      .join("[\\s\\-‐-―]+");
    pattern = new RegExp(`(?:^|[^a-z0-9])${body}(?![a-z0-9])`, "i");
    keywordPatternCache.set(key, pattern);
  }
  return pattern;
}

export function matchesKeyword(text, keyword) {
  return keywordPattern(keyword).test(text);
}

function matchKeywords(text, keywords = []) {
  const matched = [];
  for (const keyword of keywords) {
    if (matchesKeyword(text, keyword)) matched.push(keyword);
  }
  return matched;
}

function isInExcludedSection(text) {
  const opening = text.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
  return EXCLUDE_SECTIONS.some((section) => opening.includes(section));
}

export function hasIntentOnly(text) {
  return INTENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasActionVerb(text) {
  return ACTION_VERB_PATTERNS.test(text);
}

export function hasQuantitativeEvidence(text) {
  return QUANTITATIVE_EVIDENCE.test(text);
}

/**
 * Score one paragraph against one code.
 *
 * Unlike the previous version, the intent/action decision is carried on
 * explicit flags. The old code subtracted 50 from the score, clamped it at 0
 * and then only acted when `score > 0`, so an intent-only paragraph could never
 * be recorded as a negative case unless it matched six or more keywords.
 */
export function scoreCode(paragraph, codeEntry) {
  const text = paragraph.text;

  const matched = matchKeywords(text, codeEntry.keywords || []);
  if (matched.length === 0) {
    return {
      score: 0,
      matched: [],
      hasAction: false,
      isIntent: false,
      qualifies: false,
      reason: "no keywords",
    };
  }

  const codeActionVerbs = matchKeywords(text, codeEntry.actionVerbs || []);
  const hasAction = codeActionVerbs.length > 0 || hasActionVerb(text);
  const hasEvidence = hasQuantitativeEvidence(text);
  const excluded = matchKeywords(text, codeEntry.excludePatterns || []);
  const intentLanguage = hasIntentOnly(text) || excluded.length > 0;

  // Intent language only turns a paragraph into a negative case when the
  // paragraph reports no action at all. "We cut energy use by 12% and aim to
  // halve it by 2030" is a real action that also mentions a target.
  const isIntent = intentLanguage && !hasAction;

  let score = matched.length * 10;
  if (hasAction) score += 20;
  if (codeActionVerbs.length > 0) score += 10;
  if (hasEvidence) score += 10;

  // Decision rule: a lone generic keyword is not enough. It must either be a
  // specific term, be corroborated by another keyword, or come with evidence
  // of an actual action.
  const qualifies =
    !isIntent &&
    (matched.length >= 2 ||
      isSpecificKeyword(matched[0]) ||
      hasAction ||
      hasEvidence);

  let reason = null;
  if (isIntent) {
    reason =
      excluded.length > 0
        ? `intent/plan only — matched exclusion "${excluded[0]}"`
        : "intent/plan only — no actual action";
  } else if (!qualifies) {
    reason = `only a generic keyword match ("${matched[0]}") without evidence of action`;
  }

  return {
    score,
    matched,
    codeActionVerbs,
    hasAction,
    hasEvidence,
    isIntent,
    qualifies,
    reason,
  };
}

export function analyzeParagraphs(paragraphs) {
  const results = {
    codedParagraphs: [],
    uncoded: [],
    negativeCase: [],
    codeSummary: {},
    newCodes: [],
    stats: {
      paragraphsTotal: Array.isArray(paragraphs) ? paragraphs.length : 0,
      paragraphsAnalyzed: 0,
      paragraphsSkipped: 0,
    },
  };

  for (const code of ALL_CODES) {
    results.codeSummary[code.id] = {
      code: code.code,
      stage: code.stage,
      count: 0,
      paragraphs: [],
    };
  }

  const newCodeTracker = {};

  for (const paragraph of paragraphs || []) {
    const text = paragraph?.text || "";

    // Skip front/back matter, headers and table-of-contents style lines.
    if (
      text.length < 80 ||
      isInExcludedSection(text) ||
      (text.match(/\.{3,}/g) || []).length > 3
    ) {
      results.stats.paragraphsSkipped++;
      continue;
    }
    results.stats.paragraphsAnalyzed++;

    const assignedCodes = [];
    const intentMatches = [];
    const notCodedReasons = [];

    for (const codeEntry of ALL_CODES) {
      const evaluation = scoreCode(paragraph, codeEntry);
      if (evaluation.matched.length === 0) continue;

      if (evaluation.isIntent) {
        intentMatches.push({ codeEntry, evaluation });
        notCodedReasons.push({
          code: codeEntry.code,
          reason: `Intent/rencana saja — tidak ada tindakan nyata pada tahun laporan (kata kunci: ${evaluation.matched
            .slice(0, 2)
            .join(", ")})`,
        });
        continue;
      }

      if (!evaluation.qualifies) {
        notCodedReasons.push({
          code: codeEntry.code,
          reason: `Kata kunci umum "${evaluation.matched[0]}" tanpa bukti tindakan nyata`,
        });
        continue;
      }

      assignedCodes.push({
        codeId: codeEntry.id,
        code: codeEntry.code,
        stage: codeEntry.stage,
        score: evaluation.score,
        matched: evaluation.matched,
        hasAction: evaluation.hasAction,
        hasEvidence: evaluation.hasEvidence,
      });

      if (ADDITIONAL_CODES.some((c) => c.id === codeEntry.id)) {
        if (!newCodeTracker[codeEntry.id]) newCodeTracker[codeEntry.id] = [];
        newCodeTracker[codeEntry.id].push(paragraph);
      }
    }

    if (assignedCodes.length > 0) {
      assignedCodes.sort((a, b) => b.score - a.score);
      results.codedParagraphs.push({
        ...paragraph,
        codes: assignedCodes,
        note: "",
      });

      for (const assigned of assignedCodes) {
        const summary = results.codeSummary[assigned.codeId];
        if (summary) {
          summary.count++;
          summary.paragraphs.push(paragraph.id);
        }
      }
      continue;
    }

    // One negative case per paragraph, attributed to its strongest code, so
    // the count reads as "paragraphs that state intent without action".
    if (intentMatches.length > 0) {
      intentMatches.sort((a, b) => b.evaluation.score - a.evaluation.score);
      const best = intentMatches[0];
      results.negativeCase.push({
        paragraphId: paragraph.id,
        text: paragraph.text,
        pageNum: paragraph.pageNum,
        code: best.codeEntry.code,
        codes: intentMatches.map((m) => m.codeEntry.code),
        matched: best.evaluation.matched,
        reason:
          best.evaluation.reason ||
          "Intent/plan stated but no actual action in report year",
        type: "intent_only",
      });
      continue;
    }

    const lowerText = text.toLowerCase();
    const envKeywords = [
      "environment",
      "sustainability",
      "csr",
      "green",
      "carbon",
      "emission",
      "climate",
      "eco",
    ];
    const hasEnvKeyword = envKeywords.some((k) => matchesKeyword(lowerText, k));

    if (hasEnvKeyword && text.length > 100) {
      if (notCodedReasons.length === 0) {
        let reason = "Tidak memenuhi kriteria tindakan nyata";
        if (hasIntentOnly(text)) {
          reason =
            "Hanya berupa pernyataan komitmen, rencana, atau niat — bukan tindakan nyata";
        } else if (
          matchesKeyword(lowerText, "csr") ||
          matchesKeyword(lowerText, "stakeholder") ||
          matchesKeyword(lowerText, "survey")
        ) {
          reason =
            "CSR governance/stakeholder engagement — bukan tindakan teknologi hijau";
        } else if (
          matchesKeyword(lowerText, "strategy") ||
          matchesKeyword(lowerText, "vision") ||
          matchesKeyword(lowerText, "goal")
        ) {
          reason =
            "Pernyataan strategi/visi/tujuan — bukan implementasi aktual";
        }
        notCodedReasons.push({ reason });
      }

      results.uncoded.push({
        ...paragraph,
        notCodedReasons,
        hasEnvKeyword: true,
      });
    }
  }

  for (const [codeId, paragraphList] of Object.entries(newCodeTracker)) {
    const codeEntry = ADDITIONAL_CODES.find((c) => c.id === codeId);
    if (!codeEntry) continue;
    results.newCodes.push({
      code: codeEntry.code,
      count: paragraphList.length,
      paragraphs: paragraphList,
    });
  }

  return results;
}

export function buildStageSummary(codeSummary) {
  const stages = {
    1: { codes: [], total: 0, count: 0 },
    2: { codes: [], total: 0, count: 0 },
    3: { codes: [], total: 0, count: 0 },
    4: { codes: [], total: 0, count: 0 },
    null: { codes: [], total: 0, count: 0 },
  };

  for (const [id, data] of Object.entries(codeSummary || {})) {
    const key = data.stage ?? "null";
    if (stages[key] === undefined) continue;
    stages[key].codes.push({ id, ...data });
    stages[key].total += data.count;
    if (data.count > 0) stages[key].count++;
  }

  return stages;
}

/**
 * Report title from the cover pages.
 *
 * The previous version returned the first 500 characters of pages 1-2 verbatim,
 * which put a wall of cover text into the "Nama Laporan" field.
 */
export function detectReportName(pages) {
  const lines = (pages || [])
    .slice(0, 3)
    .flatMap((page) => String(page?.text || "").split("\n"))
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .filter((line) => line.length >= 4 && line.length <= 90);

  const titlePattern =
    /\b(sustainability|esg|environmental|integrated|annual|csr|corporate responsibility|green)\b[^\n]{0,45}\b(report|data\s?book|review|disclosure)\b/i;

  for (const line of lines) {
    if (titlePattern.test(line)) return line.slice(0, 80);
  }
  for (const line of lines) {
    if (/\b(report|data\s?book)\b/i.test(line)) return line.slice(0, 80);
  }
  return lines[0] ? lines[0].slice(0, 80) : "";
}

/**
 * Reporting year from the cover pages.
 *
 * Picks the most frequently mentioned plausible year rather than the first
 * four-digit number on the page, which was often a copyright or address.
 */
export function detectYear(pages) {
  const text = (pages || [])
    .slice(0, 5)
    .map((p) => p?.text || "")
    .join(" ");
  const currentYear = new Date().getFullYear();

  const counts = new Map();
  for (const match of text.matchAll(/\b(19|20)\d{2}\b/g)) {
    const year = Number(match[0]);
    if (year < 2000 || year > currentYear + 1) continue;
    counts.set(year, (counts.get(year) || 0) + 1);
  }

  // A year attached to report wording is a stronger signal than a bare mention.
  for (const match of text.matchAll(
    /\b(report|fiscal|fy|year ended|laporan|tahun)\b[^.\n]{0,20}\b((19|20)\d{2})\b/gi,
  )) {
    const year = Number(match[2]);
    if (year < 2000 || year > currentYear + 1) continue;
    counts.set(year, (counts.get(year) || 0) + 3);
  }

  if (counts.size === 0) return String(currentYear);

  let best = null;
  for (const [year, count] of counts) {
    if (!best || count > best.count || (count === best.count && year > best.year)) {
      best = { year, count };
    }
  }
  return String(best.year);
}
