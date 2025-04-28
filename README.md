# Highlight Hop

A service that converts Kindle highlights from HTML to various formats (CSV, Markdown, JSON).

## Overview

Highlight Hop is an email-based workflow that converts Kindle highlights exported from iOS/Android Kindle apps (HTML attachment) into user-selected formats and returns the converted file to the user.

## How It Works

1. Send an email with a Kindle highlights HTML attachment to one of the following addresses:

   - `csv@yourdomain.com` - Convert to CSV format
   - `markdown@yourdomain.com` - Convert to Markdown format
   - `json@yourdomain.com` - Convert to JSON format

2. The service processes the email, extracts the highlights, and converts them to the requested format.

3. The converted file is sent back to you as an email attachment.

## Architecture

The service uses the following AWS components:

- **Amazon SES** - Receives emails and sends responses
- **Amazon S3** - Stores raw email attachments temporarily
- **Amazon SQS** - Queues email processing tasks
- **AWS Lambda** - Processes highlights and generates output files

## Deployment

### Prerequisites

- Node.js 18.x or later
- Pulumi CLI
- AWS CLI configured with appropriate credentials

### Setup

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/highlight-hop.git
   cd highlight-hop
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Configure Pulumi with your email domain:

   ```
   cd infra
   ```

4. Deploy the infrastructure:

   ```
   pulumi up
   ```

5. Configure SES:
   - Verify your domain in SES
   - Set up DKIM for your domain
   - Configure SES to receive emails for your domain

## Development

### Running Tests

```
npm test
```

### Linting

```
npm run lint
```

## License

MIT
