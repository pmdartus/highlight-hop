import {
  GetObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export interface ObjectService {
  getObject(bucket: string, key: string): Promise<Uint8Array>;
  deleteObject(bucket: string, key: string): Promise<void>;
}

export class S3Service implements ObjectService {
  private client: S3Client;

  constructor(client?: S3Client) {
    this.client = client ?? new S3Client();
  }

  async getObject(bucket: string, key: string): Promise<Uint8Array> {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.client.send(getCommand);
    const body = await response.Body?.transformToByteArray();

    if (!body) {
      throw new Error(`No content found for S3 object: s3://${bucket}/${key}`);
    }

    return body;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.client.send(deleteCommand);
  }
}
