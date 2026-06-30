import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Session } from './session.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Media {
    @ApiProperty({ description: 'The unique identifier of the media' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ description: 'The absolute URL path of the media file' })
    @Column()
    url: string;

    @ApiProperty({ enum: ['ORIGINAL', 'PROCESSED', 'VIDEO', 'VIDEO_RECAP'], description: 'The type of the media file' })
    @Column({
        type: 'enum',
        enum: ['ORIGINAL', 'PROCESSED', 'VIDEO', 'VIDEO_RECAP'],
        default: 'ORIGINAL',
    })
    type: 'ORIGINAL' | 'PROCESSED' | 'VIDEO' | 'VIDEO_RECAP';

    @ManyToOne(() => Session, (session) => session.medias, { onDelete: 'CASCADE' })
    session: Session;
}
