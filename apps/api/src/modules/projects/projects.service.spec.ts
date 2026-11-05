import { NotFoundError } from '@/core/errors';
import { ProjectsRepository, type ProjectRow } from './projects.repository';
import { ProjectsService } from './projects.service';

const now = new Date('2026-11-04T12:00:00Z');
const row: ProjectRow = {
  id: 'p1',
  workspaceId: 'w1',
  name: 'P',
  description: null,
  color: null,
  archivedAt: null,
  createdBy: 'u1',
  createdAt: now,
  updatedAt: now,
};

describe('ProjectsService', () => {
  const repo = { insert: jest.fn(), list: jest.fn(), findById: jest.fn(), update: jest.fn() };
  const service = new ProjectsService(repo as unknown as ProjectsRepository);

  beforeEach(() => jest.resetAllMocks());

  it('cria no workspace do contexto e registra o criador', async () => {
    repo.insert.mockResolvedValue(row);
    await service.create({ userId: 'u1', workspaceId: 'w1' }, { name: 'P' });
    expect(repo.insert).toHaveBeenCalledWith({ name: 'P', workspaceId: 'w1', createdBy: 'u1' });
  });

  it('get de outro workspace → NotFoundError', async () => {
    repo.findById.mockResolvedValue(undefined);
    await expect(service.get('w2', 'p1')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.findById).toHaveBeenCalledWith('w2', 'p1');
  });

  it('archive grava a data e devolve em ISO', async () => {
    repo.update.mockResolvedValue({ ...row, archivedAt: now });
    await expect(service.archive('w1', 'p1')).resolves.toMatchObject({ archivedAt: now.toISOString() });
    expect(repo.update.mock.calls[0][2].archivedAt).toBeInstanceOf(Date);
  });

  it('unarchive limpa a data', async () => {
    repo.update.mockResolvedValue(row);
    await service.unarchive('w1', 'p1');
    expect(repo.update).toHaveBeenCalledWith('w1', 'p1', { archivedAt: null });
  });

  it('PATCH vazio devolve o projeto sem gravar', async () => {
    repo.findById.mockResolvedValue(row);
    await expect(service.update('w1', 'p1', {})).resolves.toMatchObject({ id: 'p1' });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('update de projeto inexistente → NotFoundError', async () => {
    repo.update.mockResolvedValue(undefined);
    await expect(service.update('w1', 'x', { name: 'N' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
