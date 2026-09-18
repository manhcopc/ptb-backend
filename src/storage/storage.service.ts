import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private backendUrl: string;
  private uploadsDir: string;
  private logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    // URL public của Backend, ví dụ: https://my-backend.ngrok-free.app
    // Cấu hình trong file .env biến PUBLIC_BACKEND_URL
    this.backendUrl = this.configService.get<string>('PUBLIC_BACKEND_URL') || 'http://localhost:4000';
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Đảm bảo thư mục gốc uploads/ tồn tại
    this.initStorage();
  }

  private async initStorage() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      this.logger.log(`Created uploads directory at ${this.uploadsDir}`);
    }
  }

  async uploadFile(
    filename: string, // VD: saas/default-event/123/file.webp
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const fullPath = path.join(this.uploadsDir, filename);
    const dir = path.dirname(fullPath);

    // Tạo các thư mục con tương ứng với cấu trúc đường dẫn (nếu chưa có)
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    // Lưu file xuống ổ cứng
    await fs.writeFile(fullPath, buffer);
    
    // Trả về public URL để frontend và DB lưu lại
    return `${this.backendUrl}/uploads/${filename}`;
  }

  async deleteFilesByPrefix(prefix: string): Promise<void> {
    // prefix truyền vào thường có dạng "saas/event-id/" (dạng thư mục)
    const targetPath = path.join(this.uploadsDir, prefix);
    try {
      const stats = await fs.stat(targetPath);
      if (stats.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
        this.logger.log(`Successfully deleted directory: ${prefix}`);
      } else {
        await fs.unlink(targetPath);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
         this.logger.error(`Failed to delete prefix ${prefix}`, error);
      }
    }
  }
}
