import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('final_outputs')
export class FinalOutput {
    @PrimaryColumn('text')
    id: string;

    @Column('text')
    event_id: string;

    @Column('text', { nullable: true })
    session_id: string;

    @Column('text')
    image_path: string;

    @Column('text', { nullable: true })
    thumbnail_path: string;

    @Column('text')
    image_url: string;

    @Column('text', { nullable: true })
    thumbnail_url: string;

    @Column('bigint', { nullable: true })
    file_size: number;

    @Column('bigint', { nullable: true })
    thumbnail_size: number;

    @Column('text', { nullable: true })
    mime_type: string;

    @Column('int', { nullable: true })
    width: number;

    @Column('int', { nullable: true })
    height: number;

    @Column('int', { default: 0 })
    download_count: number;

    @Column('text', { default: 'success' })
    upload_status: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}
