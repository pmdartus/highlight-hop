import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Constants
const DOMAIN_NAME = "highlight-hop.dartus.fr";
const OUTPUT_FORMATS = ["csv", "markdown", "json"];

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
        Action: ["ses:SendEmail"],
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
    ".": new pulumi.asset.FileArchive("../dist"),
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
  batchSize: 1,
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

// SES domain identity
new aws.ses.DomainIdentity("email-domain", {
  domain: DOMAIN_NAME,
});

// SES domain DKIM
const sesDomainDkim = new aws.ses.DomainDkim("email-domain-dkim", {
  domain: DOMAIN_NAME,
});

// SES receiving rule set
const ruleSet = new aws.ses.ReceiptRuleSet("main", {
  ruleSetName: "highlight-hop-rules",
});

// IAM role for SES to write to S3
const sesRole = new aws.iam.Role("ses-s3-role", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ses.amazonaws.com",
        },
      },
    ],
  },
});

// IAM policy for SES role to write to S3
new aws.iam.RolePolicy("ses-s3-policy", {
  role: sesRole.id,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "s3:PutObject",
        Resource: pulumi.interpolate`${bucket.arn}/*`,
      },
    ],
  },
});

// S3 bucket policy to allow SES role to write incoming emails
new aws.s3.BucketPolicy("email-inbound-policy", {
  bucket: bucket.id,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: sesRole.arn,
        },
        Action: "s3:PutObject",
        Resource: pulumi.interpolate`${bucket.arn}/*`,
      },
    ],
  },
});

// SES receiving rule for valid formats
new aws.ses.ReceiptRule("valid-formats", {
  name: "valid-formats",
  enabled: true,
  ruleSetName: ruleSet.ruleSetName,
  recipients: OUTPUT_FORMATS.map((format) => `${format}@${DOMAIN_NAME}`),
  scanEnabled: true,
  s3Actions: [
    {
      bucketName: bucket.id,
      position: 1,
      iamRoleArn: sesRole.arn,
    },
  ],
  stopActions: [
    {
      scope: "RuleSet",
      position: 2,
    },
  ],
});

// SES active rule set
new aws.ses.ActiveReceiptRuleSet("active", {
  ruleSetName: ruleSet.ruleSetName,
});

// Export values
export const bucketName = bucket.id;
export const queueUrl = emailQueue.arn;
export const lambdaFunctionArn = processorLambda.arn;
export const emailDomainDkimTokens = sesDomainDkim.dkimTokens;
