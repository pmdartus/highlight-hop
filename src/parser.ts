import { parse as parseHtml } from "html5parser";
import { isTagNode, findNode, getClassName, getTextContent, isTextNode } from "./utils.ts";

import type { Notebook, Marker, MarkerType } from "./types.ts";

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
  
  let section: string | undefined;
  
  let title: string | undefined;
  let authors: string | undefined;
  const markers: Marker[] = [];


  // Filter out non relevant elements.
  const childrenTags = container.body.filter(isTagNode);

  for (let i = 0; i < childrenTags.length; i++) {
    const elm = childrenTags[i]!;
    const className = getClassName(elm);

    // Metadata
    if (className === "bookTitle") {
      title = getTextContent(elm);
    } else if (className === "authors") {
      authors = getTextContent(elm);
    } else if (className === "citation") {
      // Ignore citation.
    } else if (className === "sectionHeading") {
      section = getTextContent(elm);
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

      // Check for the main text node following the heading
      const mainTextNode = childrenTags[i + 1];
      if (!mainTextNode || getClassName(mainTextNode) !== "noteText") {
        // This might happen if the structure is unexpected, 
        // or potentially for bookmarks if they weren't filtered earlier.
        const foundNodeDescription = mainTextNode ? `node with class ${getClassName(mainTextNode)}` : "nothing";
        console.warn(`Expected noteText node after noteHeading, but found ${foundNodeDescription}. Skipping marker.`);
        continue; // Skip this marker
      }
      const mainText = getTextContent(mainTextNode);

      let userNoteText: string | undefined = undefined;

      // Look ahead for a user note associated with a highlight
      if (sectionHeading.type === "Highlight") {
        const nextHeadingNode = childrenTags[i + 2];
        const nextTextNode = childrenTags[i + 3];

        if (
          nextHeadingNode &&
          getClassName(nextHeadingNode) === "noteHeading" &&
          nextTextNode &&
          getClassName(nextTextNode) === "noteText"
        ) {
          const nextHeadingContent = getTextContent(nextHeadingNode);
          // Simple check: Does the next heading start with 'Note'? 
          // A more robust check might parse the full next SectionHeading
          if (nextHeadingContent.startsWith("Note")) {
            userNoteText = getTextContent(nextTextNode);
            // Skip the note heading and text elements we just processed
            i += 2; 
          }
        }
      }

      // Create the marker
      if (sectionHeading.type === "Note") {
        markers.push({
          type: "Note",
          chapter: sectionHeading.chapter,
          location: sectionHeading.location,
          page: sectionHeading.page,
          section: section,
          text: mainText, // Main text is the note content
        });
      } else if (sectionHeading.type === "Highlight") {
        markers.push({
          type: "Highlight",
          color: sectionHeading.color!, // Non-null assertion ok based on parseSectionHeading logic
          chapter: sectionHeading.chapter,
          location: sectionHeading.location,
          page: sectionHeading.page,
          section: section,
          text: mainText, // Main text is the highlighted content
          note: userNoteText, // Optional user note text found by lookahead
        });
      }
    }
  }

  return {
    title,
    authors,
    markers,
  };
}

interface SectionHeading {
  type: "Bookmark" | "Note" | "Highlight";
  chapter?: string;
  location?: number;
  page?: number;
  color?: string;
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
