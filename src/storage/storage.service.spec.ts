
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

// Mock the external GCS library
const mockSave = jest.fn();
const mockMakePublic = jest.fn();
const mockFile = jest.fn(() => ({
    save: mockSave,
    makePublic: mockMakePublic,
}));
const mockBucket = jest.fn(() => ({
    file: mockFile,
}));

jest.mock('@google-cloud/storage', () => {
    return {
        Storage: jest.fn().mockImplementation(() => {
            return {
                bucket: mockBucket,
            };
        }),
    };
});

describe('StorageService', () => {
    let service: StorageService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StorageService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'GCS_PROJECT_ID') return 'test-project';
                            if (key === 'GCS_BUCKET_NAME') return 'test-bucket';
                            if (key === 'GCS_KEY_FILE_PATH') return 'test-key.json';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<StorageService>(StorageService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('uploadFile', () => {
        it('should upload a file and return public URL', async () => {
            const filename = 'test.jpg';
            const buffer = Buffer.from('test');
            const contentType = 'image/jpeg';

            mockSave.mockResolvedValue(undefined);
            mockMakePublic.mockResolvedValue(undefined);

            const result = await service.uploadFile(filename, buffer, contentType);

            expect(mockBucket).toHaveBeenCalledWith('test-bucket');
            expect(mockFile).toHaveBeenCalledWith(filename);
            expect(mockSave).toHaveBeenCalledWith(buffer, {
                metadata: { contentType },
                resumable: false,
            });
            expect(mockMakePublic).toHaveBeenCalled();
            expect(result).toBe(`https://storage.googleapis.com/test-bucket/${filename}`);
        });

        it('should handle makePublic failure gracefully', async () => {
            const filename = 'test.jpg';
            const buffer = Buffer.from('test');
            const contentType = 'image/jpeg';

            mockSave.mockResolvedValue(undefined);
            mockMakePublic.mockRejectedValue(new Error('Access Denied'));

            const result = await service.uploadFile(filename, buffer, contentType);

            // Should still return the URL even if makePublic fails (e.g. uniform bucket success)
            expect(result).toBe(`https://storage.googleapis.com/test-bucket/${filename}`);
        });
    });
});
