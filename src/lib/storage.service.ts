import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { StorageServiceInterface, StorageUploadResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

class S3StorageService implements StorageServiceInterface {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.AWS_S3_BUCKET;
    this.client = new S3Client({
      region: env.AWS_REGION,
      ...(env.AWS_S3_ENDPOINT
        ? {
            endpoint: env.AWS_S3_ENDPOINT,
            forcePathStyle: true, // Required for MinIO
          }
        : {}),
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
    isPublic = false,
  ): Promise<StorageUploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ...(isPublic ? { ACL: 'public-read' } : {}),
      });

      const result = await this.client.send(command);

      const url = isPublic
        ? env.AWS_S3_ENDPOINT
          ? `${env.AWS_S3_ENDPOINT}/${this.bucket}/${key}`
          : `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
        : await this.getSignedUrl(key);

      return {
        key,
        url,
        bucket: this.bucket,
        etag: result.ETag,
      };
    } catch (error) {
      logger.error({ error, key }, 'S3 upload failed');
      throw new Error(`Storage upload failed: ${(error as Error).message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error({ error, key }, 'S3 delete failed');
      throw new Error(`Storage delete failed: ${(error as Error).message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ error, key }, 'S3 getSignedUrl failed');
      throw new Error(`Failed to generate signed URL: ${(error as Error).message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

export function generateStorageKey(
  folder: string,
  userId: string,
  originalName: string,
): string {
  const ext = originalName.split('.').pop() ?? 'bin';
  const uuid = uuidv4();
  return `${folder}/${userId}/${uuid}.${ext}`;
}

export const storageService = new S3StorageService();
