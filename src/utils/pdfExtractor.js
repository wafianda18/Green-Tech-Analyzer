import * as pdfjsLib from "pdfjs-dist";
import {
  extractParagraphsFromPages,
  splitIntoParagraphs,
} from "./textSegmenter.js";

// Resolve worker from the exact same installed pdfjs-dist package.
// Using new URL(..., import.meta.url) lets Vite bundle the worker correctly
// and avoids any CDN version mismatch.
try {
  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
} catch {
  // Last resort: run without a worker (main thread, slower but functional)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
}

const LINE_TOLERANCE = 2; // pdf units; items within this share a baseline
const PARAGRAPH_GAP_RATIO = 1.45; // vertical gap that means "new paragraph"
const INDENT_TOLERANCE = 6; // first-line indent, in pdf units

/**
 * Join the items of a single visual line, inserting a space where the
 * horizontal gap between two items implies one.
 */
function joinLineItems(items) {
  let text = "";
  let previous = null;
  for (const item of items) {
    const str = item.str;
    if (!str) continue;
    if (previous) {
      const previousEnd = previous.transform[4] + (previous.width || 0);
      const gap = item.transform[4] - previousEnd;
      const needsSpace =
        gap > 0.8 && !/\s$/.test(text) && !/^\s/.test(str);
      if (needsSpace) text += " ";
    }
    text += str;
    previous = item;
  }
  return text.replace(/[^\S\n]+/g, " ").trim();
}

/**
 * Rebuild page text with its line and paragraph structure preserved.
 *
 * pdf.js hands back positioned text runs, not paragraphs. Grouping runs by
 * baseline and then looking at the vertical gaps (and first-line indents)
 * between baselines recovers the paragraph breaks that the layout implies.
 * Falls back to the hasEOL flags if a page has no usable geometry.
 */
function buildPageText(textContent) {
  const items = (textContent?.items || []).filter(
    (item) => typeof item?.str === "string" && item.str.length > 0,
  );
  if (items.length === 0) return "";

  const positioned = items.filter(
    (item) => Array.isArray(item.transform) && item.transform.length >= 6,
  );
  if (positioned.length !== items.length) {
    return items
      .map((item) => (item.hasEOL ? item.str + "\n" : item.str + " "))
      .join("")
      .replace(/[^\S\n]+/g, " ")
      .trim();
  }

  const sorted = positioned
    .slice()
    .sort((a, b) => b.transform[5] - a.transform[5]);

  const lines = [];
  let current = null;
  for (const item of sorted) {
    const y = item.transform[5];
    if (!current || Math.abs(current.y - y) > LINE_TOLERANCE) {
      current = { y, items: [item] };
      lines.push(current);
    } else {
      current.items.push(item);
    }
  }

  const rendered = lines
    .map((line) => {
      const ordered = line.items
        .slice()
        .sort((a, b) => a.transform[4] - b.transform[4]);
      return {
        y: line.y,
        x: ordered[0].transform[4],
        text: joinLineItems(ordered),
      };
    })
    .filter((line) => line.text.length > 0);

  if (rendered.length === 0) return "";

  const gaps = [];
  for (let i = 1; i < rendered.length; i++) {
    const gap = rendered[i - 1].y - rendered[i].y;
    if (gap > 0) gaps.push(gap);
  }
  const sortedGaps = gaps.slice().sort((a, b) => a - b);
  const medianGap = sortedGaps.length
    ? sortedGaps[Math.floor(sortedGaps.length / 2)]
    : 0;

  const xs = rendered.map((line) => line.x).sort((a, b) => a - b);
  const medianX = xs[Math.floor(xs.length / 2)];

  const out = [];
  for (let i = 0; i < rendered.length; i++) {
    const line = rendered[i];
    if (i > 0) {
      const gap = rendered[i - 1].y - line.y;
      const bigGap = medianGap > 0 && gap > medianGap * PARAGRAPH_GAP_RATIO;
      const indented = line.x > medianX + INDENT_TOLERANCE;
      if (bigGap || indented) out.push("");
    }
    out.push(line.text);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function loadDocument(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    disableFontFace: true,
  });
  return loadingTask.promise;
}

/**
 * Extract page text. `maxPages` limits how far in to read, `onProgress` is
 * called as (pageNum, totalPages) so long documents can report progress
 * instead of freezing the UI silently.
 */
export async function extractPages(file, { maxPages, onProgress } = {}) {
  const pdf = await loadDocument(file);
  try {
    const limit = maxPages ? Math.min(maxPages, pdf.numPages) : pdf.numPages;
    const pages = [];
    for (let i = 1; i <= limit; i++) {
      const page = await pdf.getPage(i);
      try {
        const textContent = await page.getTextContent();
        pages.push({ pageNum: i, text: buildPageText(textContent) });
      } finally {
        page.cleanup();
      }
      onProgress?.(i, limit);
    }

    const hasText = pages.some((p) => p.text.length > 0);
    if (!hasText) {
      throw new Error(
        "PDF tidak mengandung teks yang dapat dibaca (kemungkinan hasil scan gambar)",
      );
    }
    return pages;
  } finally {
    await pdf.destroy();
  }
}

export async function extractTextFromPDF(file, options = {}) {
  return extractPages(file, options);
}

export async function extractFirstPages(file, maxPages = 3) {
  return extractPages(file, { maxPages });
}

export function extractParagraphs(pages) {
  return extractParagraphsFromPages(pages);
}

export { splitIntoParagraphs };

/**
 * Company code and year from a filename such as "2802-T_2022_SDB.pdf".
 * The old version returned the first digit run, so "2802-T" came back as
 * "2802" and the year was ignored entirely.
 */
export function extractMetadataFromFilename(filename) {
  const name = String(filename || "").replace(/\.[a-z0-9]+$/i, "");

  let code = "";
  const codeMatch = name.match(/(\d{3,})[-_ ]?([A-Za-z])?(?![A-Za-z0-9])/);
  if (codeMatch) {
    code = codeMatch[2]
      ? `${codeMatch[1]}-${codeMatch[2].toUpperCase()}`
      : codeMatch[1];
  }

  const currentYear = new Date().getFullYear();
  let year = "";
  for (const match of name.matchAll(/(19|20)\d{2}/g)) {
    const value = Number(match[0]);
    if (value >= 1990 && value <= currentYear + 1) year = match[0];
  }

  // A pure year should not double as the company code.
  if (code && code === year) code = "";

  return { code, year };
}

export function detectCompanyInfo(pages) {
  const firstPages = pages
    .slice(0, 5)
    .map((p) => p.text)
    .join(" ");

  return {
    rawText: firstPages,
  };
}
