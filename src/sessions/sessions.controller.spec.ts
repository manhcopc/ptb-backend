
import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { StorageService } from '../storage/storage.service';

describe('SessionsController', () => {
    let controller: SessionsController;
    let sessionsService: SessionsService;
    let storageService: StorageService;

    const mockSessionsService = {
        create: jest.fn(),
        update: jest.fn(),
        complete: jest.fn(),
        addMedia: jest.fn(),
    };

    const mockStorageService = {
        uploadFile: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SessionsController],
            providers: [
                {
                    provide: SessionsService,
                    useValue: mockSessionsService,
                },
                {
                    provide: StorageService,
                    useValue: mockStorageService,
                },
            ],
        }).compile();

        controller = module.get<SessionsController>(SessionsController);
        sessionsService = module.get<SessionsService>(SessionsService);
        storageService = module.get<StorageService>(StorageService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // Basic smoke test for create
    it('should create a session', async () => {
        const dto = {};
        const result = { id: '123', ...dto };
        mockSessionsService.create.mockResolvedValue(result);

        expect(await controller.create(dto as any)).toBe(result);
    });
});
