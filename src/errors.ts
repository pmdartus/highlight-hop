export class HighlightHopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class MissingAttachmentError extends HighlightHopError {
  constructor() {
    super(
      "The email doesn't contain any attachments. Please make sure to attach a Kindle notebook export to your email.",
    );
  }
}

export class UnsupportedFormatError extends HighlightHopError {
  constructor() {
    super(
      "The attachment is not a valid Kindle notebook export. Please make sure to attach a valid Kindle notebook export to your email.",
    );
  }
}
