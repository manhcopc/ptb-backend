import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucketName: string;
  private endpoint: string;
  private logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('DO_SPACES_BUCKET') || '';
    this.endpoint = this.configService.get<string>('DO_SPACES_ENDPOINT') || 'https://sgp1.digitaloceanspaces.com';
    
    const accessKeyId = this.configService.get<string>('DO_SPACES_KEY') || '';
    const secretAccessKey = this.configService.get<string>('DO_SPACES_SECRET') || '';

    if (!accessKeyId || !secretAccessKey) {
      this.logger.error('Missing DO_SPACES_KEY or DO_SPACES_SECRET environment variables!');
    }

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      forcePathStyle: false, // DO Spaces usually works with virtual-hosted style
      region: 'sgp1', // Required by S3 SDK, even if DO Spaces
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // Đảm bảo file được public để khách quét mã QR xem được
    });

    await this.s3.send(command);

    // Xây dựng public URL
    // Endpoint của DO Spaces thường có dạng: https://sgp1.digitaloceanspaces.com
    // URL sẽ là: https://<bucket>.sgp1.digitaloceanspaces.com/<filename>
    const urlEndpoint = this.endpoint.replace('https://', '');
    return `https://${this.bucketName}.${urlEndpoint}/${filename}`;
  }

  async deleteFilesByPrefix(prefix: string): Promise<void> {
    try {
      // B1: Lấy danh sách các file có chung prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });
      const listResponse = await this.s3.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return; // Không có file nào để xóa
      }

      // B2: Tạo lệnh xóa
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: listResponse.Contents.map((item) => ({ Key: item.Key })),
          Quiet: false,
        },
      });

      await this.s3.send(deleteCommand);
      this.logger.log(`Successfully deleted ${listResponse.Contents.length} files with prefix: ${prefix}`);
    } catch (error) {
      this.logger.error(`Failed to delete files with prefix ${prefix}`, error);
      throw error;
    }
  }
}
