import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Constants
const DOMAIN_NAME = "highlight-hop.dartus.fr";
// const OUTPUT_FORMATS = ["csv", "markdown", "json"];

// S3 bucket for storing raw MIME objects
const bucket = new aws.s3.BucketV2("email-inbound", {
  forceDestroy: true,
  /* TODO: Enable lifecycle rules. */
  //   lifecycleRules: [{
  //     enabled: true,
  //     expirations: [{
  //       days: 1, // Delete after 1 day (minimum allowed by S3)
  //     }],
  //   }],

  /* TODO: Enable encryption. */
  //   serverSideEncryptionConfigurations: [{
  //     rules: [{
  //       applyServerSideEncryptionByDefaults: [{
  //         sseAlgorithm: "AES256",
  //       }],
  //     }],
  //   }],
});

// SQS queue for email processing
const emailQueue = new aws.sqs.Queue("email-processing-queue", {
  visibilityTimeoutSeconds: 60,
});

// SQS queue policy to allow S3 to publish notifications
new aws.sqs.QueuePolicy("email-queue-policy", {
  queueUrl: emailQueue.url,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "s3.amazonaws.com",
        },
        Action: "sqs:SendMessage",
        Resource: emailQueue.arn,
        Condition: {
          ArnEquals: {
            "aws:SourceArn": bucket.arn,
          },
        },
      },
    ],
  },
});

// Lambda IAM role
const lambdaRole = new aws.iam.Role("processor-lambda-role", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
      },
    ],
  },
});

// Lambda IAM policy
new aws.iam.RolePolicy("email-processor-policy", {
  role: lambdaRole.id,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject"],
        Resource: [bucket.arn, pulumi.interpolate`${bucket.arn}/*`],
      },
      {
        Effect: "Allow",
        Action: [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ],
        Resource: emailQueue.arn,
      },
      {
        Effect: "Allow",
        Action: ["ses:SendRawEmail"],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        Resource: "arn:aws:logs:*:*:*",
      },
    ],
  },
});

// Lambda function for processing highlights
const processorLambda = new aws.lambda.Function("email-processor", {
  runtime: "nodejs22.x",
  handler: "index.handler",
  role: lambdaRole.arn,
  timeout: 30, // 30 seconds
  memorySize: 256,
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../src"),
  }),
  environment: {
    variables: {
      BUCKET_NAME: bucket.id,
      DOMAIN_NAME,
    },
  },
});

// SQS trigger for Lambda
new aws.lambda.EventSourceMapping("lambda-trigger", {
  eventSourceArn: emailQueue.arn,
  functionName: processorLambda.arn,
  batchSize: 1, // TODO: Determine if it's preferred to increase batch size.
});

// S3 event notification to SQS
new aws.s3.BucketNotification("s3-event-notification", {
  bucket: bucket.id,
  queues: [
    {
      queueArn: emailQueue.arn,
      events: ["s3:ObjectCreated:*"],
    },
  ],
});

/*
// SES domain identity
const sesDomainIdentity = new aws.ses.DomainIdentity("email-domain", {
  domain: domainName,
});

// SES domain DKIM
const sesDomainDkim = new aws.ses.DomainDkim("email-domain-dkim", {
  domain: domainName,
});

// SES email identity for each format
for (const format of outputFormats) {
  new aws.ses.EmailIdentity(`email-identity-${format}`, {
    email: `${format}@${domainName}`,
  });
}

// SES receiving rule set
const ruleSet = new aws.ses.ReceiptRuleSet("main", {
  ruleSetName: "highlight-hop-rules",
});

// SES receiving rule for valid formats
new aws.ses.ReceiptRule("valid-formats", {
  ruleSetName: ruleSet.ruleSetName,
  recipients: outputFormats.map(format => `${format}@${domainName}`),
  enabled: true,
  scanEnabled: true, // Enable spam and virus scanning
  addHeaderActions: [{
    headerName: "X-Original-Recipient",
    headerValue: "\\${originalRecipient}",
    position: 1,
  }],
  s3Actions: [{
    bucketName: bucket.id,
    objectKeyPrefix: "incoming/",
    position: 2,
  }],
});

// SES receiving rule for bounce handling
new aws.ses.ReceiptRule("bounce-handling", {
  ruleSetName: ruleSet.ruleSetName,
  recipients: ["bounces@" + domainName],
  enabled: true,
  scanEnabled: true,
  bounceActions: [{
    message: "Your email was rejected due to invalid format or spam.",
    sender: "bounces@" + domainName,
    smtpReplyCode: "550",
    statusCode: "5.1.1",
    position: 1,
  }],
});

// SES active rule set
new aws.ses.ActiveReceiptRuleSet("active", {
  ruleSetName: ruleSet.ruleSetName,
});
*/

// Export values
export const bucketName = bucket.id;
export const queueUrl = emailQueue.arn;
export const lambdaFunctionArn = processorLambda.arn;
// export const emailDomainIdentity = sesDomainIdentity.domain;
// export const emailDomainDkimTokens = sesDomainDkim.dkimTokens;
