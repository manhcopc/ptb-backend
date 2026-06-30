import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from './booth.events';
import { Inject, forwardRef } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    maxHttpBufferSize: 50 * 1024 * 1024, // 50MB
})
export class BoothGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server<ClientToServerEvents, ServerToClientEvents>;

    constructor(
        @Inject(forwardRef(() => SessionsService))
        private readonly sessionsService: SessionsService,
    ) { }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join')
    handleJoin(
        @MessageBody() sessionId: string,
        @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents>,
    ) {
        client.join(sessionId);
        console.log(`Client ${client.id} joined session ${sessionId}`);
        return { status: 'joined', sessionId };
    }

    @SubscribeMessage('update_state')
    handleUpdateState(
        @MessageBody() data: { sessionId: string; filter?: string; frame?: string },
    ) {
        this.server.to(data.sessionId).emit('state_updated', data);
    }

    @SubscribeMessage('trigger_countdown')
    handleTriggerCountdown(@MessageBody() sessionId: string) {
        this.server.to(sessionId).emit('start_countdown');
    }

    @SubscribeMessage('capture_done')
    handleCaptureDone(
        @MessageBody() data: { sessionId: string; imageUrl: string },
    ) {
        this.server.to(data.sessionId).emit('show_result', { imageUrl: data.imageUrl });
    }

    // --- New Remote Control Handlers ---

    @SubscribeMessage('update_config')
    async handleUpdateConfig(
        @MessageBody() data: {
            sessionId: string;
            selectedFrameId?: string;
            selectedFilter?: string;
            timerDuration?: number;
            selectedPhotoIndices?: number[];
            customMessage?: string;
            isMirrored?: boolean;
        },
    ) {
        // Broadcast to room (Monitor listens)
        this.server.to(data.sessionId).emit('update_config', data);

        // Persist mirrored state if present
        if (data.isMirrored !== undefined) {
            try {
                await this.sessionsService.update(data.sessionId, { isMirrored: data.isMirrored });
            } catch (error) {
                console.error(`Failed to update session ${data.sessionId} config`, error);
            }
        }
    }

    @SubscribeMessage('photo_taken')
    handlePhotoTaken(@MessageBody() data: { sessionId: string; image: string }) {
        // Monitor -> Controller (Syncs the captured photo)
        this.server.to(data.sessionId).emit('photo_taken', { image: data.image });
    }

    @SubscribeMessage('sync_signature')
    async handleSyncSignature(
        @MessageBody() data: { sessionId: string; signatureImage: string },
    ) {
        // Controller -> Monitor (Syncs the signature)
        this.server.to(data.sessionId).emit('sync_signature', { signatureImage: data.signatureImage });

        // Persist signature to DB (optional but recommended in requirements)
        try {
            await this.sessionsService.update(data.sessionId, { signatureImage: data.signatureImage });
        } catch (error) {
            console.error(`Failed to save signature for session ${data.sessionId}`, error);
        }
    }

    @SubscribeMessage('trigger_finish')
    handleTriggerFinish(@MessageBody() sessionId: string) {
        // Controller -> Monitor
        this.server.to(sessionId).emit('trigger_finish');
    }

    @SubscribeMessage('processing_start')
    handleProcessingStart(@MessageBody() sessionId: string) {
        // Monitor -> Controller
        this.server.to(sessionId).emit('processing_start');
    }

    @SubscribeMessage('processing_done')
    handleProcessingDone(@MessageBody() sessionId: string) {
        // Monitor -> Controller
        this.server.to(sessionId).emit('processing_done');
    }
}
