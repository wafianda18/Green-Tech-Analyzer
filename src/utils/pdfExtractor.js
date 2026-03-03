import * as pdfjsLib from "pdfjs-dist";

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

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => (item.hasEOL ? item.str + " " : item.str))
      .join(" ")
      .replace(/\s{2,}/g, "  ")
      .trim();

    pages.push({ pageNum: i, text });
  }

  return pages;
}

export async function extractFirstPages(file, maxPages = 3) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const limit = Math.min(maxPages, pdf.numPages);
  const pages = [];
  for (let i = 1; i <= limit; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => (item.hasEOL ? item.str + " " : item.str))
      .join(" ")
      .replace(/\s{2,}/g, "  ")
      .trim();
    pages.push({ pageNum: i, text });
  }
  return pages;
}

export function extractParagraphs(pages) {
  const paragraphs = [];
  let paragraphId = 0;

  for (const page of pages) {
    // Split by double newlines or sentence-ending patterns
    const rawText = page.text;

    // Split on multiple spaces which usually indicate paragraph breaks in PDF extraction
    const segments = rawText
      .split(/\s{3,}|\n{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 60); // Minimum paragraph length

    for (const segment of segments) {
      paragraphs.push({
        id: `p_${paragraphId++}`,
        text: segment,
        pageNum: page.pageNum,
      });
    }
  }

  return paragraphs;
}

export function extractMetadataFromFilename(filename) {
  // Extract company code from filename (the numeric part)
  const match = filename.match(/(\d+)/);
  const code = match ? match[0] : "";
  return { code };
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
