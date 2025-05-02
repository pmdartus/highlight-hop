/**
 * Base interface for all marker types containing common fields
 */
export interface BaseMarker {
  /** The type of marker ("Highlight" or "Note") */
  type: string;
  /** Optional section name where the marker appears */
  section: string | undefined;
  /** Optional chapter name where the marker appears */
  chapter: string | undefined;
  /** Optional page number where the marker appears */
  page: number | undefined;
  /** Optional location number where the marker appears */
  location: number | undefined;
}

/**
 * Represents a highlighted passage in the text.
 */
export interface Highlight extends BaseMarker {
  type: "Highlight";
  /** The color of the highlight */
  color: string;
  /** The highlighted text content */
  text: string;
  /** Optional note associated with the highlight */
  note: string | undefined;
}

/**
 * Represents a note without an associated highlight
 */
export interface Note extends BaseMarker {
  type: "Note";
  /** The text content of the note */
  text: string;
}

export type Marker = Highlight | Note;
export type MarkerType = Marker["type"];

/**
 * Represents a parsed notebook export
 */
export interface Notebook {
  /** The book title */
  title: string | undefined;
  /** The book authors */
  authors: string | undefined;
  /** Array of all markers. */
  markers: Marker[];
}

export type FormatType = "csv" | "markdown" | "json";

export interface FormattedNotebook {
  content: string;
  filename: string;
  contentType: string;
}
