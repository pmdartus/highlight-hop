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

  async sendEmail({
    from,
    to,
    subject,
    body,
    attachment,
  }: EmailOptions): Promise<unknown> {
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
          Attachments: attachment
            ? [
                {
                  FileName: attachment.fileName,
                  ContentType: attachment.contentType,
                  RawContent: Buffer.isBuffer(attachment.content)
                    ? attachment.content
                    : Buffer.from(attachment.content),
                },
              ]
            : undefined,
        },
      },
    });

    return this.client.send(command);
  }
}
