import { parse as parseHtml } from "html5parser";
import { isTagNode, findNode, getClassName, getTextContent, isTextNode } from "./utils.ts";

interface Metadata {
  title: string | undefined;
  authors: string | undefined;
  citation: string | undefined;
}

interface BaseMarker {
  type: string;
  section: string;
  page: number | undefined;
  location: number | undefined;
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
type MarkerType = Marker["type"];

interface Notebook {
  metadata: Metadata;
  markers: Marker[];
}

/**
 * Parses an HTML document or string to extract highlights and notes.
 * @param htmlContent - The HTML content as a string
 * @returns An array of objects, each representing a highlight or note
 */
export function parse(htmlContent: string): Notebook {
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
  
  let currentSection: string | undefined;
  let currentHighlight: Highlight | undefined;
  
  const metadata: Metadata = {
    title: undefined,
    authors: undefined,
    citation: undefined,
  };
  const markers: Marker[] = [];


  // Filter out non relevant elements.
  const childrenTags = container.body.filter(isTagNode);

  for (let i = 0; i < childrenTags.length; i++) {
    const elm = childrenTags[i]!;
    const className = getClassName(elm);

    // Metadata
    if (className === "bookTitle") {
      metadata.title = getTextContent(elm);
    } else if (className === "authors") {
      metadata.authors = getTextContent(elm);
    } else if (className === "citation") {
      metadata.citation = getTextContent(elm);
    }

    if (className === "sectionHeading") {
      currentSection = getTextContent(elm);
    } else if (className === "noteHeading") {
      const content = getTextContent(elm);
      
      const sectionHeading = parseSectionHeading(content);
      if (!sectionHeading) {
        throw new Error("Could not parse section heading.");
      }

      // Ignore bookmarks.
      if (sectionHeading.type === "Bookmark") {
        continue;
      }

      const nextElm = childrenTags[i + 1];
      if (!nextElm || !isTextNode(nextElm) || getClassName(nextElm) !== "noteText") {
        throw new Error("Could not find text node after section heading.");
      } 

      if (sectionHeading.type === "Highlight" || sectionHeading.type === "Note") {
        

        const nextText = getTextContent(nextElm);
      }
    }
  }

  return {
    metadata,
    markers,
  };
}

interface SectionHeading {
  type: "Note" | "Highlight" | "Bookmark";
  color?: string;
  section?: string;
  location?: number;
  page?: number;
}

export function parseSectionHeading(content: string): SectionHeading | undefined {
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
  
  // Extract section if present
  const section = content.match(/- ([^>]+) >/)?.[1]?.trim();
  if (section) {
    result.section = section;
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
