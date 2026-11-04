import { Test } from '@nestjs/testing';
import { DRIZZLE } from '@/core/database/database.module';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const db = { execute: jest.fn() };
  let controller: HealthController;

  beforeEach(async () => {
    db.execute.mockReset();
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DRIZZLE, useValue: db }],
    }).compile();
    controller = mod.get(HealthController);
  });

  it('responde ok quando o banco responde', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    await expect(controller.check()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('responde degraded (sem lançar erro) quando o banco cai', async () => {
    db.execute.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(controller.check()).resolves.toEqual({ status: 'degraded', database: 'down' });
  });
});
