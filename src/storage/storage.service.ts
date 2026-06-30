
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';

@Injectable()
export class StorageService {
    private storage: Storage;
    private bucketName: string;
    private logger = new Logger(StorageService.name);

    constructor(private configService: ConfigService) {
        const projectId = this.configService.get<string>('GCS_PROJECT_ID');
        const keyFilePath = this.configService.get<string>('GCS_KEY_FILE_PATH') || './gcs-key.json';
        this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';

        this.storage = new Storage({
            projectId,
            keyFilename: path.resolve(process.cwd(), keyFilePath),
        });
    }

    async uploadFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(filename);

        await file.save(buffer, {
            metadata: {
                contentType,
            },
            resumable: false,
        });

        // Tự động set public cho file để tránh lỗi AccessDenied khi quét QR code
        try {
            await file.makePublic();
        } catch (e) {
            this.logger.warn(`Could not make file ${filename} public (bucket might have uniform access). Error: ${e.message}`);
        }



        return `https://storage.googleapis.com/${this.bucketName}/${filename}`;
    }
}
