import { Controller, Post, Body, Patch, Param, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, Query, Get, Delete, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Session } from '../entities/session.entity';
import { Media } from '../entities/media.entity';
import { StorageService } from '../storage/storage.service';

import { VideoService } from './video.service';

@ApiTags('Sessions')
@Controller('api/sessions')
export class SessionsController {
    constructor(
        private readonly sessionsService: SessionsService,
        private readonly storageService: StorageService,
        private readonly videoService: VideoService,
    ) { }

    @Post('convert')
    async convertVideo(
        @Body() body: { video: string, isMirrored?: boolean },
        @Res() res: Response,
    ) {
        const videoBuffer = Buffer.from(body.video, 'base64');
        const mp4Buffer = await this.videoService.convertWebMToMp4(
            videoBuffer,
            body.isMirrored,
        );

        res.set({
            'Content-Type': 'video/mp4',
            'Content-Length': mp4Buffer.length.toString(),
            'Accept-Ranges': 'bytes',
        });

        res.send(mp4Buffer);
    }

    @ApiOperation({ summary: 'Create a new session', operationId: 'createSession' })
    @ApiResponse({ status: 201, description: 'The session has been successfully created.', type: Session })
    @Post()
    create(@Body() createSessionDto: CreateSessionDto) {
        return this.sessionsService.create(createSessionDto);
    }

    @ApiOperation({ summary: 'Update an existing session', operationId: 'updateSession' })
    @ApiResponse({ status: 200, description: 'The session has been successfully updated.', type: Session })
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto) {
        return this.sessionsService.update(id, updateSessionDto);
    }

    @ApiOperation({ summary: 'Mark a session as completed', operationId: 'completeSession' })
    @ApiResponse({ status: 200, description: 'The session has been marked as completed.', type: Session })
    @Post(':id/complete')
    complete(@Param('id') id: string) {
        return this.sessionsService.complete(id);
    }

    @ApiOperation({ summary: 'Upload a media file (WebM automatically converted to MP4)', operationId: 'uploadSessionMedia' })
    @ApiConsumes('multipart/form-data')
    @ApiQuery({ name: 'type', enum: ['ORIGINAL', 'PROCESSED', 'VIDEO'], required: false, description: 'Type of media (default: ORIGINAL)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'The file has been successfully uploaded.', type: Media })
    @Post(':id/upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
    }))
    async uploadFile(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Query('type') type: 'ORIGINAL' | 'PROCESSED' | 'VIDEO' = 'ORIGINAL',
    ) {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        const session = await this.sessionsService.findOne(id);

        let finalBuffer = file.buffer;
        let finalMimeType = file.mimetype;

        console.log(`[Upload] File: ${file.originalname}, Size: ${file.size}, Mime: ${file.mimetype}`);

        if (file.size === 0) {
            throw new BadRequestException('File is empty');
        }

        // Generate a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const originalName = file.originalname.replace(/\s+/g, '-'); // Sanitize
        let filename = `sessions/${id}/${uniqueSuffix}-${originalName}`;

        // Check if conversion is needed (WebM -> MP4)
        if (file.mimetype === 'video/webm' || file.mimetype === 'video/x-matroska') {
            try {
                finalBuffer = await this.videoService.convertWebMToMp4(file.buffer, session.isMirrored);
                finalMimeType = 'video/mp4';
                // Change extension in filename
                if (filename.endsWith('.webm')) {
                    filename = filename.replace('.webm', '.mp4');
                } else if (filename.endsWith('.mkv')) {
                    filename = filename.replace('.mkv', '.mp4');
                } else {
                    filename = filename + '.mp4';
                }
            } catch (error) {
                console.error('Video conversion failed, uploading original file', error);
                // Fallback: upload original
            }
        }

        // Upload to GCS
        const fileUrl = await this.storageService.uploadFile(filename, finalBuffer, finalMimeType);

        const media = await this.sessionsService.addMedia(id, fileUrl, type);
        return media;
    }

    @ApiOperation({ summary: 'Process SaaS photobooth upload (images, videos, signature)' })
    @Post('saas-upload')
    @UseInterceptors(AnyFilesInterceptor({ storage: memoryStorage() }))
    async saasUpload(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Body() body: any
    ) {
        const eventId = body.eventId || 'default-event';
        const sessionId = body.sessionId || Date.now().toString();

        let finalImageUrl = '';
        let finalImagePath = '';
        let finalVideoUrl = '';
        const originalPhotoUrls: string[] = [];
        const videoClipUrls: string[] = [];

        for (const file of files) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalName = file.originalname.replace(/\s+/g, '-');
            const filename = `saas/${eventId}/${sessionId}/${uniqueSuffix}-${originalName}`;

            // Convert webm to mp4 if it's a video
            let finalBuffer = file.buffer;
            let finalMimeType = file.mimetype;
            let uploadFilename = filename;

            if (file.mimetype === 'video/webm' || file.mimetype === 'video/x-matroska') {
                try {
                    const shouldMirror = file.fieldname === 'videoClips' ? body.isMirrored === 'true' : false;
                    finalBuffer = await this.videoService.convertWebMToMp4(file.buffer, shouldMirror);
                    finalMimeType = 'video/mp4';
                    uploadFilename = filename.replace(/\.(webm|mkv)$/, '.mp4');
                } catch (e) {
                    console.error('Video conversion failed:', e);
                }
            }

            const fileUrl = await this.storageService.uploadFile(uploadFilename, finalBuffer, finalMimeType);

            if (file.fieldname === 'finalImage' || (file.originalname.includes('final') && file.mimetype.startsWith('image/'))) {
                finalImageUrl = fileUrl;
                finalImagePath = uploadFilename;
            } else if (file.fieldname === 'finalVideo' || (file.originalname.includes('final') && file.mimetype.startsWith('video/'))) {
                finalVideoUrl = fileUrl;
            } else if (file.fieldname === 'photos' || file.mimetype.startsWith('image/')) {
                originalPhotoUrls.push(fileUrl);
            } else if (file.fieldname === 'videoClips' || file.mimetype.startsWith('video/')) {
                videoClipUrls.push(fileUrl);
            }
        }

        // Generate output ID
        const outputId = `output-${Date.now()}`;

        // Create a new session for the Admin Dashboard and Share Page
        const session = await this.sessionsService.create({
            status: 'COMPLETED',
            selectedFilter: 'saas-filter',
            selectedFrame: body.selectedFrameId || 'saas-frame',
            isMirrored: body.isMirrored === 'true',
        } as any);

        // Update the saasSessionId
        await this.sessionsService.update(session.id, { saasSessionId: sessionId } as any);

        const mediaPromises: Promise<any>[] = [];

        // Save to Supabase DB via TypeORM
        if (finalImageUrl) {
            await this.sessionsService.saveFinalOutput({
                id: outputId,
                event_id: eventId,
                session_id: sessionId,
                image_url: finalImageUrl,
                image_path: finalImagePath,
                // file_size: file.size // We can track size if we map it
            });

            // Also save as Media for Admin Dashboard
            mediaPromises.push(this.sessionsService.addMedia(session.id, finalImageUrl, 'PROCESSED'));
        }

        if (finalVideoUrl) {
            mediaPromises.push(this.sessionsService.addMedia(session.id, finalVideoUrl, 'VIDEO_RECAP'));
        }

        for (const fileUrl of originalPhotoUrls) {
            mediaPromises.push(this.sessionsService.addMedia(session.id, fileUrl, 'ORIGINAL'));
        }

        for (const fileUrl of videoClipUrls) {
            mediaPromises.push(this.sessionsService.addMedia(session.id, fileUrl, 'VIDEO'));
        }

        await Promise.all(mediaPromises);

        return { success: true, finalImageUrl, sessionId: session.id };
    }

    @ApiOperation({ summary: 'List all sessions', operationId: 'getSessions' })
    @ApiResponse({ status: 200, description: 'Return list of sessions.', type: [Session] })
    @Get()
    findAll() {
        return this.sessionsService.findAll();
    }

    @ApiOperation({ summary: 'Get overview statistics', operationId: 'getOverviewStats' })
    @ApiResponse({ status: 200, description: 'Return overview statistics.' })
    @Get('stats/overview')
    getOverviewStats() {
        return this.sessionsService.getOverviewStats();
    }

    @ApiOperation({ summary: 'Get daily statistics', operationId: 'getDailyStats' })
    @ApiResponse({ status: 200, description: 'Return daily statistics.' })
    @Get('stats/daily')
    getDailyStats() {
        return this.sessionsService.getDailyStats();
    }

    @ApiOperation({ summary: 'Get hourly statistics', operationId: 'getHourlyStats' })
    @ApiResponse({ status: 200, description: 'Return hourly statistics.' })
    @Get('stats/hourly')
    getHourlyStats() {
        return this.sessionsService.getHourlyStats();
    }

    @ApiOperation({ summary: 'Get session details by ID', operationId: 'getSession' })
    @ApiResponse({ status: 200, description: 'Return the session with all associated media.', type: Session })
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.sessionsService.findOne(id);
    }

    @ApiOperation({ summary: 'Delete a session', operationId: 'deleteSession' })
    @ApiResponse({ status: 200, description: 'The session has been successfully deleted.' })
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.sessionsService.remove(id);
    }
}
