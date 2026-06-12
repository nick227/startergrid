import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface FileUploadService {
  /**
   * Uploads a file stream and returns the URL or path to access the uploaded file.
   * @param fileStream Readable stream of the file content
   * @param mimeType The MIME type of the file
   * @returns Resolves to a URL/path string
   */
  uploadFile(fileStream: NodeJS.ReadableStream, mimeType: string): Promise<string>;
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    default: return '';
  }
}

// ── Local disk (dev default) ──────────────────────────────────────────────────
// Writes to ./uploads, served by the API at /uploads/. Not suitable for Railway:
// the container filesystem is ephemeral, so files vanish on redeploy.

export class LocalFileUploadService implements FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(fileStream: NodeJS.ReadableStream, mimeType: string): Promise<string> {
    const filename = `${randomUUID()}${extensionFor(mimeType)}`;
    const destinationPath = path.join(this.uploadDir, filename);

    await pipeline(fileStream, fs.createWriteStream(destinationPath));

    const base = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';
    return `${base}/uploads/${filename}`;
  }
}

// ── S3-compatible object storage (S3, Cloudflare R2, MinIO, …) ───────────────
// Selected with STORAGE_DRIVER=s3. Required env:
//   S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE_URL
// Optional: S3_ENDPOINT (required for R2/MinIO), S3_REGION (default 'auto').

export class S3FileUploadService implements FileUploadService {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const bucket = process.env['S3_BUCKET'];
    const publicBaseUrl = process.env['S3_PUBLIC_BASE_URL'];
    if (!bucket || !publicBaseUrl) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET and S3_PUBLIC_BASE_URL');
    }
    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');

    this.client = new S3Client({
      region: process.env['S3_REGION'] ?? 'auto',
      endpoint: process.env['S3_ENDPOINT'] || undefined,
      credentials: {
        accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
      },
    });
  }

  async uploadFile(fileStream: NodeJS.ReadableStream, mimeType: string): Promise<string> {
    const key = `uploads/${randomUUID()}${extensionFor(mimeType)}`;

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: fileStream as never,
        ContentType: mimeType,
      },
    });
    await upload.done();

    return `${this.publicBaseUrl}/${key}`;
  }
}

// ── Driver selection ──────────────────────────────────────────────────────────

function createFileUploadService(): FileUploadService {
  const driver = (process.env['STORAGE_DRIVER'] ?? 'local').trim().toLowerCase();
  if (driver === 's3') return new S3FileUploadService();
  return new LocalFileUploadService();
}

export const fileUploadService = createFileUploadService();
