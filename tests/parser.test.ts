import path from "node:path";
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";

import { parse, parseSectionHeading } from "../src/parser.ts";

function loadFixture(name: string) {
  return fs.readFile(path.join(import.meta.dirname, "fixtures", name), "utf-8");
}

describe("parse", () => {
  test("highlights", async () => {
    const html = await loadFixture("highlights.html");
    const result = parse(html);

    assert.equal(result.markers.length, 3);
    assert.deepEqual(result.markers, [
      {
        type: "Highlight",
        color: "yellow",
        location: 10,
        page: undefined,
        section: "MOBY-DICK; or, THE WHALE.",
        chapter: undefined,
        text: "MOBY-DICK",
        note: undefined,
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 248,
        page: undefined,
        section: "EXTRACTS. (Supplied by a Sub-Sub-Librarian).",
        chapter: "EXTRACTS.",
        text: "I was told of a whale taken near Shetland.",
        note: "Some note.",
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 361,
        page: undefined,
        section: "CHAPTER 1. Loomings.",
        chapter: undefined,
        text: "Call me Ishmael.",
        note: "Another note.",
      },
    ]);
  });

  test("highlight colors", async () => {
    const html = await loadFixture("hightlights-color.html");
    const result = parse(html);

    assert.equal(result.markers.length, 4);
    assert.deepEqual(result.markers, [
      {
        type: "Highlight",
        color: "pink",
        location: 502,
        page: undefined,
        section: "CHAPTER 3. The Spouter-Inn.",
        chapter: undefined,
        text: "Entering that gable-ended",
        note: undefined,
      },
      {
        type: "Highlight",
        color: "blue",
        location: 502,
        page: undefined,
        section: "CHAPTER 3. The Spouter-Inn.",
        chapter: undefined,
        text: "straggling entry with old-fashioned",
        note: undefined,
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 503,
        page: undefined,
        section: "CHAPTER 3. The Spouter-Inn.",
        chapter: undefined,
        text: "some condemned old craft.",
        note: undefined,
      },
      {
        type: "Highlight",
        color: "orange",
        location: 503,
        page: undefined,
        section: "CHAPTER 3. The Spouter-Inn.",
        chapter: undefined,
        text: "thoroughly besmoked,",
        note: undefined,
      },
    ]);
  });

  test("location with pages", async () => {
    const html = await loadFixture("location-with-pages.html");
    const result = parse(html);

    assert.equal(result.markers.length, 2);
    assert.deepEqual(result.markers, [
      {
        type: "Highlight",
        color: "yellow",
        location: 154,
        page: 13,
        section: "Introduction",
        chapter: "The Pillars of Staff Engineering",
        text: "a great deal of the ambiguity is inherent to the role, and the answer is very often “it depends on the context.”",
        note: undefined,
      },
      {
        type: "Highlight",
        color: "yellow",
        location: 156,
        page: 14,
        section: "Introduction",
        chapter: "The Pillars of Staff Engineering",
        text: "I'll unpack the staff engineer role by looking at what I think of as its three pillars: big-picture thinking, execution of projects, and leveling up the engineers you work with.",
        note: undefined,
      },
    ]);
  });

  test("notes without highlights", async () => {
    const html = await loadFixture("notes-without-highlights.html");
    const result = parse(html);

    assert.equal(result.markers.length, 2);
    assert.deepEqual(result.markers, [
      {
        type: "Note",
        location: 795,
        page: undefined,
        section: "CHAPTER 5. Breakfast.",
        chapter: undefined,
        text: "Note without highlight",
      },
      {
        type: "Note",
        location: 795,
        page: undefined,
        section: "CHAPTER 5. Breakfast.",
        chapter: undefined,
        text: "Another note without highlighting",
      },
    ]);
  });

  test("bookmarks", async () => {
    const html = await loadFixture("bookmarks.html");
    const result = parse(html);

    // Should be ignored for now.
    assert.equal(result.markers.length, 0);
  });

  test("sanity check", async () => {
    const html = await loadFixture("sanity.html");
    const result = parse(html);

    assert.equal(result.title, "Moby Dick Images");
    assert.equal(result.authors, "Herman Melville");
    assert.equal(result.markers.length, 11);
  });
});

describe("section headings", () => {
  describe("highlight", () => {
    test("parse with location", async () => {
      const result = parseSectionHeading("Highlight(yellow) - Location 361");

      assert.deepEqual(result, {
        type: "Highlight",
        color: "yellow",
        location: 361,
      });
    });

    test("parse with page", async () => {
      const result = parseSectionHeading(
        "Highlight(yellow) - Page 13 · Location 154"
      );

      assert.deepEqual(result, {
        type: "Highlight",
        color: "yellow",
        location: 154,
        page: 13,
      });
    });

    test("parse with section", async () => {
      const result = parseSectionHeading(
        "Highlight(yellow) - Heading Sub Section > Location 154"
      );

      assert.deepEqual(result, {
        type: "Highlight",
        color: "yellow",
        chapter: "Heading Sub Section",
        location: 154,
      });
    });

    test("parse with page and section", async () => {
      const result = parseSectionHeading(
        "Highlight(yellow) - Heading Sub Section > Page 13 · Location 154"
      );

      assert.deepEqual(result, {
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

      assert.deepEqual(result, {
        type: "Note",
        location: 795,
      });
    });

    test("parse with page", async () => {
      const result = parseSectionHeading("Note - Page 13 · Location 154");

      assert.deepEqual(result, {
        type: "Note",
        location: 154,
        page: 13,
      });
    });

    test("parse with section", async () => {
      const result = parseSectionHeading(
        "Note - Heading Sub Section > Location 154"
      );

      assert.deepEqual(result, {
        type: "Note",
        chapter: "Heading Sub Section",
        location: 154,
      });
    });

    test("parse with page and section", async () => {
      const result = parseSectionHeading(
        "Note - Heading Sub Section > Page 13 · Location 154"
      );

      assert.deepEqual(result, {
        type: "Note",
        chapter: "Heading Sub Section",
        location: 154,
        page: 13,
      });
    });
  });
});
