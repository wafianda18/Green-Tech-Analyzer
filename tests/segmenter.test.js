import test from "node:test";
import assert from "node:assert/strict";
import {
  splitIntoParagraphs,
  extractParagraphsFromPages,
  splitLongBlock,
  looksLikeHeading,
  isNoiseLine,
} from "../src/utils/textSegmenter.js";

test("splits a page into separate paragraphs instead of one blob", () => {
  const page = [
    "ENVIRONMENTAL INITIATIVES",
    "",
    "In fiscal 2022 we installed a new wastewater treatment plant at the",
    "Chiba factory, which reduced the chemical oxygen demand of our",
    "effluent by 32 percent.",
    "",
    "We plan to install solar panels at three sites and aim to reduce total",
    "energy consumption by 2030.",
  ].join("\n");

  const paragraphs = splitIntoParagraphs(page);
  assert.equal(paragraphs.length, 3);
  assert.equal(paragraphs[0], "ENVIRONMENTAL INITIATIVES");
  assert.match(paragraphs[1], /^In fiscal 2022 we installed/);
  assert.match(paragraphs[2], /^We plan to install solar/);
});

test("repairs words hyphenated across a line break", () => {
  const page = "The waste-\nwater treatment unit was commissioned in March.";
  assert.equal(
    splitIntoParagraphs(page)[0],
    "The wastewater treatment unit was commissioned in March.",
  );
});

test("keeps genuine hyphenated compounds intact", () => {
  const page = "We deployed low-emission vehicles across the fleet.";
  assert.equal(
    splitIntoParagraphs(page)[0],
    "We deployed low-emission vehicles across the fleet.",
  );
});

test("a heading breaks the paragraph that follows it", () => {
  const page =
    "Water Management\nWe recycled 1,200 kilolitres of process water during the year.";
  const paragraphs = splitIntoParagraphs(page);
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0], "Water Management");
});

test("identifies headings and page furniture", () => {
  assert.equal(looksLikeHeading("ENVIRONMENTAL DATA"), true);
  assert.equal(looksLikeHeading("Our Approach to Climate"), true);
  assert.equal(
    looksLikeHeading("We reduced emissions by 12% during the year."),
    false,
  );
  assert.equal(isNoiseLine("42"), true);
  assert.equal(isNoiseLine("Page 7"), true);
  assert.equal(isNoiseLine("12 / 88"), true);
  assert.equal(isNoiseLine("We installed a scrubber."), false);
});

test("chunks a run-on block at sentence boundaries", () => {
  const sentence = "We installed a new scrubber at the plant this year. ";
  const chunks = splitLongBlock(sentence.repeat(60));
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 1500, `chunk too long: ${chunk.length}`);
  }
});

test("drops running headers repeated across pages", () => {
  const header = "Ajinomoto Group Sustainability Data Book 2022 Contents";
  const pages = Array.from({ length: 6 }, (_, i) => ({
    pageNum: i + 1,
    text: `${header}\n\nWe recovered ${i + 1}00 tonnes of by-product for use as fertilizer during the reporting year at our sites.`,
  }));

  const paragraphs = extractParagraphsFromPages(pages);
  assert.equal(paragraphs.length, 6);
  for (const paragraph of paragraphs) {
    assert.ok(!paragraph.text.includes("Data Book 2022 Contents"));
  }
});

test("assigns sequential ids and keeps page numbers", () => {
  const pages = [
    {
      pageNum: 4,
      text: "We recycled 1,200 tonnes of packaging waste into new cartons during the reporting year across all plants.",
    },
  ];
  const [paragraph] = extractParagraphsFromPages(pages);
  assert.equal(paragraph.id, "p_0");
  assert.equal(paragraph.pageNum, 4);
});
