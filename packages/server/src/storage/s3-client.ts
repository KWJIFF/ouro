import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { generateId } from '@ouro/core';
import * as path from 'path';

const s3 = new S3Client({
  endpoint: config.storage.endpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.storage.accessKey,
    secretAccessKey: config.storage.secretKey,
  },
  forcePathStyle: true,
});

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const ext = path.extname(filename) || '';
  const key = `signals/${generateId()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${config.storage.endpoint}/${config.storage.bucket}/${key}`;
}

export async function uploadArtifact(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const ext = path.extname(filename) || '';
  const key = `artifacts/${generateId()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${config.storage.endpoint}/${config.storage.bucket}/${key}`;
}

export async function getFile(key: string): Promise<Buffer> {
  const result = await s3.send(new GetObjectCommand({
    Bucket: config.storage.bucket,
    Key: key,
  }));
  const chunks: Buffer[] = [];
  for await (const chunk of result.Body as any) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
