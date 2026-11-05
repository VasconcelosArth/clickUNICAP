import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  acceptInviteSchema,
  createWorkspaceSchema,
  inviteMemberSchema,
  memberWithUserSchema,
  myWorkspaceSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceInviteSchema,
  workspaceSchema,
  type AcceptInviteInput,
  type CreateWorkspaceInput,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type UpdateWorkspaceInput,
} from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { CurrentMembership, Roles, RolesGuard, WorkspaceMemberGuard, type WorkspaceContext } from '@/core/guards';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { WorkspacesService } from './workspaces.service';

/**
 * /api/workspaces — o :workspaceId da rota é validado pelo WorkspaceMemberGuard (membro ou 404).
 * Ações de administração usam @Roles('admin').
 */
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  /** POST /api/workspaces — quem cria vira dono e admin */
  @Post()
  @ZodResponse(myWorkspaceSchema, 201)
  create(@CurrentUser() user: AuthUser, @ZodBody(createWorkspaceSchema) body: CreateWorkspaceInput) {
    return this.service.create(user, body);
  }

  /** GET /api/workspaces — workspaces de que sou membro, com o meu papel */
  @Get()
  @ZodResponse(z.array(myWorkspaceSchema))
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceMemberGuard)
  @ZodResponse(myWorkspaceSchema)
  get(@CurrentMembership() ws: WorkspaceContext) {
    return this.service.get(ws);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceMemberGuard, RolesGuard)
  @Roles('admin')
  @ZodResponse(workspaceSchema)
  rename(@CurrentMembership() ws: WorkspaceContext, @ZodBody(updateWorkspaceSchema) body: UpdateWorkspaceInput) {
    return this.service.rename(ws, body);
  }

  /** DELETE /api/workspaces/:id — só o dono (regra no service) */
  @Delete(':workspaceId')
  @HttpCode(204)
  @UseGuards(WorkspaceMemberGuard)
  delete(@CurrentUser() user: AuthUser, @CurrentMembership() ws: WorkspaceContext) {
    return this.service.delete(user, ws);
  }

  // ---------- membros ----------

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceMemberGuard)
  @ZodResponse(z.array(memberWithUserSchema))
  listMembers(@CurrentMembership() ws: WorkspaceContext) {
    return this.service.listMembers(ws);
  }

  @Patch(':workspaceId/members/:userId')
  @HttpCode(204)
  @UseGuards(WorkspaceMemberGuard, RolesGuard)
  @Roles('admin')
  changeRole(
    @CurrentMembership() ws: WorkspaceContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @ZodBody(updateMemberRoleSchema) body: UpdateMemberRoleInput,
  ) {
    return this.service.changeRole(ws, userId, body.role);
  }

  /** Admin remove alguém; qualquer membro pode remover a si mesmo (sair). */
  @Delete(':workspaceId/members/:userId')
  @HttpCode(204)
  @UseGuards(WorkspaceMemberGuard)
  removeMember(
    @CurrentUser() user: AuthUser,
    @CurrentMembership() ws: WorkspaceContext,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.removeMember(user, ws, userId);
  }

  // ---------- convites ----------

  @Post(':workspaceId/invites')
  @UseGuards(WorkspaceMemberGuard, RolesGuard)
  @Roles('admin')
  @ZodResponse(workspaceInviteSchema, 201)
  invite(
    @CurrentUser() user: AuthUser,
    @CurrentMembership() ws: WorkspaceContext,
    @ZodBody(inviteMemberSchema) body: InviteMemberInput,
  ) {
    return this.service.invite(user, ws, body);
  }

  @Get(':workspaceId/invites')
  @UseGuards(WorkspaceMemberGuard, RolesGuard)
  @Roles('admin')
  @ZodResponse(z.array(workspaceInviteSchema))
  listInvites(@CurrentMembership() ws: WorkspaceContext) {
    return this.service.listInvites(ws);
  }

  @Delete(':workspaceId/invites/:inviteId')
  @HttpCode(204)
  @UseGuards(WorkspaceMemberGuard, RolesGuard)
  @Roles('admin')
  revokeInvite(@CurrentMembership() ws: WorkspaceContext, @Param('inviteId', ParseUUIDPipe) inviteId: string) {
    return this.service.revokeInvite(ws, inviteId);
  }
}

/** POST /api/invites/accept — quem abre o link do e-mail (logado com a conta convidada). */
@Controller('invites')
export class InvitesController {
  constructor(private readonly service: WorkspacesService) {}

  @Post('accept')
  @HttpCode(200)
  @ZodResponse(myWorkspaceSchema)
  accept(@CurrentUser() user: AuthUser, @ZodBody(acceptInviteSchema) body: AcceptInviteInput) {
    return this.service.acceptInvite(user, body);
  }
}
