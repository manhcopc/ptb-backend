import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from '../entities/session.entity';
import { Media } from '../entities/media.entity';
import { FinalOutput } from '../entities/final-output.entity';
import { StorageModule } from '../storage/storage.module';
import { VideoService } from './video.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Session, Media, FinalOutput]),
        StorageModule,
        forwardRef(() => GatewayModule),
    ],
    controllers: [SessionsController],
    providers: [SessionsService, VideoService],
    exports: [SessionsService, VideoService],
})
export class SessionsModule { }
