import { parse as parseHtml, SyntaxKind } from "html5parser";
import type { INode, ITag, IText } from "html5parser";

import type { Marker, MarkerType, Notebook } from "./types.ts";

export function parseNotebook(htmlContent: string): Notebook {
  const container = parseHtmlContent(htmlContent);
  const notebook = extractMetadataAndMarkers(container.body ?? []);
  const markers = mergeHighlightsAndNotes(notebook.markers);

  return {
    ...notebook,
    markers,
  };
}

/**
 * Parses the HTML content and returns the root container element.
 */
function parseHtmlContent(htmlContent: string): ITag {
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
  return container;
}

/**
 * Extracts metadata and all markers from the HTML content
 */
function extractMetadataAndMarkers(nodes: INode[]): Notebook {
  let title: string | undefined;
  let authors: string | undefined;
  const markers: Marker[] = [];

  let currentSection: string | undefined;
  let currentHeading: SectionHeading | undefined;

  // Filter out non relevant elements
  const elements = nodes.filter(isTagNode);
  for (const elm of elements) {
    const className = getClassName(elm);

    switch (className) {
      // Metadata
      case "notebookFor":
        // Ignore notebookFor
        break;
      case "bookTitle": {
        title = getTextContent(elm);
        break;
      }
      case "authors": {
        authors = getTextContent(elm);
        break;
      }
      case "citation": {
        // Ignore citation
        break;
      }

      case "sectionHeading": {
        currentSection = getTextContent(elm);
        break;
      }

      case "noteHeading": {
        const content = getTextContent(elm);
        const sectionHeading = parseSectionHeading(content);
        if (!sectionHeading) {
          throw new Error("Failed to parse section heading.");
        }

        // Ignore bookmarks
        if (sectionHeading.type === "Bookmark") {
          continue;
        }

        // Set current heading
        currentHeading = sectionHeading;
        break;
      }

      case "noteText": {
        if (!currentHeading) {
          throw new Error("No current heading found.");
        }

        const content = getTextContent(elm);
        const shared = {
          location: currentHeading.location,
          chapter: currentHeading.chapter,
          page: currentHeading.page,
          section: currentSection,
          text: content,
        };

        if (currentHeading.type === "Highlight") {
          markers.push({
            type: "Highlight",
            color: currentHeading.color!,
            note: undefined,
            ...shared,
          });
        } else if (currentHeading.type === "Note") {
          markers.push({
            type: "Note",
            ...shared,
          });
        }

        // Reset current heading
        currentHeading = undefined;
        break;
      }
    }
  }

  if (currentHeading) {
    throw new Error("Unclosed heading found.");
  }

  return { title, authors, markers };
}

/**
 * Post-process raw markers to merge consecutive eligible highlights and notes
 * together.
 */
function mergeHighlightsAndNotes(markers: Marker[]): Marker[] {
  return markers.reduce<Marker[]>((acc, marker) => {
    if (marker.type === "Highlight") {
      acc.push(marker);
    } else if (marker.type === "Note") {
      const lastMarker = acc.at(-1);

      // Assumption: Merge note content with the previous highlight if it
      // exists and if note is empty.
      const shouldMerge =
        lastMarker?.type === "Highlight" && lastMarker?.note === undefined;

      if (shouldMerge) {
        lastMarker.note = marker.text;
      } else {
        acc.push(marker);
      }
    }
    return acc;
  }, []);
}

interface SectionHeading {
  type: "Bookmark" | "Note" | "Highlight";
  chapter?: string;
  location?: number;
  page?: number;
  color?: string;
}

export function parseSectionHeading(
  content: string,
): SectionHeading | undefined {
  // Extract the section heading type
  const typeMatch = content.match(/^(Highlight|Note|Bookmark)/);
  if (!typeMatch) {
    return undefined;
  }

  const result: SectionHeading = {
    type: typeMatch[1] as MarkerType,
  };

  // Extract highlight color if applicable.
  if (result.type === "Highlight") {
    const colorMatch = content.match(/Highlight\((\w+)\)/);
    result.color = colorMatch?.[1];
  }

  // Extract chapter if present
  const chapterMatch = content.match(/- ([^>]+) >/);
  if (chapterMatch?.[1]) {
    result.chapter = chapterMatch[1].trim();
  }

  // Extract page if present
  const pageMatch = content.match(/Page (\d+)/);
  if (pageMatch?.[1]) {
    result.page = parseInt(pageMatch[1], 10);
  }

  // Extract location
  const locationMatch = content.match(/Location (\d+)/);
  if (locationMatch?.[1]) {
    result.location = parseInt(locationMatch[1], 10);
  }

  return result;
}

/**
 * Type guard to check if a node is a tag node
 */
function isTagNode(node: INode): node is ITag {
  return node.type === SyntaxKind.Tag;
}

/**
 * Type guard to check if a node is a text node
 */
function isTextNode(node: INode): node is IText {
  return node.type === SyntaxKind.Text;
}

/**
 * Finds a node based on a predicate.
 * @param node - The node to search
 * @param predicate - The predicate to find the node
 * @returns The node if found, otherwise null
 */
function findNode(
  node: INode,
  predicate: (node: INode) => boolean,
): INode | null {
  if (predicate(node)) {
    return node;
  }

  if (isTagNode(node) && node.body) {
    for (const child of node.body) {
      const result = findNode(child, predicate);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Gets the class name from a node.
 * @param node - The node to get the class name from
 * @returns The class name if it exists, otherwise undefined
 */
function getClassName(node: INode): string | undefined {
  if (isTagNode(node) && node.attributeMap) {
    return node.attributeMap.class?.value?.value;
  }
  return undefined;
}

/**
 * Gets the text content of a node.
 * @param node - The node to get the text content from
 * @returns The text content of the node
 */
function getTextContent(node: INode): string {
  if (isTextNode(node)) {
    return node.value.trim();
  } else if (isTagNode(node) && node.body) {
    return node.body.map(getTextContent).join("").trim();
  }
  return "";
}
