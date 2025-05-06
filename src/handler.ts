import PostalMime, { type Email } from "postal-mime";

import type { S3Event, SQSBatchItemFailure, SQSHandler } from "aws-lambda";

import { parseNotebook } from "./notebook/parser.ts";
import { formatNotebook, SUPPORTED_FORMATS } from "./notebook/formatter.ts";
import type { FormatType } from "./notebook/types.ts";

import { S3Service } from "./services/object.ts";
import { SesService, type EmailAttachment } from "./services/email.ts";

const DOMAIN_NAME = process.env.DOMAIN_NAME;
if (!DOMAIN_NAME) {
  throw new Error("DOMAIN_NAME environment variable is not set.");
}

const objectService = new S3Service();
const emailService = new SesService();

export const handler: SQSHandler = async (event) => {
  const failedMessages: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      if (record.eventSource !== "aws:sqs") {
        console.warn(
          "Event source is not SQS, skipping record:",
          record.messageId,
        );
        continue;
      }

      const s3Event: S3Event = JSON.parse(record.body);
      if (!s3Event.Records || !Array.isArray(s3Event.Records)) {
        throw new Error(
          "SQS message body is not a valid S3 event notification.",
        );
      }

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

  const sender = email.from?.address;
  if (!sender) {
    throw new Error("Sender address (From:) not found in the email.");
  }

  const { recipient, format } = resolveRecipient(email);

  console.log(`Processing email from ${sender} to ${recipient}...`);

  const attachment = resolveAttachment(email);
  const notebook = parseNotebook(attachment);

  // Create the subject and summary of the email.
  const subject = `Re: ${email.subject ?? "Your Kindle Highlights"}`;
  const summary = `Successfully processed your Kindle highlights from "${
    notebook.title ?? "Unknown Title"
  }". Found ${
    notebook.markers.length
  } highlights/notes. The converted file is attached.`;

  // Add headers to the email to indicate that it is a reply to the original email.
  const headers = {
    "In-Reply-To": email.messageId,
    References: email.messageId,
  };

  // Format the notebook and create an attachment.
  const formattedNotebook = formatNotebook(notebook, { format });
  const generatedAttachment: EmailAttachment = {
    fileName: formattedNotebook.filename,
    contentType: formattedNotebook.contentType,
    content: formattedNotebook.content,
  };

  await emailService.sendEmail({
    from: recipient,
    to: sender,
    headers,
    subject,
    body: summary,
    attachment: generatedAttachment,
  });

  console.log(`Successfully sent email to ${sender}`);
}

function resolveRecipient(email: Email): {
  recipient: string;
  format: FormatType;
} {
  if (!email.to || email.to.length === 0) {
    throw new Error("Recipient address (To:) not found in the email.");
  }

  for (const { address: recipient } of email.to) {
    if (!recipient) {
      continue;
    }

    for (const format of SUPPORTED_FORMATS) {
      const candidate = `${format}@${DOMAIN_NAME}`;
      if (recipient === candidate) {
        return {
          recipient,
          format,
        };
      }
    }
  }

  throw new Error("No supported format requested.");
}

function resolveAttachment(email: Email): string {
  if (!email.attachments || email.attachments.length === 0) {
    throw new Error("No attachments found in the email.");
  } else if (email.attachments.length > 1) {
    console.warn(
      `Multiple attachments found (${email.attachments.length}). Processing only the first HTML attachment.`,
    );
  }

  const htmlAttachment = email.attachments.find(
    (att) => att.mimeType === "text/html",
  );

  if (!htmlAttachment) {
    throw new Error(
      "No HTML attachment found. Please ensure the email contains one attachment with Content-Type: text/html.",
    );
  }

  const { content } = htmlAttachment;
  return content instanceof ArrayBuffer
    ? new TextDecoder().decode(content)
    : content;
}
