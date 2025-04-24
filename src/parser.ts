import { parse as parseHtml } from "html5parser";
import { isTagNode, findNode, getClassName, getTextContent } from "./utils.ts";

interface BaseMarker {
  type: string;
  section: string;
  location: Location;
}

interface Location {
  page: number | null;
  location: number | null;
}

interface Highlight extends BaseMarker {
  type: "Highlight";
  color: string;
  quote: string;
}

interface Note extends BaseMarker {
  type: "Note";
  text: string;
}

type Marker = Highlight | Note;

interface BookMetadata {
  title: string | null;
  authors: string | null;
  citation: string | null;
}

interface ParsedDocument {
  metadata: BookMetadata;
  markers: Marker[];
}

/**
 * Parses an HTML document or string to extract highlights and notes.
 * @param htmlContent - The HTML content as a string
 * @returns An array of objects, each representing a highlight or note
 */
export function parse(htmlContent: string): ParsedDocument {
  const ast = parseHtml(htmlContent, {
    setAttributeMap: true,
  });

  const html = ast.find((node) => isTagNode(node) && node.name === "html");
  if (!html) {
    throw new Error('Could not find "html" element.');
  }

  const container = findNode(html, (node) => {
    return (
      isTagNode(node) &&
      node.name === "div" &&
      getClassName(node) === "bodyContainer"
    );
  });
  if (!container || !isTagNode(container) || !container.body) {
    throw new Error("Could not locate root container element.");
  }

  const metadata: BookMetadata = {
    title: null,
    authors: null,
    citation: null,
  };
  const markers: Marker[] = [];

  for (const child of container.body) {
    if (isTagNode(child) && child.name === "div") {
      const className = getClassName(child);

      if (className === "bookTitle") {
        metadata.title = getTextContent(child)!.trim();
      }
      if (className === "authors") {
        metadata.authors = getTextContent(child)!.trim();
      }
      if (className === "citation") {
        metadata.citation = getTextContent(child)!.trim();
      }

      if (className === "noteHeading") {

      }
    }
  }

  return {
    metadata,
    markers,
  };
}
