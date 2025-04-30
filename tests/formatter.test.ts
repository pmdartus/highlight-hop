import { describe, test, expect } from "vitest";
import { formatNotebook } from "../src/formatter.ts";
import type { Notebook, Highlight, Note } from "../src/parser/types.ts";

// Sample notebook data for testing
const sampleNotebook: Notebook = {
  title: "Test Book",
  authors: "Test Author",
  markers: [
    {
      type: "Highlight",
      color: "yellow",
      location: 10,
      page: 5,
      section: "Chapter 1",
      chapter: "Chapter 1",
      text: "This is a highlighted text",
      note: "This is a note",
    } satisfies Highlight,
    {
      type: "Note",
      location: 20,
      page: 10,
      section: "Chapter 2",
      chapter: "Chapter 2",
      text: "This is a note",
    } satisfies Note,
  ],
};

describe("CSV format", () => {
  test("basic formatting", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "csv",
    });

    // Check CSV content structure
    const lines = result.content.split("\n");
    expect(lines.length).toBe(3); // Header + 2 markers

    // Check header
    expect(lines[0]).toBe("Type,Location,Page,Chapter,Text,Note");

    // Check first marker (Highlight)
    expect(lines[1]).toContain("Highlight");
    expect(lines[1]).toContain("10");
    expect(lines[1]).toContain("5");
    expect(lines[1]).toContain("Chapter 1");
    expect(lines[1]).toContain("This is a highlighted text");
    expect(lines[1]).toContain("This is a note");

    // Check second marker (Note)
    expect(lines[2]).toContain("Note");
    expect(lines[2]).toContain("20");
    expect(lines[2]).toContain("10");
    expect(lines[2]).toContain("Chapter 2");
    expect(lines[2]).toContain("This is a note");
    expect(lines[2]).toContain(""); // Empty note for Note
  });

  test("generates the correct filename", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "csv",
    });
    expect(result.filename).toBe("test_book.csv");
  });

  test("generates the correct content type", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "csv",
    });
    expect(result.contentType).toBe("text/csv");
  });

  test("missing book title", () => {
    const notebookWithoutTitle: Notebook = {
      ...sampleNotebook,
      title: undefined,
    };

    const result = formatNotebook(notebookWithoutTitle, {
      format: "csv",
    });
    expect(result.filename).toBe("highlights.csv");
  });

  test("empty markers", () => {
    const notebookWithoutMarkers: Notebook = {
      ...sampleNotebook,
      markers: [],
    };

    const result = formatNotebook(notebookWithoutMarkers, {
      format: "csv",
    });
    const lines = result.content.split("\n");

    // Should only have header
    expect(lines.length).toBe(1);
  });

  test("text with quotes", () => {
    const notebookWithQuotes: Notebook = {
      ...sampleNotebook,
      markers: [
        {
          type: "Highlight",
          color: "yellow",
          location: 10,
          page: 5,
          section: "Chapter 1",
          chapter: "Chapter 1",
          text: 'Text with "quotes"',
          note: 'Note with "quotes"',
        } satisfies Highlight,
      ],
    };

    const result = formatNotebook(notebookWithQuotes, {
      format: "csv",
    });
    const lines = result.content.split("\n");

    expect(lines[1]).toContain('Text with ""quotes""');
    expect(lines[1]).toContain('Note with ""quotes""');
  });

  test("missing location and page", () => {
    const notebookWithMissingFields: Notebook = {
      ...sampleNotebook,
      markers: [
        {
          type: "Highlight",
          color: "yellow",
          text: "Text without location and page",
          section: "Chapter 1",
          chapter: "Chapter 1",
          location: undefined,
          page: undefined,
          note: undefined,
        } satisfies Highlight,
      ],
    };

    const result = formatNotebook(notebookWithMissingFields, {
      format: "csv",
    });
    const lines = result.content.split("\n");

    expect(lines[1]).toBe(
      'Highlight,,,"Chapter 1","Text without location and page",""',
    );
  });
});

describe("Markdown format", () => {
  test("basic formatting", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "markdown",
    });

    // Check Markdown content structure
    const lines = result.content.split("\n");

    // Check title
    expect(lines[0]).toBe("# Test Book");

    // Check authors
    expect(lines[2]).toBe("## By Test Author");

    // Check first marker (Highlight)
    expect(lines[4]).toContain("### Highlight");
    expect(lines[4]).toContain("Page 5");
    expect(lines[4]).toContain("Location 10");
    expect(lines[4]).toContain("Chapter 1");

    expect(lines[6]).toContain("> This is a highlighted text");

    expect(lines[8]).toContain("**Note:** This is a note");

    // Check second marker (Note)
    expect(lines[10]).toContain("### Note");
    expect(lines[10]).toContain("Page 10");
    expect(lines[10]).toContain("Location 20");
    expect(lines[10]).toContain("Chapter 2");

    expect(lines[12]).toContain("> This is a note");
  });

  test("generates the correct filename", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "markdown",
    });
    expect(result.filename).toBe("test_book.md");
  });

  test("generates the correct content type", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "markdown",
    });
    expect(result.contentType).toBe("text/markdown");
  });

  test("missing authors", () => {
    const notebookWithoutAuthors: Notebook = {
      ...sampleNotebook,
      authors: undefined,
    };

    const result = formatNotebook(notebookWithoutAuthors, {
      format: "markdown",
    });
    const lines = result.content.split("\n");

    // Check that authors section is not present
    expect(lines.find((line) => line.includes("## By"))).toBeUndefined();
  });

  test("missing title", () => {
    const notebookWithoutTitle: Notebook = {
      ...sampleNotebook,
      title: undefined,
    };

    const result = formatNotebook(notebookWithoutTitle, {
      format: "markdown",
    });
    const lines = result.content.split("\n");

    expect(lines[0]).toBe("# Notebook");
    expect(result.filename).toBe("highlights.md");
  });

  test("highlight without note", () => {
    const notebookWithHighlightNoNote: Notebook = {
      ...sampleNotebook,
      markers: [
        {
          type: "Highlight",
          color: "yellow",
          location: 10,
          page: 5,
          section: "Chapter 1",
          chapter: "Chapter 1",
          text: "Highlight without notes",
          note: undefined,
        } satisfies Highlight,
      ],
    };

    const result = formatNotebook(notebookWithHighlightNoNote, {
      format: "markdown",
    });
    const content = result.content;

    expect(content).not.toContain("**Note:**");
  });

  test("missing location and page", () => {
    const notebookWithMissingFields: Notebook = {
      ...sampleNotebook,
      markers: [
        {
          type: "Highlight",
          color: "yellow",
          text: "Text without location and page",
          section: "Chapter 1",
          chapter: "Chapter 1",
          location: undefined,
          page: undefined,
          note: undefined,
        } satisfies Highlight,
      ],
    };

    const result = formatNotebook(notebookWithMissingFields, {
      format: "markdown",
    });
    const lines = result.content.split("\n");

    const markerLine = lines.find((line) => line.includes("### Highlight"));
    expect(markerLine).toContain("Page N/A");
    expect(markerLine).toContain("Location N/A");
  });
});

describe("JSON format", () => {
  test("basic formatting", () => {
    const result = formatNotebook(sampleNotebook, { format: "json" });

    expect(result.filename).toBe("test_book.json");
    expect(result.contentType).toBe("application/json");

    // Parse JSON content and verify structure
    const parsedContent = JSON.parse(result.content);
    expect(parsedContent).toMatchObject(sampleNotebook);
  });

  test("generates the correct filename", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "json",
    });
    expect(result.filename).toBe("test_book.json");
  });

  test("generates the correct content type", () => {
    const result = formatNotebook(sampleNotebook, {
      format: "json",
    });
    expect(result.contentType).toBe("application/json");
  });

  test("missing title and authors", () => {
    const notebookWithMissingFields: Notebook = {
      ...sampleNotebook,
      title: undefined,
      authors: undefined,
    };

    const result = formatNotebook(notebookWithMissingFields, {
      format: "json",
    });
    const parsedContent = JSON.parse(result.content);

    expect(parsedContent.title).toBeUndefined();
    expect(parsedContent.authors).toBeUndefined();
    expect(result.filename).toBe("highlights.json");
  });

  test("special characters in title", () => {
    const notebookWithSpecialChars: Notebook = {
      ...sampleNotebook,
      title: "Book: With? Special! Characters@",
    };

    const result = formatNotebook(notebookWithSpecialChars, { format: "json" });
    const parsedContent = JSON.parse(result.content);

    expect(parsedContent.title).toBe("Book: With? Special! Characters@");
    expect(result.filename).toBe("book__with__special__characters_.json");
  });

  test("empty markers array", () => {
    const notebookWithoutMarkers: Notebook = {
      ...sampleNotebook,
      markers: [],
    };

    const result = formatNotebook(notebookWithoutMarkers, { format: "json" });
    const parsedContent = JSON.parse(result.content);

    expect(parsedContent.markers).toEqual([]);
  });
});
