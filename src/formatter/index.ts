import type { Notebook } from "../parser/types.ts";

export type FormatType = "csv" | "markdown" | "json";

export interface FormattedNotebook {
  content: string;
  filename: string;
  contentType: string;
}

export const SUPPORTED_FORMATS: ReadonlySet<FormatType> = new Set<FormatType>([
  "csv",
  "markdown",
  "json",
]);

function formatCsv(notebook: Notebook): string {
  // Basic CSV implementation - header + one row per marker
  const header = "Type,Location,Page,Chapter,Text,Note";
  const rows = notebook.markers.map((m) =>
    [
      m.type,
      m.location ?? "",
      m.page ?? "",
      m.section ?? "", // Using section as chapter for now
      `"${m.text.replace(/"/g, '""')}"`, // Escape quotes
      m.type === "Highlight" ? `"${m.note?.replace(/"/g, '""') ?? ""}"` : "", // Escape quotes for note
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function formatMarkdown(notebook: Notebook): string {
  // Basic Markdown implementation
  let md = `# ${notebook.title ?? "Notebook"}\n\n`;
  if (notebook.authors) {
    md += `## By ${notebook.authors}\n\n`;
  }
  notebook.markers.forEach((m) => {
    md += `### ${m.type} (Page ${m.page ?? "N/A"}, Location ${m.location ?? "N/A"})${m.section ? ` - ${m.section}` : ""}\n\n`;
    md += `> ${m.text}\n\n`;
    if (m.type === "Highlight" && m.note) {
      md += `**Note:** ${m.note}\n\n`;
    }
  });
  return md;
}

function formatJson(notebook: Notebook): string {
  return JSON.stringify(notebook, null, 2);
}

export function formatNotebook(
  notebook: Notebook,
  options: { format: FormatType },
): FormattedNotebook {
  const { format } = options;
  const titleSlug = (notebook.title ?? "highlights")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

  let content: string;
  let extension: string;
  let contentType: string;

  switch (format) {
    case "csv":
      content = formatCsv(notebook);
      extension = "csv";
      contentType = "text/csv";
      break;
    case "markdown":
      content = formatMarkdown(notebook);
      extension = "md";
      contentType = "text/markdown";
      break;
    case "json":
      content = formatJson(notebook);
      extension = "json";
      contentType = "application/json";
      break;
  }

  return {
    content,
    filename: `${titleSlug}.${extension}`,
    contentType,
  };
}
