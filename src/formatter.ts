import type { Notebook } from "./parser/types.ts";

export type FormatType = "csv" | "markdown" | "json";

export interface FormattedNotebook {
  content: string;
  filename: string;
  contentType: string;
}

interface NotebookFormatter {
  name: FormatType;
  format(notebook: Notebook): FormattedNotebook;
}

function getTitleSlug(notebook: Notebook): string {
  return (notebook.title ?? "highlights")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
}

const csvFormatter: NotebookFormatter = {
  name: "csv",
  format(notebook: Notebook): FormattedNotebook {
    const header = "Type,Location,Page,Chapter,Text,Note";
    const rows = notebook.markers.map((m) =>
      [
        m.type,
        m.location ?? "",
        m.page ?? "",
        `"${(m.section ?? "").replace(/"/g, '""')}"`, // Using section as chapter for now
        `"${m.text.replace(/"/g, '""')}"`, // Escape quotes
        m.type === "Highlight" ? `"${m.note?.replace(/"/g, '""') ?? ""}"` : "", // Escape quotes for note
      ].join(","),
    );

    return {
      content: [header, ...rows].join("\n"),
      filename: `${getTitleSlug(notebook)}.csv`,
      contentType: "text/csv",
    };
  },
};

const markdownFormatter: NotebookFormatter = {
  name: "markdown",
  format(notebook: Notebook): FormattedNotebook {
    let md = `# ${notebook.title ?? "Notebook"}\n\n`;
    if (notebook.authors) {
      md += `## By ${notebook.authors}\n\n`;
    }

    for (const marker of notebook.markers) {
      md += `### ${marker.type} (Page ${marker.page ?? "N/A"}, Location ${marker.location ?? "N/A"})${marker.section ? ` - ${marker.section}` : ""}\n\n`;
      md += `> ${marker.text}\n\n`;
      if (marker.type === "Highlight" && marker.note) {
        md += `**Note:** ${marker.note}\n\n`;
      }
    }

    return {
      content: md,
      filename: `${getTitleSlug(notebook)}.md`,
      contentType: "text/markdown",
    };
  },
};

const jsonFormatter: NotebookFormatter = {
  name: "json",
  format(notebook: Notebook): FormattedNotebook {
    return {
      content: JSON.stringify(notebook, null, 2),
      filename: `${getTitleSlug(notebook)}.json`,
      contentType: "application/json",
    };
  },
};

const formatters = {
  csv: csvFormatter,
  markdown: markdownFormatter,
  json: jsonFormatter,
} as const;

export const SUPPORTED_FORMATS = new Set(
  Object.keys(formatters) as FormatType[],
);

export function formatNotebook(
  notebook: Notebook,
  options: { format: FormatType },
): FormattedNotebook {
  const { format } = options;

  const formatter = formatters[format];
  if (!formatter) {
    throw new Error(`Unsupported format: ${format}`);
  }

  return formatter.format(notebook);
}
