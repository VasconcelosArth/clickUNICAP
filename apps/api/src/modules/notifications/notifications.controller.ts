import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  listNotificationsQuerySchema,
  notificationPageSchema,
  notificationSchema,
  unreadCountSchema,
  type ListNotificationsQuery,
} from '@clickunicap/shared';
import { type AuthUser, CurrentUser } from '@/core/auth';
import { CurrentWorkspace, WorkspaceMemberGuard } from '@/core/guards';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { ZodResponse } from '@/core/swagger/zod-body';
import { NotificationsService } from './notifications.service';

/** /api/notifications — caixa de entrada do usuário logado, no workspace do header X-Workspace-Id. */
@ApiTags('notifications')
@UseGuards(WorkspaceMemberGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ZodResponse(notificationPageSchema)
  list(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery,
  ) {
    return this.service.list({ userId: user.id, workspaceId }, query);
  }

  @Get('unread-count')
  @ZodResponse(unreadCountSchema)
  unreadCount(@CurrentUser() user: AuthUser, @CurrentWorkspace() workspaceId: string) {
    return this.service.unreadCount({ userId: user.id, workspaceId });
  }

  @Post('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: AuthUser, @CurrentWorkspace() workspaceId: string) {
    return this.service.markAllRead({ userId: user.id, workspaceId });
  }

  @Post(':id/read')
  @HttpCode(200)
  @ZodResponse(notificationSchema)
  markRead(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead({ userId: user.id, workspaceId }, id);
  }
}
