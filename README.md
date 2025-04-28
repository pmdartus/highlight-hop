# Highlight Hop

A service that converts Kindle highlights from HTML to various formats (CSV, Markdown, JSON).

## Overview

Highlight Hop is an email-based workflow that converts Kindle highlights exported from iOS/Android Kindle apps (HTML attachment) into user-selected formats and returns the converted file to the user.

**How It Works:**

1. Send an email with a Kindle highlights HTML attachment to one of the following addresses:

   - `csv@<domain-name>` - Convert to CSV format
   - `markdown@<domain-name>` - Convert to Markdown format
   - `json@<domain-name>` - Convert to JSON format

2. The service processes the email, extracts the highlights, and converts them to the requested format.

3. The converted file is sent back to you as an email attachment.

**Architecture:**

It uses a serverless architecture deployed on AWS. The service uses the following AWS components:

- _Amazon SES_ - Receives emails and sends responses
- _Amazon S3_ - Stores raw email attachments temporarily
- _Amazon SQS_ - Queues email processing tasks
- _AWS Lambda(Node.js)_ - Processes highlights and generates output files

Detailed reqirements abou the project can be found in the [product brief](./docs/product_brief.md)

## Getting started

```
npm install
npm run build
npm run deploy
```
