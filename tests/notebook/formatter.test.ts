import { test, expect } from "vitest";

import { formatNotebook } from "../../src/notebook/formatter.ts";
import type { Notebook, Highlight, Note } from "../../src/notebook/types.ts";

const sampleNotebook: Notebook = {
  title: "Test Book",
  authors: "Test Author",
  markers: [
    {
      type: "Highlight",
      color: "yellow",
      location: 10,
      page: 5,
      section: "Section 1 - Basic",
      chapter: "Chapter 1",
      text: "This is a highlighted text",
      note: "This is a note",
    } satisfies Highlight,
    {
      type: "Note",
      location: 20,
      page: 10,
      section: "Section 1 - Basic",
      chapter: "Chapter 1",
      text: "This is a note only",
    } satisfies Note,
    {
      type: "Highlight",
      color: "yellow",
      location: 30,
      page: 15,
      section: "Section 2 - Edge case",
      chapter: "Chapter 2",
      text: 'With line breaks\nand "quotes"',
      note: undefined,
    } satisfies Highlight,
    {
      type: "Highlight",
      color: "yellow",
      location: 30,
      page: 15,
      section: "Section 2 - Edge case",
      chapter: "Chapter 2",
      text: "With UTF-8 characters 🚀 and HTML tags <br> and <b>bold</b>",
      note: undefined,
    } satisfies Highlight,
    {
      type: "Highlight",
      color: "yellow",
      location: 30,
      page: undefined,
      section: undefined,
      chapter: undefined,
      text: "Missing page",
      note: undefined,
    } satisfies Highlight,
    {
      type: "Highlight",
      color: "yellow",
      location: 30,
      page: 15,
      section: undefined,
      chapter: undefined,
      text: "Missing section and chapter",
      note: undefined,
    } satisfies Highlight,
  ],
};

test("CSV formatting", async () => {
  const result = formatNotebook(sampleNotebook, {
    format: "csv",
  });

  expect(result.filename).toBe("test_book.csv");
  expect(result.contentType).toBe("text/csv");
  await expect(result.content).toMatchFileSnapshot("__snapshots__/output.csv");
});

test("Markdown formatting", async () => {
  const result = formatNotebook(sampleNotebook, {
    format: "markdown",
  });

  expect(result.filename).toBe("test_book.md");
  expect(result.contentType).toBe("text/markdown");
  await expect(result.content).toMatchFileSnapshot("__snapshots__/output.md");
});

test("JSON formatting", async () => {
  const result = formatNotebook(sampleNotebook, { format: "json" });

  expect(result.filename).toBe("test_book.json");
  expect(result.contentType).toBe("application/json");
  await expect(result.content).toMatchFileSnapshot("__snapshots__/output.json");
});
