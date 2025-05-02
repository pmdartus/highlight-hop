import { getTitleSlug, stringifyCsv, escapeHtml } from "./utils.ts";
import type { FormattedNotebook, FormatType, Notebook } from "./types.ts";

interface NotebookFormatter {
  /** The name of the formatter */
  name: FormatType;
  /** The content type of the formatter */
  contentType: string;
  /** The extension of the formatter */
  extension: string;
  /** Formats a notebook into a formatted notebook */
  format(notebook: Notebook): string;
}

const csvFormatter: NotebookFormatter = {
  name: "csv",
  contentType: "text/csv",
  extension: "csv",
  format(notebook) {
    const header = "Type,Location,Page,Chapter,Text,Note";
    const rows = notebook.markers.map((m) =>
      [
        stringifyCsv(m.type),
        stringifyCsv(m.location),
        stringifyCsv(m.page),
        stringifyCsv(m.section), // Using section as chapter for now
        stringifyCsv(m.text),
        stringifyCsv(m.type === "Highlight" ? m.note : ""), // Only include note for highlights
      ].join(","),
    );

    return [header, ...rows].join("\n");
  },
};

const markdownFormatter: NotebookFormatter = {
  name: "markdown",
  contentType: "text/markdown",
  extension: "md",
  format(notebook) {
    let md = `# ${notebook.title ?? "Notebook"}\n\n`;

    if (notebook.authors) {
      md += `By: _${notebook.authors}_\n\n`;
    }

    for (const marker of notebook.markers) {
      md += `### ${marker.type} (Page ${marker.page ?? "N/A"}, Location ${marker.location ?? "N/A"})${marker.section ? ` - ${marker.section}` : ""}\n\n`;

      // Add explicit line breaks to the text to ensure that the text is displayed correctly in the markdown
      md += marker.text
        .split("\n")
        .map((line) => `> ${escapeHtml(line)}`)
        .join("<br>\n");

      md += "\n\n";

      if (marker.type === "Highlight" && marker.note) {
        md += `**Note:** ${escapeHtml(marker.note)}\n\n`;
      }

      md += "----\n\n";
    }

    return md;
  },
};

const jsonFormatter: NotebookFormatter = {
  name: "json",
  contentType: "application/json",
  extension: "json",
  format(notebook) {
    return JSON.stringify(notebook, null, 2);
  },
};

const SUPPORTED_FORMATTERS = {
  csv: csvFormatter,
  markdown: markdownFormatter,
  json: jsonFormatter,
} as const;

export const SUPPORTED_FORMATS = new Set(
  Object.keys(SUPPORTED_FORMATTERS) as FormatType[],
);

/**
 * Serializes a notebook into a formatted notebook.
 */
export function formatNotebook(
  notebook: Notebook,
  options: { format: FormatType },
): FormattedNotebook {
  const { format } = options;

  const formatter = SUPPORTED_FORMATTERS[format];
  if (!formatter) {
    throw new Error(`Unsupported format: ${format}`);
  }

  const content = formatter.format(notebook);
  const filename = `${getTitleSlug(notebook)}.${formatter.extension}`;
  const contentType = formatter.contentType;

  return {
    content,
    filename,
    contentType,
  };
}
