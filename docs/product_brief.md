# Product Brief

## 1  Purpose

Provide an email‑based workflow that converts Kindle highlights exported from iOS⁄Android Kindle apps (HTML attachment) into user‑selected formats (CSV, Markdown, or JSON) and returns the converted file to the user.

## 2  Scope

**In scope**

- Processing a single HTML attachment containing Kindle highlights.
- Converting the highlights into one of the supported formats.
- Sending the converted file back to the original sender via email.

**Out of scope**

- Web or mobile UI.
- Long‑term data storage.
- Support plain-text export from desktop.

## 3  Functional Requirements

- **FR‑1**: The bot **shall** receive inbound emails via Amazon SES.
- **FR‑2**: The bot **shall** only process messages whose recipient address matches `<format>@bot-domain.com`, where `<format>` in `csv`, `markdown`, `json`.
- **FR‑3**: For unsupported recipient addresses the bot **shall** reject the message with SMTP 550 so the mail bounces to the sender.
- **FR‑4**: The bot **shall** extract the first HTML attachment from the email and parse Kindle highlights contained therein.
- **FR‑5**: The bot **shall** transform the extracted highlights into the requested format.
- **FR‑6**: The bot **shall** reply to the original sender within the same email thread, attaching the converted file and including a short summary (highlight count) in the email body.
- **FR‑7**: If processing fails (e.g., attachment missing, invalid HTML) the bot **shall** send a descriptive error email.

## 4  Non‑Functional Requirements

- **NFR‑1**: **Statelessness** — No component stores either the original email content or the generated output beyond what is needed for processing (< 15 min).
- **NFR‑2**: **Cost effectiveness** — Total monthly spend ≤ USD 2 at 1 000 emails/month.
- **NFR‑4**: **Security** — Use TLS in transit, SSE‑S3 at rest, and least‑privilege IAM roles.
- **NFR‑5**: **Abuse prevention** — SES receiving filters out spam, and a hard quota of ≤ 5 emails/min/IP.
- **NFR‑6**: **Reliability** — ≥ 99.5 % monthly success rate (successful replies / valid requests).
- **NFR‑7**: **Observability** — CloudWatch metrics (received, processed, failures, latency) and alarms for SLA breaches.
- **NFR‑8**: **Predictability** — All resources are managed using IaC.

## 5  High‑Level Architecture

1. **Amazon SES (Inbound)** — Receives email, applies spam/virus scan, validates local‑part. Valid messages are written to an S3 bucket.
2. **Amazon S3** — Stores the raw MIME object (lifecycle rule: delete after 1 hour).
3. **Amazon SQS – email processing queue** — S3 Event Notification pushes an object‑created event to the queue.
4. **AWS Lambda – processor highlight function** — Triggered by SQS; steps:
   1. Download raw MIME from S3.
   2. Validate recipient.
   3. Extract + parse HTML highlights.
   4. Generate output file and send reply via SES `SendRawEmail`.

## 6  Sequence (Happy Path)

```
User → SES → S3 → SQS → Lambda → SES → User
```

## 7  Error Handling & Edge Cases

- **Unknown format address** → SMTP 550 bounce.
- **Missing attachment** → Error email with usage instructions.
- **HTML > 10 MB** → Reject within SES with explanatory bounce.
- **Parsing error** → Error email; logs retained in CloudWatch and failed attachement preserved in S3.
