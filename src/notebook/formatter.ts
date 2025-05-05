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

const CSV_COLUMNS = [
  "Type",
  "Location",
  "Page",
  "Section",
  "Chapter",
  "Quote",
  "Color",
  "Note",
];

const csvFormatter: NotebookFormatter = {
  name: "csv",
  contentType: "text/csv",
  extension: "csv",
  format(notebook) {
    const header = CSV_COLUMNS.join(",");
    const rows = notebook.markers.map((marker) => {
      const { type } = marker;
      return [
        type,
        stringifyCsv(marker.location),
        stringifyCsv(marker.page),
        stringifyCsv(marker.section),
        stringifyCsv(marker.chapter),
        type === "Highlight" ? stringifyCsv(marker.quote) : "",
        type === "Highlight" ? stringifyCsv(marker.color) : "",
        stringifyCsv(marker.note),
      ].join(",");
    });

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

    let currentSection: string | undefined;

    for (const marker of notebook.markers) {
      // Add a new section if the marker is in a different section than the previous marker
      if (marker.section && marker.section !== currentSection) {
        currentSection = marker.section;
        md += `## ${currentSection}\n\n`;
      }

      // Add the marker heading
      let markerHeading = `### ${marker.type}`;

      const locationDetails = [];
      if (marker.page) {
        locationDetails.push(`Page ${marker.page}`);
      }
      if (marker.location) {
        locationDetails.push(`Location ${marker.location}`);
      }

      if (locationDetails.length > 0) {
        markerHeading += ` (${locationDetails.join(", ")})`;
      }

      if (marker.chapter) {
        markerHeading += ` - ${marker.chapter}`;
      }

      md += `${markerHeading}\n\n`;

      // Add the marker quote if it's a highlight. We add explicit line breaks to
      // the text to ensure that the text is displayed correctly in the markdown.
      if (marker.type === "Highlight") {
        md += marker.quote
          .split("\n")
          .map((line) => `> ${escapeHtml(line)}`)
          .join("<br>\n");
        md += "\n\n";
      }

      // Add the marker note if it exists.
      if (marker.note) {
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
