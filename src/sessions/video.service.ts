import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class VideoService {
    private readonly logger = new Logger(VideoService.name);

    async convertWebMToMp4(inputBuffer: Buffer, isMirrored: boolean = false): Promise<Buffer> {
        const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const inputPath = path.join(os.tmpdir(), `input-${uniqueId}.webm`);
        const outputPath = path.join(os.tmpdir(), `output-${uniqueId}.mp4`);

        try {
            if (!inputBuffer || inputBuffer.length === 0) {
                throw new Error('Input buffer is empty');
            }

            // Write input buffer to temp file
            await fs.promises.writeFile(inputPath, inputBuffer);

            const stats = await fs.promises.stat(inputPath);
            this.logger.log(`Starting conversion: ${inputPath} (${stats.size} bytes) -> ${outputPath}`);

            await new Promise<void>((resolve, reject) => {
                ffmpeg(inputPath)
                    .output(outputPath)
                    // H.264 codec với baseline profile cho tương thích tốt nhất với iOS
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions([
                        // Pixel format chuẩn cho tất cả devices
                        '-pix_fmt yuv420p',
                        
                        // Baseline profile thay vì high - tương thích iOS tốt hơn
                        '-profile:v baseline',
                        
                        // Level 3.1 thay vì 4.1 - tương thích rộng hơn
                        '-level:v 4.1',
                        
                        // Frame rate
                        '-r 30',
                        '-vsync cfr',
                        
                        // Video filters (mirror nếu cần + scale chẵn)
                        `-vf ${isMirrored ? 'hflip,' : ''}scale=trunc(iw/2)*2:trunc(ih/2)*2`,
                        
                        // faststart cho streaming (di chuyển moov atom lên đầu)
                        '-movflags +faststart',
                        
                        // Audio bitrate rõ ràng
                        '-b:a 128k',
                        
                        // Audio sample rate chuẩn
                        '-ar 44100',
                        
                        // Preset fast cho tốc độ và chất lượng cân bằng
                        '-preset fast',
                        
                        // CRF cho chất lượng ổn định (23 là giá trị mặc định tốt)
                        '-crf 23',
                    ])
                    .on('start', (commandLine) => {
                        this.logger.debug(`FFmpeg command: ${commandLine}`);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent) {
                            this.logger.debug(`Processing: ${progress.percent.toFixed(1)}% done`);
                        }
                    })
                    .on('end', () => {
                        this.logger.log('Video conversion completed successfully');
                        resolve();
                    })
                    .on('error', (err) => {
                        this.logger.error(`Error converting video: ${err.message}`);
                        reject(err);
                    })
                    .run();
            });

            // Read the converted file back into a buffer
            const outputBuffer = await fs.promises.readFile(outputPath);
            
            this.logger.log(`Conversion successful. Output size: ${outputBuffer.length} bytes`);
            
            return outputBuffer;

        } catch (error) {
            this.logger.error(`Failed to convert video: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Video conversion failed');
        } finally {
            // Cleanup temp files
            try {
                if (fs.existsSync(inputPath)) {
                    await fs.promises.unlink(inputPath);
                    this.logger.debug(`Cleaned up input file: ${inputPath}`);
                }
                if (fs.existsSync(outputPath)) {
                    await fs.promises.unlink(outputPath);
                    this.logger.debug(`Cleaned up output file: ${outputPath}`);
                }
            } catch (cleanupErr) {
                this.logger.warn(`Failed to cleanup temp files: ${cleanupErr.message}`);
            }
        }
    }
}