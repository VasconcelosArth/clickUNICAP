import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, gt, isNull } from 'drizzle-orm';
import type { MemberRole } from '@clickunicap/shared';
import { DRIZZLE, type Database } from '@/core/database/database.module';
import { users, workspaceInvites, workspaceMembers, workspaces } from '@/core/database/schema';

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type InviteRow = typeof workspaceInvites.$inferSelect;
export type MemberRow = typeof workspaceMembers.$inferSelect & {
  name: string;
  email: string;
  avatarUrl: string | null;
};

/** Workspaces, membros e convites. Toda leitura de membro/convite é filtrada pelo workspace. */
@Injectable()
export class WorkspacesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ---------- workspaces ----------

  /** Cria o workspace e já coloca o criador como admin, numa transação só. */
  async createWithOwner(name: string, ownerId: string): Promise<WorkspaceRow> {
    return this.db.transaction(async (tx) => {
      const [ws] = await tx.insert(workspaces).values({ name, ownerId }).returning();
      if (!ws) throw new Error('Falha ao criar workspace');
      await tx.insert(workspaceMembers).values({ workspaceId: ws.id, userId: ownerId, role: 'admin' });
      return ws;
    });
  }

  async listForUser(userId: string): Promise<(WorkspaceRow & { myRole: MemberRole })[]> {
    const rows = await this.db
      .select({ ws: workspaces, myRole: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(asc(workspaces.name));
    return rows.map((r) => ({ ...r.ws, myRole: r.myRole }));
  }

  async findById(id: string): Promise<WorkspaceRow | undefined> {
    const [row] = await this.db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    return row;
  }

  async rename(id: string, name: string): Promise<WorkspaceRow | undefined> {
    const [row] = await this.db.update(workspaces).set({ name }).where(eq(workspaces.id, id)).returning();
    return row;
  }

  /** Apaga o workspace e, em cascata, projetos, tarefas, membros e convites. */
  async delete(id: string): Promise<void> {
    await this.db.delete(workspaces).where(eq(workspaces.id, id));
  }

  // ---------- membros ----------

  async listMembers(workspaceId: string): Promise<MemberRow[]> {
    return this.db
      .select({
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(asc(users.name));
  }

  async findMember(workspaceId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .limit(1);
    return row;
  }

  async isMemberByEmail(workspaceId: string, email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(users.email, email)))
      .limit(1);
    return Boolean(row);
  }

  async countAdmins(workspaceId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'admin')));
    return row?.n ?? 0;
  }

  /** Idempotente: se já for membro, não faz nada. */
  async addMember(workspaceId: string, userId: string, role: MemberRole): Promise<void> {
    await this.db.insert(workspaceMembers).values({ workspaceId, userId, role }).onConflictDoNothing();
  }

  async updateMemberRole(workspaceId: string, userId: string, role: MemberRole): Promise<void> {
    await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  }

  // ---------- convites ----------

  async insertInvite(data: typeof workspaceInvites.$inferInsert): Promise<InviteRow> {
    const [row] = await this.db.insert(workspaceInvites).values(data).returning();
    if (!row) throw new Error('Falha ao criar convite');
    return row;
  }

  /** Convites ainda válidos (não aceitos e não expirados). */
  async listPendingInvites(workspaceId: string): Promise<InviteRow[]> {
    return this.db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.workspaceId, workspaceId),
          isNull(workspaceInvites.acceptedAt),
          gt(workspaceInvites.expiresAt, new Date()),
        ),
      )
      .orderBy(asc(workspaceInvites.createdAt));
  }

  async findInviteByTokenHash(tokenHash: string): Promise<InviteRow | undefined> {
    const [row] = await this.db.select().from(workspaceInvites).where(eq(workspaceInvites.tokenHash, tokenHash)).limit(1);
    return row;
  }

  async deleteInvite(workspaceId: string, inviteId: string): Promise<boolean> {
    const rows = await this.db
      .delete(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.id, inviteId)))
      .returning({ id: workspaceInvites.id });
    return rows.length > 0;
  }

  /** Ao reconvidar o mesmo e-mail, o convite antigo (ainda não aceito) é descartado. */
  async deletePendingInvitesForEmail(workspaceId: string, email: string): Promise<void> {
    await this.db
      .delete(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.workspaceId, workspaceId),
          eq(workspaceInvites.email, email),
          isNull(workspaceInvites.acceptedAt),
        ),
      );
  }

  /** Aceita o convite: vira membro e marca o convite, numa transação. */
  async acceptInvite(invite: InviteRow, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(workspaceMembers)
        .values({ workspaceId: invite.workspaceId, userId, role: invite.role })
        .onConflictDoNothing();
      await tx.update(workspaceInvites).set({ acceptedAt: new Date() }).where(eq(workspaceInvites.id, invite.id));
    });
  }
}
