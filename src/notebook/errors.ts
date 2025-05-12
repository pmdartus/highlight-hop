export interface NotebookParseErrorOptions {
  offset?: number;
}

/**
 * Error thrown when the notebook cannot be parsed.
 */
export class NotebookParseError extends Error {
  /** The offset of the error in the HTML content. */
  readonly offset?: number;

  constructor(message: string, options: NotebookParseErrorOptions = {}) {
    super(message);
    this.name = "NotebookParseError";
    this.offset = options.offset;
  }
}
