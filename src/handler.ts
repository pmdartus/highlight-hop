import PostalMime, { type Email } from "postal-mime";

import type { S3Event, SQSBatchItemFailure, SQSHandler } from "aws-lambda";

import {
  parseNotebook,
  formatNotebook,
  type FormatType,
} from "./notebook/index.ts";

import { S3Service } from "./services/object.ts";
import { SesService, type EmailAttachment } from "./services/email.ts";
import {
  HighlightHopError,
  MissingAttachmentError,
  UnsupportedFormatError,
} from "./errors.ts";

const DOMAIN_NAME = process.env.DOMAIN_NAME;
if (!DOMAIN_NAME) {
  throw new Error("DOMAIN_NAME environment variable is not set.");
}

const objectService = new S3Service();
const emailService = new SesService();

export const handler: SQSHandler = async (event) => {
  const failedMessages: SQSBatchItemFailure[] = [];

  console.log(`Received SQS event with ${event.Records.length} records.`);

  for (const record of event.Records) {
    try {
      if (record.eventSource !== "aws:sqs") {
        console.warn(
          "Event source is not SQS, skipping record:",
          record.messageId,
        );
        continue;
      }

      console.log(`Processing SQS record: ${record.body}`);

      const s3Event: S3Event = JSON.parse(record.body);
      if (!s3Event.Records || !Array.isArray(s3Event.Records)) {
        throw new Error(
          "SQS message body is not a valid S3 event notification.",
        );
      }

      console.log(`Processing ${s3Event.Records.length} S3 records.`);

      for (const s3Record of s3Event.Records) {
        if (s3Record.eventSource !== "aws:s3") {
          throw new Error(`Event source is not S3.`);
        }

        const { bucket, object } = s3Record.s3;

        try {
          const body = await objectService.getObject(bucket.name, object.key);
          await handleEmail(body);
        } finally {
          await objectService.deleteObject(bucket.name, object.key);
        }
      }
    } catch (error) {
      console.error(`Error processing message ID ${record.messageId}:`, error);
      failedMessages.push({ itemIdentifier: record.messageId });
    }
  }

  return {
    batchItemFailures: failedMessages,
  };
};

async function handleEmail(content: Uint8Array) {
  const email = await PostalMime.parse(content);

  console.log(
    `Processing email from ${email.from.address} with subject: ${email.subject}`,
  );
  console.log(`Email headers: ${JSON.stringify(email.headers)}`);

  try {
    const format = email.headers.find((header) => header.key === "x-format")
      ?.value as FormatType;
    if (!format) {
      throw new Error("Format header not found in the email.");
    }

    const rawNotebook = getAttachedNotebook(email);
    const notebook = parseNotebook(rawNotebook);
    const formattedNotebook = formatNotebook(notebook, { format });

    const summary = `Successfully processed your Kindle highlights from "${
      notebook.title ?? "Unknown Title"
    }". Found ${
      notebook.markers.length
    } highlights/notes. You can find the converted ${format} file attached.`;

    await sendReplyEmail(email, {
      body: summary,
      attachment: {
        fileName: formattedNotebook.filename,
        contentType: formattedNotebook.contentType,
        content: formattedNotebook.content,
      },
    });
  } catch (error) {
    let isUnexpectedError: boolean;
    let messageBody: string;

    if (error instanceof HighlightHopError) {
      isUnexpectedError = false;
      messageBody = `Highlight Hop failed to process your email:\n${error.message}`;
    } else {
      isUnexpectedError = true;
      messageBody = `Highlight Hop failed to process your email:\nAn unexpected error occurred. Please try again later.`;
    }

    console.error(`An error occurred while processing your email:`, error);

    await sendReplyEmail(email, {
      body: messageBody,
    });

    if (isUnexpectedError) {
      throw error;
    }
  }
}

function getAttachedNotebook(email: Email): string {
  if (!email.attachments || email.attachments.length === 0) {
    throw new MissingAttachmentError();
  } else if (email.attachments.length > 1) {
    console.warn(
      `Multiple attachments found (${email.attachments.length}). Processing only the first HTML attachment.`,
    );
  }

  const htmlAttachment = email.attachments.find(
    (att) => att.mimeType === "text/html",
  );

  if (!htmlAttachment) {
    throw new UnsupportedFormatError();
  }

  const { content } = htmlAttachment;
  return content instanceof ArrayBuffer
    ? new TextDecoder().decode(content)
    : content;
}

async function sendReplyEmail(
  email: Email,
  config: {
    body: string;
    subject?: string;
    attachment?: EmailAttachment;
  },
) {
  const { body, attachment } = config;
  const subject = `Re: ${email.subject ?? config.subject ?? ""}`;

  // Add headers to the email to indicate that it is a reply to the original email.
  const headers = {
    "In-Reply-To": email.messageId,
    References: email.messageId,
  };

  await emailService.sendEmail({
    from: `no-reply@${DOMAIN_NAME}`,
    to: email.from.address!,
    headers,
    subject,
    body,
    attachment,
  });
}
