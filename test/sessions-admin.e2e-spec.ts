import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CreateSessionDto } from '../src/sessions/dto/create-session.dto';

describe('Sessions Admin (e2e)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/api/sessions/stats/overview (GET)', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/sessions/stats/overview')
            .expect(200);

        expect(response.body).toHaveProperty('total');
        expect(typeof response.body.total).toBe('number');
    });

    it('/api/sessions/stats/daily (GET)', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/sessions/stats/daily')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
            expect(response.body[0]).toHaveProperty('date');
            expect(response.body[0]).toHaveProperty('count');
        }
    });

    it('/api/sessions/stats/hourly (GET)', async () => {
        const response = await request(app.getHttpServer())
            .get('/api/sessions/stats/hourly')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
            expect(response.body[0]).toHaveProperty('hour');
            expect(response.body[0]).toHaveProperty('count');
        }
    });

    it('Create and Delete Session (DELETE)', async () => {
        // 1. Create a session
        const createDto: CreateSessionDto = {
            // Add any required fields if strictly required, but for now assuming empty is fine or minimal
        };
        const createResponse = await request(app.getHttpServer())
            .post('/api/sessions')
            .send(createDto)
            .expect(201);

        const session = createResponse.body;
        expect(session).toHaveProperty('id');
        const sessionId = session.id;

        // 2. Verify it exists
        await request(app.getHttpServer())
            .get(`/api/sessions/${sessionId}`)
            .expect(200);

        // 3. Delete it
        await request(app.getHttpServer())
            .delete(`/api/sessions/${sessionId}`)
            .expect(200);

        // 4. Verify it is gone
        await request(app.getHttpServer())
            .get(`/api/sessions/${sessionId}`)
            .expect(404);
    });
});
