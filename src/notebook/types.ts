/**
 * Base interface for all marker types containing common fields
 */
export interface BaseMarker {
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
  quote: string;
  /** Optional note associated with the highlight */
  note: string | undefined;
}

/**
 * Represents a note without an associated highlight
 */
export interface Note extends BaseMarker {
  type: "Note";
  /** The text content of the note */
  note: string;
}

/** Union type representing either a Highlight or Note */
export type Marker = Highlight | Note;
/** Type representing the possible marker types */
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

/** Supported output format types for notebook exports */
export type FormatType = "csv" | "markdown" | "json";

/**
 * Represents a formatted notebook ready for output
 */
export interface FormattedNotebook {
  /** The formatted content of the notebook */
  content: string;
  /** The filename for the output file */
  filename: string;
  /** The MIME content type for the output file */
  contentType: string;
}
