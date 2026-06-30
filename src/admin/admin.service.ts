import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Media } from '../entities/media.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Session)
        private sessionsRepository: Repository<Session>,
        @InjectRepository(Media)
        private mediaRepository: Repository<Media>,
    ) { }

    async getStats() {
        const totalSessions = await this.sessionsRepository.count();
        const totalMedia = await this.mediaRepository.count();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const sessionsToday = await this.sessionsRepository.count({
            where: {
                createdAt: Between(today, tomorrow),
            },
        });

        return {
            totalSessions,
            sessionsToday,
            totalMedia,
        };
    }

    async findAllSessions(page: number = 1, limit: number = 10) {
        const [data, total] = await this.sessionsRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
            relations: ['medias'],
        });

        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    async resendEmail(id: string) {
        // Placeholder for email logic
        console.log(`Resending email to customer for session ${id}`);
        return { success: true, message: 'Email resent successfully' };
    }
}
