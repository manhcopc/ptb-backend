import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Media } from './media.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Session {
    @ApiProperty({ description: 'The unique identifier of the session' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({
        enum: ['INIT', 'SELECTING', 'COUNTDOWN', 'CAPTURING', 'COMPLETED'],
        description: 'The current status of the session'
    })
    @Column({
        type: 'enum',
        enum: ['INIT', 'SELECTING', 'COUNTDOWN', 'CAPTURING', 'COMPLETED'],
        default: 'INIT',
    })
    status: 'INIT' | 'SELECTING' | 'COUNTDOWN' | 'CAPTURING' | 'COMPLETED';

    @ApiProperty({ description: 'Selected filter identifier', nullable: true })
    @Column({ nullable: true })
    selectedFilter: string;

    @ApiProperty({ description: 'Selected frame identifier', nullable: true })
    @Column({ nullable: true })
    selectedFrame: string;

    @ApiProperty({ description: 'Signature image data (Base64)', nullable: true })
    @Column({ type: 'text', nullable: true })
    signatureImage: string;

    @ApiProperty({ description: 'Whether the session output is mirrored', default: false })
    @Column({ default: false })
    isMirrored: boolean;

    @ApiProperty({ description: 'The date and time when the session was created' })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({ description: 'SaaS Frontend Session ID', nullable: true })
    @Column({ nullable: true })
    saasSessionId: string;

    @ApiProperty({ type: () => [Media], description: 'List of media files associated with the session' })
    @OneToMany(() => Media, (media) => media.session, { cascade: true })
    medias: Media[];
}
