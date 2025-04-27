import type { S3Event } from 'aws-lambda';

export const handler = async (event: S3Event) => {
  console.log(event);
};