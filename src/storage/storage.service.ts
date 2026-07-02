import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
// import * as path from 'path';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName: string;
  private logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('GCS_PROJECT_ID');

    // BẮT BUỘC PHẢI MỞ COMMENT DÒNG NÀY (Bỏ 2 dấu gạch chéo // ở đầu):
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';

    // Có thể dùng luôn configService của NestJS thay vì process.env cho đồng bộ
    const base64String =
      this.configService.get<string>('GCS_CREDENTIALS_BASE64') || '';

    if (!base64String) {
      this.logger.error('Missing GCS_CREDENTIALS_BASE64 environment variable!');
    }

    const credentials = base64String
      ? (JSON.parse(
          Buffer.from(base64String, 'base64').toString('utf8'),
        ) as Record<string, string>)
      : {};

    this.storage = new Storage({
      projectId: projectId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      credentials: credentials,
    });
  }

  async uploadFile(
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filename);

    await file.save(buffer, {
      metadata: {
        contentType,
      },
      resumable: false,
    });

    // Tự động set public cho file để tránh lỗi AccessDenied khi quét QR code
    // try {
    //   await file.makePublic();
    // } catch (e) {
    //   this.logger.warn(
    //     `Could not make file ${filename} public (bucket might have uniform access). Error: ${e.message}`,
    //   );
    // }

    return `https://storage.googleapis.com/${this.bucketName}/${filename}`;
  }
}
