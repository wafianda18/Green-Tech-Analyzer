/**
 * Pure text-segmentation helpers.
 *
 * Kept free of any pdfjs import so the segmentation rules can be unit tested
 * (and reused) without loading the PDF engine.
 *
 * The unit of analysis for this project is the PARAGRAPH (Abraham & Dao, 2019),
 * so the quality of everything downstream depends on splitting page text into
 * real paragraphs instead of page-sized blobs.
 */

export const MIN_PARAGRAPH_CHARS = 80;
export const MAX_PARAGRAPH_CHARS = 1500;
export const TARGET_CHUNK_CHARS = 900;

const BULLET_START = /^([•▪◦●○·*‣–—-]|\(?\d{1,2}[.)]|[a-z][.)])\s+/i;
const TERMINAL_PUNCTUATION = /[.!?:;]["'”’)\]]?$/;
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=["'“(\[]?[A-Z0-9])/;

/** Collapse runs of spaces/tabs but keep the newline structure intact. */
export function collapseInlineWhitespace(text) {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/**
 * Running headers, footers, page numbers and other furniture that should never
 * become part of a coded paragraph.
 */
export function isNoiseLine(line) {
  const t = line.trim();
  if (!t) return true;
  if (!/[A-Za-zÀ-ɏ]/.test(t)) return true; // digits/symbols only
  if (/^(page|hal(aman)?)\.?\s*\d+/i.test(t)) return true;
  if (/^\d{1,3}\s*[/|]\s*\d{1,3}$/.test(t)) return true; // "12 / 88"
  if (t.length <= 2) return true;
  return false;
}

/**
 * A heading is a short line that does not end like a sentence. Headings must
 * force a paragraph break, otherwise they get glued onto the paragraph that
 * follows them and pollute its keywords.
 */
export function looksLikeHeading(line) {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (TERMINAL_PUNCTUATION.test(t) && !/:$/.test(t)) return false;
  if (/:$/.test(t)) return true;
  const words = t.split(/\s+/);
  if (words.length > 10) return false;
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true; // ALL CAPS
  // Title Case: most words capitalised
  const capitalised = words.filter((w) => /^[A-Z0-9]/.test(w)).length;
  return capitalised >= Math.max(2, Math.ceil(words.length * 0.6));
}

/** Join wrapped lines, repairing words broken across a line break by a hyphen. */
function joinLines(lines) {
  let out = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!out) {
      out = line;
      continue;
    }
    if (/[‐-―-]$/.test(out) && /^[a-zß-ÿ]/.test(line)) {
      out = out.replace(/[‐-―-]$/, "") + line; // de-hyphenate
    } else {
      out += " " + line;
    }
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * Split a block that is far too long (typically a PDF that exposes no line
 * breaks at all) into sentence-aligned chunks of roughly TARGET_CHUNK_CHARS.
 */
export function splitLongBlock(text, targetChars = TARGET_CHUNK_CHARS) {
  if (text.length <= MAX_PARAGRAPH_CHARS) return [text];

  const sentences = text.split(SENTENCE_SPLIT);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= targetChars) {
      current += " " + sentence;
    } else {
      chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // A single sentence can still exceed the cap (tables, run-on text): hard wrap.
  const bounded = [];
  for (const chunk of chunks) {
    if (chunk.length <= MAX_PARAGRAPH_CHARS) {
      bounded.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length; i += targetChars) {
      bounded.push(chunk.slice(i, i + targetChars).trim());
    }
  }
  return bounded.filter(Boolean);
}

/**
 * Decide whether `line` starts a new paragraph, given the line before it.
 * `shortLineThreshold` is derived from the widest line on the page: the last
 * line of a paragraph is normally noticeably shorter than the column width.
 */
function startsNewParagraph(previousLine, line, shortLineThreshold) {
  if (!previousLine) return false;
  if (looksLikeHeading(previousLine)) return true;
  if (looksLikeHeading(line)) return true;
  if (BULLET_START.test(line)) return true;
  if (
    TERMINAL_PUNCTUATION.test(previousLine) &&
    previousLine.length < shortLineThreshold
  ) {
    return true;
  }
  return false;
}

/**
 * Split the text of one page into paragraph candidates.
 * Returns cleaned strings; filtering by length happens in the caller so that
 * callers can decide what counts as analysable.
 */
export function splitIntoParagraphs(pageText) {
  const normalised = collapseInlineWhitespace(pageText);
  if (!normalised) return [];

  const rawLines = normalised.split("\n");
  const lines = rawLines.map((l) => l.trim());

  const widest = lines.reduce((max, l) => Math.max(max, l.length), 0);
  const shortLineThreshold = Math.max(40, Math.round(widest * 0.75));

  const blocks = [];
  let buffer = [];
  let previous = "";

  for (const line of lines) {
    if (!line) {
      if (buffer.length) blocks.push(buffer);
      buffer = [];
      previous = "";
      continue;
    }
    if (isNoiseLine(line)) {
      // Furniture also terminates the current paragraph.
      if (buffer.length) blocks.push(buffer);
      buffer = [];
      previous = "";
      continue;
    }
    if (startsNewParagraph(previous, line, shortLineThreshold)) {
      if (buffer.length) blocks.push(buffer);
      buffer = [];
    }
    buffer.push(line);
    previous = line;
  }
  if (buffer.length) blocks.push(buffer);

  return blocks
    .map(joinLines)
    .filter(Boolean)
    .flatMap((block) => splitLongBlock(block));
}

/**
 * Turn extracted pages into the paragraph records the analyser consumes.
 * Repeated running headers/footers are dropped: a short line that shows up on
 * many different pages is furniture, not content.
 */
export function extractParagraphsFromPages(
  pages,
  { minChars = MIN_PARAGRAPH_CHARS } = {},
) {
  const pageList = Array.isArray(pages) ? pages : [];
  const perPage = pageList.map((page) => ({
    pageNum: page?.pageNum ?? 0,
    candidates: splitIntoParagraphs(page?.text || ""),
  }));

  const repeats = new Map();
  for (const { candidates } of perPage) {
    const seenOnThisPage = new Set();
    for (const candidate of candidates) {
      if (candidate.length > 200) continue;
      const key = candidate.toLowerCase();
      if (seenOnThisPage.has(key)) continue;
      seenOnThisPage.add(key);
      repeats.set(key, (repeats.get(key) || 0) + 1);
    }
  }
  const repeatCutoff = Math.max(3, Math.ceil(pageList.length * 0.4));

  const paragraphs = [];
  let paragraphId = 0;
  for (const { pageNum, candidates } of perPage) {
    for (const text of candidates) {
      if (text.length < minChars) continue;
      if ((repeats.get(text.toLowerCase()) || 0) >= repeatCutoff) continue;
      paragraphs.push({ id: `p_${paragraphId++}`, text, pageNum });
    }
  }
  return paragraphs;
}
