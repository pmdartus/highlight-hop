import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

export interface EmailAttachment {
  fileName: string;
  contentType: string;
  content: Buffer | string;
}

export interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
  headers?: Record<string, string>;
  attachment?: EmailAttachment;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<unknown>;
}

export class SesService implements EmailService {
  private client: SESv2Client;

  constructor(client?: SESv2Client) {
    this.client = client ?? new SESv2Client();
  }

  async sendEmail(options: EmailOptions): Promise<unknown> {
    const { from, to, subject, body, attachment } = options;

    const Headers = Object.entries(options.headers ?? {}).map(
      ([key, value]) => ({
        Name: key,
        Value: value,
      }),
    );

    const Attachements = attachment
      ? [
          {
            FileName: attachment.fileName,
            ContentType: attachment.contentType,
            RawContent: Buffer.isBuffer(attachment.content)
              ? attachment.content
              : Buffer.from(attachment.content),
          },
        ]
      : undefined;
    const command = new SendEmailCommand({
      FromEmailAddress: from,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: body,
              Charset: "UTF-8",
            },
          },
          Headers: Headers,
          Attachments: Attachements,
        },
      },
    });

    return this.client.send(command);
  }
}
