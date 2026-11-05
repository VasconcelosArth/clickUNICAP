import { Test } from '@nestjs/testing';
import { NotFoundError } from '@/core/errors';
import { UsersRepository, type UserRow } from './users.repository';
import { UsersService } from './users.service';

const row: UserRow = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@teste.com',
  passwordHash: 'hash-secreto',
  avatarUrl: null,
  createdAt: new Date('2026-11-04T12:00:00.000Z'),
  updatedAt: new Date('2026-11-04T12:00:00.000Z'),
};

describe('UsersService', () => {
  const repo = { findById: jest.fn(), findByEmail: jest.fn(), insert: jest.fn(), update: jest.fn() };
  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repo }],
    }).compile();
    service = mod.get(UsersService);
  });

  describe('getProfile', () => {
    it('devolve o perfil sem o hash da senha e com data em ISO', async () => {
      repo.findById.mockResolvedValue(row);
      const profile = await service.getProfile('u1');
      expect(profile).toEqual({
        id: 'u1',
        name: 'Ana',
        email: 'ana@teste.com',
        avatarUrl: null,
        createdAt: '2026-11-04T12:00:00.000Z',
      });
      expect(profile).not.toHaveProperty('passwordHash');
    });

    it('lança NotFoundError se o usuário não existe', async () => {
      repo.findById.mockResolvedValue(undefined);
      await expect(service.getProfile('x')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('atualiza só os campos enviados', async () => {
      repo.update.mockResolvedValue({ ...row, name: 'Ana Maria' });
      await expect(service.updateProfile('u1', { name: 'Ana Maria' })).resolves.toMatchObject({ name: 'Ana Maria' });
      expect(repo.update).toHaveBeenCalledWith('u1', { name: 'Ana Maria' });
    });

    it('PATCH vazio devolve o perfil sem gravar', async () => {
      repo.findById.mockResolvedValue(row);
      await expect(service.updateProfile('u1', {})).resolves.toMatchObject({ id: 'u1' });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('lança NotFoundError se o usuário sumiu', async () => {
      repo.update.mockResolvedValue(undefined);
      await expect(service.updateProfile('x', { name: 'y' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('create', () => {
    const data = { name: 'Ana', email: 'ana@teste.com', passwordHash: 'h' };

    it('devolve o usuário criado', async () => {
      repo.insert.mockResolvedValue(row);
      await expect(service.create(data)).resolves.toBe(row);
    });

    it('e-mail já existente no banco → EMAIL_TAKEN', async () => {
      repo.insert.mockResolvedValue(undefined);
      await expect(service.create(data)).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 });
    });
  });

  it('setPasswordHash lança NotFoundError para usuário inexistente', async () => {
    repo.update.mockResolvedValue(undefined);
    await expect(service.setPasswordHash('x', 'h')).rejects.toBeInstanceOf(NotFoundError);
  });
});
