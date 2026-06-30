import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Media } from '../entities/media.entity';
import { FinalOutput } from '../entities/final-output.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { BoothGateway } from '../gateway/booth.gateway';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(Session)
        private sessionsRepository: Repository<Session>,
        @InjectRepository(Media)
        private mediaRepository: Repository<Media>,
        @InjectRepository(FinalOutput)
        private finalOutputRepository: Repository<FinalOutput>,
        @Inject(forwardRef(() => BoothGateway))
        private readonly boothGateway: BoothGateway,
    ) { }

    async create(createSessionDto: CreateSessionDto): Promise<Session> {
        // config from dto is currently unused/unmapped
        const session = this.sessionsRepository.create();
        const savedSession = await this.sessionsRepository.save(session);
        this.boothGateway.server.emit('session_created', savedSession);
        return savedSession;
    }

    async findAll(): Promise<Session[]> {
        return this.sessionsRepository.find({
            order: { createdAt: 'DESC' },
            take: 100, // Limit to last 100 sessions to prevent overload
            relations: ['medias'],
        });
    }

    async update(id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
        const session = await this.sessionsRepository.findOneBy({ id });
        if (!session) {
            throw new NotFoundException('Session not found');
        }
        Object.assign(session, updateSessionDto);
        return this.sessionsRepository.save(session);
    }

    async complete(id: string): Promise<Session> {
        return this.update(id, { status: 'COMPLETED' });
    }

    async addMedia(sessionId: string, fileUrl: string, type: 'ORIGINAL' | 'PROCESSED' | 'VIDEO' | 'VIDEO_RECAP' = 'ORIGINAL'): Promise<Media> {
        const session = await this.sessionsRepository.findOneBy({ id: sessionId });
        if (!session) {
            throw new NotFoundException('Session not found');
        }
        const media = this.mediaRepository.create({
            url: fileUrl,
            type,
            session,
        });
        return this.mediaRepository.save(media);
    }

    async saveFinalOutput(data: {
        id: string;
        event_id: string;
        session_id: string;
        image_url: string;
        image_path: string;
        file_size?: number;
        mime_type?: string;
        video_url?: string;
    }): Promise<FinalOutput> {
        const output = this.finalOutputRepository.create({
            id: data.id,
            event_id: data.event_id,
            session_id: data.session_id,
            image_url: data.image_url,
            image_path: data.image_path,
            file_size: data.file_size,
            mime_type: data.mime_type,
            upload_status: 'success'
            // We can add video_url to DB if schema allows, otherwise just save image.
        });
        return this.finalOutputRepository.save(output);
    }

    async findOne(id: string): Promise<Session> {
        const session = await this.sessionsRepository.findOne({
            where: { id },
            relations: ['medias']
        });
        if (!session) {
            throw new NotFoundException('Session not found');
        }
        return session;
    }

    async remove(id: string): Promise<void> {
        const session = await this.findOne(id);
        await this.sessionsRepository.remove(session);
    }

    async getOverviewStats() {
        const total = await this.sessionsRepository.count();
        return { total };
    }

    async getDailyStats() {
        return this.sessionsRepository.createQueryBuilder('session')
            .select("TO_CHAR(session.createdAt, 'YYYY-MM-DD')", 'date')
            .addSelect("COUNT(*)", 'count')
            .groupBy("TO_CHAR(session.createdAt, 'YYYY-MM-DD')")
            .orderBy('date', 'DESC')
            .take(30) // Last 30 days
            .getRawMany();
    }

    async getHourlyStats() {
        return this.sessionsRepository.createQueryBuilder('session')
            .select("TO_CHAR(session.createdAt, 'HH24')", 'hour')
            .addSelect("COUNT(*)", 'count')
            .groupBy("TO_CHAR(session.createdAt, 'HH24')")
            .orderBy('hour', 'ASC')
            .getRawMany();
    }
}
