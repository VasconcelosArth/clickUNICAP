import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('responde ok com o banco de teste no ar', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('rota inexistente devolve o formato padrão de erro', async () => {
    const res = await request(app.getHttpServer()).get('/api/nao-existe').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' });
  });
});
