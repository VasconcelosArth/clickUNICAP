import { Injectable, Logger } from '@nestjs/common';
import type {
  AcceptInviteInput,
  CreateWorkspaceInput,
  InviteMemberInput,
  MemberRole,
  MemberWithUser,
  MyWorkspace,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceInvite,
} from '@clickunicap/shared';
import type { AuthUser } from '@/core/auth';
import { generateOpaqueToken, hashToken } from '@/core/auth/opaque-token';
import { AppConfig } from '@/core/config';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '@/core/errors';
import type { WorkspaceContext } from '@/core/guards';
import { MailService } from '@/core/mail/mail.service';
import { workspaceInviteEmail } from '@/core/mail/templates/workspace-invite.template';
import { UsersService } from '@/modules/users/users.service';
import { toInviteDto, toMemberDto, toMyWorkspaceDto, toWorkspaceDto } from './workspaces.mapper';
import { type WorkspaceRow, WorkspacesRepository } from './workspaces.repository';

export const INVITE_TTL_DAYS = 7;

/**
 * Regras de workspace:
 * - quem cria vira DONO (owner_id) e admin;
 * - o dono não pode ser removido, sair, nem perder o papel de admin; só ele apaga o workspace;
 * - sempre precisa existir pelo menos 1 admin;
 * - qualquer membro pode SAIR; só admin remove outras pessoas;
 * - convite vale 7 dias, é de uso único e só pode ser aceito pelo e-mail convidado.
 *
 * É EXPORTADO pelo WorkspacesModule: outros módulos usam `isMember()` (ex.: validar o responsável de uma tarefa).
 */
@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger('Workspaces');

  constructor(
    private readonly repo: WorkspacesRepository,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly config: AppConfig,
  ) {}

  // ---------- workspaces ----------

  async create(user: AuthUser, input: CreateWorkspaceInput): Promise<MyWorkspace> {
    const ws = await this.repo.createWithOwner(input.name, user.id);
    return toMyWorkspaceDto({ ...ws, myRole: 'admin' });
  }

  async listMine(user: AuthUser): Promise<MyWorkspace[]> {
    return (await this.repo.listForUser(user.id)).map(toMyWorkspaceDto);
  }

  async get(ws: WorkspaceContext): Promise<MyWorkspace> {
    return toMyWorkspaceDto({ ...(await this.mustFind(ws.id)), myRole: ws.role });
  }

  async rename(ws: WorkspaceContext, input: UpdateWorkspaceInput): Promise<Workspace> {
    const row = await this.repo.rename(ws.id, input.name);
    if (!row) throw new NotFoundError('Workspace', ws.id);
    return toWorkspaceDto(row);
  }

  async delete(user: AuthUser, ws: WorkspaceContext): Promise<void> {
    const row = await this.mustFind(ws.id);
    if (row.ownerId !== user.id) throw new ForbiddenError('Só o dono pode apagar o workspace');
    await this.repo.delete(ws.id);
  }

  /** Para outros módulos: o usuário pertence a este workspace? */
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    return Boolean(await this.repo.findMember(workspaceId, userId));
  }

  // ---------- membros ----------

  async listMembers(ws: WorkspaceContext): Promise<MemberWithUser[]> {
    const { ownerId } = await this.mustFind(ws.id);
    return (await this.repo.listMembers(ws.id)).map((m) => toMemberDto(m, ownerId));
  }

  async changeRole(ws: WorkspaceContext, targetUserId: string, role: MemberRole): Promise<void> {
    const row = await this.mustFind(ws.id);
    const target = await this.repo.findMember(ws.id, targetUserId);
    if (!target) throw new NotFoundError('Membro', targetUserId);
    if (target.role === role) return;

    if (targetUserId === row.ownerId) throw new ForbiddenError('O papel do dono do workspace não pode ser alterado');
    if (target.role === 'admin' && (await this.repo.countAdmins(ws.id)) <= 1) {
      throw new DomainError('O workspace precisa de pelo menos um administrador', 'LAST_ADMIN', 400);
    }
    await this.repo.updateMemberRole(ws.id, targetUserId, role);
  }

  /** Remove alguém (admin) ou sai do workspace (qualquer membro, quando targetUserId é ele mesmo). */
  async removeMember(user: AuthUser, ws: WorkspaceContext, targetUserId: string): Promise<void> {
    const row = await this.mustFind(ws.id);
    const isSelf = targetUserId === user.id;
    if (!isSelf && ws.role !== 'admin') throw new ForbiddenError('Só administradores podem remover membros');

    const target = await this.repo.findMember(ws.id, targetUserId);
    if (!target) throw new NotFoundError('Membro', targetUserId);
    if (targetUserId === row.ownerId) {
      throw new ForbiddenError(
        isSelf ? 'O dono não pode sair do workspace' : 'O dono do workspace não pode ser removido',
      );
    }
    if (target.role === 'admin' && (await this.repo.countAdmins(ws.id)) <= 1) {
      throw new DomainError('O workspace precisa de pelo menos um administrador', 'LAST_ADMIN', 400);
    }
    await this.repo.removeMember(ws.id, targetUserId);
  }

  // ---------- convites ----------

  async invite(user: AuthUser, ws: WorkspaceContext, input: InviteMemberInput): Promise<WorkspaceInvite> {
    const row = await this.mustFind(ws.id);
    if (await this.repo.isMemberByEmail(ws.id, input.email)) {
      throw new ConflictError('Essa pessoa já é membro do workspace', 'ALREADY_MEMBER');
    }

    const { raw, hash } = generateOpaqueToken();
    const invite = await this.repo.replacePendingInvite({
      workspaceId: ws.id,
      email: input.email,
      role: input.role,
      tokenHash: hash,
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    });

    const inviter = await this.users.getProfile(user.id);
    const link = `${this.config.webUrl}/invites/accept?token=${encodeURIComponent(raw)}`;
    try {
      await this.mail.send(
        workspaceInviteEmail({
          to: input.email,
          inviterName: inviter.name,
          workspaceName: row.name,
          link,
          validDays: INVITE_TTL_DAYS,
        }),
      );
    } catch (e) {
      // O convite fica salvo; o admin pode reenviar. Não derruba a requisição por falha do provedor.
      this.logger.error(`Falha ao enviar convite ${invite.id}: ${String(e)}`);
    }
    return toInviteDto(invite);
  }

  async listInvites(ws: WorkspaceContext): Promise<WorkspaceInvite[]> {
    return (await this.repo.listPendingInvites(ws.id)).map(toInviteDto);
  }

  async revokeInvite(ws: WorkspaceContext, inviteId: string): Promise<void> {
    if (!(await this.repo.deleteInvite(ws.id, inviteId))) throw new NotFoundError('Convite', inviteId);
  }

  async acceptInvite(user: AuthUser, input: AcceptInviteInput): Promise<MyWorkspace> {
    const invite = await this.repo.findInviteByTokenHash(hashToken(input.token));
    if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
      throw new DomainError('Convite inválido ou expirado', 'INVALID_INVITE', 400);
    }
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError('Este convite foi enviado para outro e-mail. Entre com a conta convidada.');
    }

    await this.repo.acceptInvite(invite, user.id);
    const member = await this.repo.findMember(invite.workspaceId, user.id);
    const ws = await this.mustFind(invite.workspaceId);
    return toMyWorkspaceDto({ ...ws, myRole: member?.role ?? invite.role });
  }

  // ---------- internos ----------

  private async mustFind(id: string): Promise<WorkspaceRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundError('Workspace', id);
    return row;
  }
}
