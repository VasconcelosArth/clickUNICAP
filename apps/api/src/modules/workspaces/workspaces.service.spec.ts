import { Test } from '@nestjs/testing';
import { hashToken } from '@/core/auth/opaque-token';
import { AppConfig } from '@/core/config';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '@/core/errors';
import type { WorkspaceContext } from '@/core/guards';
import { MailService } from '@/core/mail/mail.service';
import { UsersService } from '@/modules/users/users.service';
import { type InviteRow, type WorkspaceRow, WorkspacesRepository } from './workspaces.repository';
import { WorkspacesService } from './workspaces.service';

const now = new Date('2026-11-04T12:00:00Z');
const OWNER = 'u-owner';
const ws: WorkspaceRow = { id: 'w1', name: 'UNICAP', ownerId: OWNER, createdAt: now, updatedAt: now };
const asAdmin: WorkspaceContext = { id: 'w1', role: 'admin' };
const asMember: WorkspaceContext = { id: 'w1', role: 'member' };
const owner = { id: OWNER, email: 'dono@teste.com' };
const bia = { id: 'u-bia', email: 'bia@teste.com' };

const member = (userId: string, role: 'admin' | 'member') => ({ workspaceId: 'w1', userId, role, joinedAt: now });

describe('WorkspacesService', () => {
  const repo = {
    createWithOwner: jest.fn(),
    listForUser: jest.fn(),
    findById: jest.fn(),
    rename: jest.fn(),
    delete: jest.fn(),
    listMembers: jest.fn(),
    findMember: jest.fn(),
    isMemberByEmail: jest.fn(),
    countAdmins: jest.fn(),
    addMember: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    replacePendingInvite: jest.fn(),
    listPendingInvites: jest.fn(),
    findInviteByTokenHash: jest.fn(),
    deleteInvite: jest.fn(),
    acceptInvite: jest.fn(),
  };
  const users = { getProfile: jest.fn() };
  const mail = { send: jest.fn() };
  const config = { webUrl: 'http://localhost:5173' } as AppConfig;
  let service: WorkspacesService;

  beforeEach(async () => {
    jest.resetAllMocks();
    repo.findById.mockResolvedValue(ws);
    const mod = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: WorkspacesRepository, useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mail },
        { provide: AppConfig, useValue: config },
      ],
    }).compile();
    service = mod.get(WorkspacesService);
  });

  describe('create', () => {
    it('cria com o usuário como dono e devolve myRole admin', async () => {
      repo.createWithOwner.mockResolvedValue(ws);
      await expect(service.create(owner, { name: 'UNICAP' })).resolves.toMatchObject({ id: 'w1', myRole: 'admin' });
      expect(repo.createWithOwner).toHaveBeenCalledWith('UNICAP', OWNER);
    });
  });

  describe('delete', () => {
    it('só o dono apaga', async () => {
      await service.delete(owner, asAdmin);
      expect(repo.delete).toHaveBeenCalledWith('w1');
    });

    it('admin que não é dono recebe ForbiddenError', async () => {
      await expect(service.delete(bia, asAdmin)).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('promove membro a admin', async () => {
      repo.findMember.mockResolvedValue(member('u-bia', 'member'));
      await service.changeRole(asAdmin, 'u-bia', 'admin');
      expect(repo.updateMemberRole).toHaveBeenCalledWith('w1', 'u-bia', 'admin');
    });

    it('não altera o papel do dono', async () => {
      repo.findMember.mockResolvedValue(member(OWNER, 'admin'));
      await expect(service.changeRole(asAdmin, OWNER, 'member')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('não rebaixa o último admin (LAST_ADMIN)', async () => {
      repo.findMember.mockResolvedValue(member('u-bia', 'admin'));
      repo.countAdmins.mockResolvedValue(1);
      await expect(service.changeRole(asAdmin, 'u-bia', 'member')).rejects.toMatchObject({ code: 'LAST_ADMIN' });
      expect(repo.updateMemberRole).not.toHaveBeenCalled();
    });

    it('membro inexistente → NotFoundError', async () => {
      repo.findMember.mockResolvedValue(undefined);
      await expect(service.changeRole(asAdmin, 'x', 'admin')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('mesmo papel: não faz nada', async () => {
      repo.findMember.mockResolvedValue(member('u-bia', 'member'));
      await service.changeRole(asAdmin, 'u-bia', 'member');
      expect(repo.updateMemberRole).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('admin remove outro membro', async () => {
      repo.findMember.mockResolvedValue(member('u-bia', 'member'));
      await service.removeMember(owner, asAdmin, 'u-bia');
      expect(repo.removeMember).toHaveBeenCalledWith('w1', 'u-bia');
    });

    it('membro comum pode sair (remover a si mesmo)', async () => {
      repo.findMember.mockResolvedValue(member('u-bia', 'member'));
      await service.removeMember(bia, asMember, 'u-bia');
      expect(repo.removeMember).toHaveBeenCalledWith('w1', 'u-bia');
    });

    it('membro comum NÃO remove outra pessoa', async () => {
      await expect(service.removeMember(bia, asMember, 'u-outro')).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.removeMember).not.toHaveBeenCalled();
    });

    it('o dono não pode sair nem ser removido', async () => {
      repo.findMember.mockResolvedValue(member(OWNER, 'admin'));
      await expect(service.removeMember(owner, asAdmin, OWNER)).rejects.toThrow('O dono não pode sair do workspace');
      await expect(service.removeMember(bia, asAdmin, OWNER)).rejects.toThrow('não pode ser removido');
    });

    it('não remove o último admin', async () => {
      repo.findMember.mockResolvedValue(member('u-bia', 'admin'));
      repo.countAdmins.mockResolvedValue(1);
      await expect(service.removeMember(bia, asAdmin, 'u-bia')).rejects.toBeInstanceOf(DomainError);
    });
  });

  describe('invite', () => {
    beforeEach(() => {
      users.getProfile.mockResolvedValue({ id: OWNER, name: 'Dono' });
      repo.isMemberByEmail.mockResolvedValue(false);
      repo.replacePendingInvite.mockImplementation(async (data) => ({
        id: 'i1',
        createdAt: now,
        acceptedAt: null,
        ...data,
      }));
    });

    it('cria o convite (7 dias) e envia o link', async () => {
      const before = Date.now();
      const invite = await service.invite(owner, asAdmin, { email: 'bia@teste.com', role: 'member' });

      const saved = repo.replacePendingInvite.mock.calls[0][0];
      expect(saved).toMatchObject({ workspaceId: 'w1', email: 'bia@teste.com' });
      expect(saved.expiresAt.getTime() - before).toBeGreaterThanOrEqual(7 * 86_400_000 - 1000);
      expect(invite).not.toHaveProperty('tokenHash');

      const { to, text } = mail.send.mock.calls[0][0];
      expect(to).toBe('bia@teste.com');
      const raw = /token=([A-Za-z0-9_-]+)/.exec(text)?.[1];
      expect(hashToken(raw!)).toBe(saved.tokenHash);
    });

    it('quem já é membro → ConflictError ALREADY_MEMBER', async () => {
      repo.isMemberByEmail.mockResolvedValue(true);
      await expect(service.invite(owner, asAdmin, { email: 'bia@teste.com', role: 'member' })).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(repo.replacePendingInvite).not.toHaveBeenCalled();
    });

    it('falha no envio do e-mail não derruba o convite', async () => {
      mail.send.mockRejectedValue(new Error('Resend fora'));
      await expect(service.invite(owner, asAdmin, { email: 'bia@teste.com', role: 'member' })).resolves.toMatchObject({
        id: 'i1',
      });
    });
  });

  describe('acceptInvite', () => {
    const invite = (over: Partial<InviteRow> = {}): InviteRow => ({
      id: 'i1',
      workspaceId: 'w1',
      email: 'bia@teste.com',
      role: 'member',
      tokenHash: hashToken('tok'),
      invitedBy: OWNER,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      createdAt: now,
      ...over,
    });

    it('vira membro e devolve o workspace com o papel do convite', async () => {
      repo.findInviteByTokenHash.mockResolvedValue(invite());
      repo.findMember.mockResolvedValue(member('u-bia', 'member'));
      await expect(service.acceptInvite(bia, { token: 'tok' })).resolves.toMatchObject({ id: 'w1', myRole: 'member' });
      expect(repo.findInviteByTokenHash).toHaveBeenCalledWith(hashToken('tok'));
      expect(repo.acceptInvite).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }), 'u-bia');
    });

    it('e-mail diferente do convidado → ForbiddenError', async () => {
      repo.findInviteByTokenHash.mockResolvedValue(invite({ email: 'outra@teste.com' }));
      await expect(service.acceptInvite(bia, { token: 'tok' })).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.acceptInvite).not.toHaveBeenCalled();
    });

    it('compara e-mail sem diferenciar maiúsculas', async () => {
      repo.findInviteByTokenHash.mockResolvedValue(invite({ email: 'BIA@Teste.com' }));
      repo.findMember.mockResolvedValue(member('u-bia', 'member'));
      await expect(service.acceptInvite(bia, { token: 'tok' })).resolves.toBeDefined();
    });

    it.each([
      ['inexistente', undefined],
      ['já aceito', invite({ acceptedAt: now })],
      ['expirado', invite({ expiresAt: new Date(Date.now() - 1000) })],
    ])('convite %s → INVALID_INVITE', async (_, row) => {
      repo.findInviteByTokenHash.mockResolvedValue(row);
      await expect(service.acceptInvite(bia, { token: 'tok' })).rejects.toMatchObject({ code: 'INVALID_INVITE' });
    });
  });

  it('revokeInvite de convite inexistente → NotFoundError', async () => {
    repo.deleteInvite.mockResolvedValue(false);
    await expect(service.revokeInvite(asAdmin, 'i9')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('isMember consulta a participação', async () => {
    repo.findMember.mockResolvedValueOnce(member('u-bia', 'member')).mockResolvedValueOnce(undefined);
    await expect(service.isMember('w1', 'u-bia')).resolves.toBe(true);
    await expect(service.isMember('w1', 'u-x')).resolves.toBe(false);
  });
});
