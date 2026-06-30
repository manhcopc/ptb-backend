export interface ServerToClientEvents {
    // Existing
    state_updated: (data: { sessionId: string; filter?: string; frame?: string }) => void;
    start_countdown: () => void;
    show_result: (data: { imageUrl: string }) => void;
    session_created: (session: any) => void;

    // New - Remote Control Flow
    // New - Remote Control Flow
    update_config: (data: {
        sessionId: string;
        selectedFrameId?: string;
        selectedFilter?: string;
        timerDuration?: number;
        selectedPhotoIndices?: number[];
        customMessage?: string;
        isMirrored?: boolean;
    }) => void;
    trigger_finish: () => void;
    processing_start: () => void;
    processing_done: () => void;
    photo_taken: (data: { image: string }) => void; // New
    sync_signature: (data: { signatureImage: string }) => void;
}

export interface ClientToServerEvents {
    join: (sessionId: string) => void;

    // Existing
    update_state: (data: { sessionId: string; filter?: string; frame?: string }) => void;
    trigger_countdown: (sessionId: string) => void;
    capture_done: (data: { sessionId: string; imageUrl: string }) => void;

    // New - Remote Control Flow
    update_config: (data: {
        sessionId: string;
        selectedFrameId?: string;
        selectedFilter?: string;
        timerDuration?: number;
        selectedPhotoIndices?: number[];
        customMessage?: string;
        isMirrored?: boolean;
    }) => void;
    trigger_finish: (sessionId: string) => void;
    processing_start: (sessionId: string) => void;
    processing_done: (sessionId: string) => void;
    photo_taken: (data: { sessionId: string; image: string }) => void; // New
    sync_signature: (data: { sessionId: string; signatureImage: string }) => void;
}
