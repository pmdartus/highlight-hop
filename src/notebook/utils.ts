import { SyntaxKind } from "html5parser";
import type { INode, ITag, IText } from "html5parser";

import type { Notebook } from "./types.ts";

/**
 * Gets the slug for the title of a notebook.
 */
export function getTitleSlug(notebook: Notebook): string {
  return (notebook.title ?? "highlights")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
}

/** Escapes a string for HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Stringifies a value for a CSV file. */
export function stringifyCsv(
  content: string | number | boolean | undefined,
): string {
  if (content === undefined) {
    return "";
  }

  const stringValue = String(content);

  if (
    stringValue.includes('"') ||
    stringValue.includes(",") ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""').replace(/\n/g, "\\n")}"`;
  }

  return stringValue;
}

/**
 * Type guard to check if a node is a tag node
 */
export function isTagNode(node: INode): node is ITag {
  return node.type === SyntaxKind.Tag;
}

/**
 * Type guard to check if a node is a text node
 */
export function isTextNode(node: INode): node is IText {
  return node.type === SyntaxKind.Text;
}

/**
 * Finds a node based on a predicate.
 * @param node - The node to search
 * @param predicate - The predicate to find the node
 * @returns The node if found, otherwise null
 */
export function findNode(
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
export function getClassName(node: INode): string | undefined {
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
export function getTextContent(node: INode): string {
  if (isTextNode(node)) {
    return node.value.trim();
  } else if (isTagNode(node) && node.body) {
    return node.body.map(getTextContent).join("").trim();
  }
  return "";
}
