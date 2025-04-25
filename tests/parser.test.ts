import path from "node:path";
import assert from "node:assert";
import fs from "node:fs/promises";
import { describe, test } from "node:test";

import { parse, parseSectionHeading } from "../src/parser.ts";

function loadFixture(name: string) {
  return fs.readFile(path.join(import.meta.dirname, "fixtures", name), "utf-8");
}

describe.skip("parse", () => {
  test("sanity check", async () => {
    const html = await loadFixture("everything.html");
    const result = parse(html);

    assert.equal(result.metadata.title, "Moby Dick Images");
    assert.equal(result.metadata.authors, "Herman Melville");
    assert.equal(result.metadata.citation, "");
  });

  test("bookmarks should be ignored", async () => {
    const html = await loadFixture("bookmarks.html");
    const result = parse(html);

    assert.equal(result.markers.length, 0);
  });
});

describe("section headings", () => {
  describe("highlight", () => {
    test("parse with location", async () => {
      const result = parseSectionHeading(
        'Highlight(yellow) - Location 361'
      );

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
        section: "Heading Sub Section",
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
        section: "Heading Sub Section",
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
        section: "Heading Sub Section",
        location: 154,
      });
    });

    test("parse with page and section", async () => {
      const result = parseSectionHeading(
        "Note - Heading Sub Section > Page 13 · Location 154"
      );

      assert.deepEqual(result, {
        type: "Note",
        section: "Heading Sub Section",
        location: 154,
        page: 13,
      });
    });
  });
});
