import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Session } from '../entities/session.entity';
import { Media } from '../entities/media.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Session, Media])],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
