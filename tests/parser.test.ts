import path from "node:path";
import fs from "node:fs/promises";
import { describe, test, expect } from "vitest";

import { parseNotebook, parseSectionHeading } from "../src/parser.ts";

function loadFixture(name: string) {
  return fs.readFile(
    path.join(import.meta.dirname, "__fixtures__", name),
    "utf-8",
  );
}

describe("parse", () => {
  test("highlights", async () => {
    const html = await loadFixture("highlights.html");
    const result = parseNotebook(html);

    expect(result.markers.length).toBe(3);
    expect(result.markers).toMatchObject([
      {
        type: "Highlight",
        color: "yellow",
        location: 10,
        section: "MOBY-DICK; or, THE WHALE.",
        text: "MOBY-DICK",
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 248,
        section: "EXTRACTS. (Supplied by a Sub-Sub-Librarian).",
        chapter: "EXTRACTS.",
        text: "I was told of a whale taken near Shetland.",
        note: "Some note.",
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 361,
        section: "CHAPTER 1. Loomings.",
        text: "Call me Ishmael.",
        note: "Another note.",
      },
    ]);
  });

  test("highlight colors", async () => {
    const html = await loadFixture("hightlights-color.html");
    const result = parseNotebook(html);

    expect(result.markers).toMatchObject([
      {
        type: "Highlight",
        color: "pink",
        location: 502,
      },
      {
        type: "Highlight",
        color: "blue",
        location: 502,
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 503,
      },
      {
        type: "Highlight",
        color: "orange",
        location: 503,
      },
    ]);
  });

  test("location with pages", async () => {
    const html = await loadFixture("location-with-pages.html");
    const result = parseNotebook(html);

    expect(result.markers.length).toBe(2);
    expect(result.markers).toMatchObject([
      {
        type: "Highlight",
        color: "yellow",
        location: 154,
        page: 13,
        section: "Introduction",
        chapter: expect.any(String),
        text: expect.any(String),
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 156,
        page: 14,
        section: "Introduction",
        chapter: expect.any(String),
        text: expect.any(String),
      },
    ]);
  });

  test("notes without highlights", async () => {
    const html = await loadFixture("notes-without-highlights.html");
    const result = parseNotebook(html);

    expect(result.markers.length).toBe(2);
    expect(result.markers).toMatchObject([
      {
        type: "Note",
        location: 795,
        section: expect.any(String),
        text: "Note without highlight",
      },
      {
        type: "Note",
        location: 795,
        section: expect.any(String),
        text: "Another note without highlighting",
      },
    ]);
  });

  test("bookmarks", async () => {
    const html = await loadFixture("bookmarks.html");
    const result = parseNotebook(html);

    expect(result.markers).toEqual([]);
  });

  test("sanity check", async () => {
    const html = await loadFixture("sanity.html");
    const result = parseNotebook(html);

    expect(result).toMatchSnapshot();
  });
});

describe("section headings", () => {
  describe("highlight", () => {
    test("parse with location", async () => {
      const result = parseSectionHeading("Highlight(yellow) - Location 361");

      expect(result).toEqual({
        type: "Highlight",
        color: "yellow",
        location: 361,
      });
    });

    test("parse with page", async () => {
      const result = parseSectionHeading(
        "Highlight(yellow) - Page 13 · Location 154",
      );

      expect(result).toEqual({
        type: "Highlight",
        color: "yellow",
        location: 154,
        page: 13,
      });
    });

    test("parse with section", async () => {
      const result = parseSectionHeading(
        "Highlight(yellow) - Heading Sub Section > Location 154",
      );

      expect(result).toEqual({
        type: "Highlight",
        color: "yellow",
        chapter: "Heading Sub Section",
        location: 154,
      });
    });

    test("parse with page and section", async () => {
      const result = parseSectionHeading(
        "Highlight(yellow) - Heading Sub Section > Page 13 · Location 154",
      );

      expect(result).toEqual({
        type: "Highlight",
        color: "yellow",
        chapter: "Heading Sub Section",
        location: 154,
        page: 13,
      });
    });
  });

  describe("note", () => {
    test("parse note section headings", async () => {
      const result = parseSectionHeading("Note - Location 795");

      expect(result).toEqual({
        type: "Note",
        location: 795,
      });
    });

    test("parse with page", async () => {
      const result = parseSectionHeading("Note - Page 13 · Location 154");

      expect(result).toEqual({
        type: "Note",
        location: 154,
        page: 13,
      });
    });

    test("parse with section", async () => {
      const result = parseSectionHeading(
        "Note - Heading Sub Section > Location 154",
      );

      expect(result).toEqual({
        type: "Note",
        chapter: "Heading Sub Section",
        location: 154,
      });
    });

    test("parse with page and section", async () => {
      const result = parseSectionHeading(
        "Note - Heading Sub Section > Page 13 · Location 154",
      );

      expect(result).toEqual({
        type: "Note",
        chapter: "Heading Sub Section",
        location: 154,
        page: 13,
      });
    });
  });
});
