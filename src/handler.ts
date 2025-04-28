import { Buffer } from "node:buffer";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import PostalMime, { type Email } from "postal-mime";

import type {
  S3Event,
  S3EventRecord,
  SQSBatchItemFailure,
  SQSHandler,
} from "aws-lambda";

import { parse } from "./parser/parser.ts";
import {
  formatNotebook,
  SUPPORTED_FORMATS,
  type FormatType,
} from "./formatter/index.ts";

const s3Client = new S3Client();
const sesClient = new SESv2Client();

const DOMAIN_NAME = process.env.DOMAIN_NAME;
if (!DOMAIN_NAME) {
  throw new Error("DOMAIN_NAME environment variable is not set.");
}

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
        await processS3EventRecord(s3Record);
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

async function processS3EventRecord(record: S3EventRecord) {
  if (record.eventSource !== "aws:s3") {
    console.warn(
      "Event source is not S3, skipping record:",
      record.eventSource,
    );
    return;
  }

  const bucket = record.s3.bucket.name;
  const key = record.s3.object.key;

  console.log(`Processing S3 object: s3://${bucket}/${key}`);

  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(getCommand);
  const body = await response.Body?.transformToWebStream();

  if (!body) {
    throw new Error(`No content found for S3 object: s3://${bucket}/${key}`);
  }

  const parsedEmail = await PostalMime.parse(body);
  const { sender, recipient, format, attachment } =
    getRequestDetails(parsedEmail);

  const notebook = parse(attachment);
  console.log(
    `Parsed notebook: "${notebook.title ?? "Untitled"}" with ${
      notebook.markers.length
    } highlights/notes.`,
  );

  const {
    content: formattedContent,
    filename: outputFilename,
    contentType,
  } = formatNotebook(notebook, { format });

  const subject = `Re: ${parsedEmail.subject ?? "Your Kindle Highlights"}`;
  const summary = `Successfully processed your Kindle highlights from "${
    notebook.title ?? "Unknown Title"
  }". Found ${
    notebook.markers.length
  } highlights/notes. The converted file is attached.`;

  const sendCommand = new SendEmailCommand({
    FromEmailAddress: recipient,
    Destination: {
      ToAddresses: [sender],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: summary,
            Charset: "UTF-8",
          },
        },
        Attachments: [
          {
            FileName: outputFilename,
            ContentType: contentType,
            RawContent: Buffer.from(formattedContent),
          },
        ],
      },
    },
  });

  console.log(
    `Sending formatted highlights (${outputFilename}) to ${sender}...`,
  );
  await sesClient.send(sendCommand);
  console.log(`Successfully sent email to ${sender}`);
}

interface ProcessingRequest {
  messageId: string;
  sender: string;
  recipient: string;
  format: FormatType;
  attachment: string;
}

function getRequestDetails(email: Email): ProcessingRequest {
  const { messageId } = email;

  const senderAddress = email.from?.address;
  if (!senderAddress) {
    throw new Error("Sender address (From:) not found in the email.");
  }

  const recipients = email.to;
  if (!recipients || recipients.length === 0) {
    throw new Error("Recipient address (To:) not found in the email.");
  }

  const attachment = getHtmlAttachment(email);

  for (const recipient of recipients!) {
    const recipientAddress = recipient.address;
    if (!recipientAddress) {
      continue;
    }

    for (const format of SUPPORTED_FORMATS) {
      const candidate = `${format}@${DOMAIN_NAME}`;
      if (recipientAddress === candidate) {
        return {
          messageId,
          sender: senderAddress,
          recipient: recipientAddress,
          format,
          attachment,
        };
      }
    }
  }

  throw new Error("No supported format requested.");
}

function getHtmlAttachment(email: Email): string {
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
