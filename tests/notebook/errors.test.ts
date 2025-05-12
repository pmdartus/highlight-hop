import { describe, expect, it } from "vitest";
import { NotebookParseError } from "../../src/notebook/errors.ts";

describe("NotebookParseError", () => {
  it("should create error with the correct name", () => {
    const error = new NotebookParseError("Test error message");
    expect(error.name).toBe("NotebookParseError");
  });

  it("should create error with the provided message", () => {
    const message = "Test error message";
    const error = new NotebookParseError(message);
    expect(error.message).toBe(message);
  });

  it("should create error without offset if not provided", () => {
    const error = new NotebookParseError("Test error message");
    expect(error.offset).toBeUndefined();
  });

  it("should create error with offset if provided", () => {
    const offset = 123;
    const error = new NotebookParseError("Test error message", { offset });
    expect(error.offset).toBe(offset);
  });

  it("should be instance of Error", () => {
    const error = new NotebookParseError("Test error message");
    expect(error).toBeInstanceOf(Error);
  });
});
