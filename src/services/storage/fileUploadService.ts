import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';

export interface FileUploadService {
  /**
   * Uploads a file stream and returns the URL or path to access the uploaded file.
   * @param fileStream Readable stream of the file content
   * @param mimeType The MIME type of the file
   * @returns Resolves to a URL/path string
   */
  uploadFile(fileStream: NodeJS.ReadableStream, mimeType: string): Promise<string>;
}

export class LocalFileUploadService implements FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(fileStream: NodeJS.ReadableStream, mimeType: string): Promise<string> {
    const ext = this.getExtension(mimeType);
    const filename = `${randomUUID()}${ext}`;
    const destinationPath = path.join(this.uploadDir, filename);

    await pipeline(fileStream, fs.createWriteStream(destinationPath));

    const base = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';
    return `${base}/uploads/${filename}`;
  }

  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/webp': return '.webp';
      default: return '';
    }
  }
}

// Export a singleton instance for MVP
export const fileUploadService = new LocalFileUploadService();
