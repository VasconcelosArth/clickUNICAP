import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { attachmentSchema } from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { CurrentMembership, CurrentWorkspace, type WorkspaceContext, WorkspaceMemberGuard } from '@/core/guards';
import { ZodResponse } from '@/core/swagger/zod-body';
import { AttachmentFileInterceptor } from './attachments.interceptor';
import { AttachmentsService, type UploadedFileData } from './attachments.service';
import { attachmentDisposition } from './utils/content-disposition';

/** /api/tasks/:taskId/attachments — enviar e listar os anexos de uma tarefa. */
@ApiTags('attachments')
@UseGuards(WorkspaceMemberGuard)
@Controller('tasks/:taskId/attachments')
export class TaskAttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @UseInterceptors(AttachmentFileInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ZodResponse(attachmentSchema, 201)
  upload(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @UploadedFile() file: UploadedFileData | undefined,
  ) {
    return this.service.upload({ userId: user.id, workspaceId }, taskId, file);
  }

  @Get()
  @ZodResponse(z.array(attachmentSchema))
  list(@CurrentWorkspace() workspaceId: string, @Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.service.list(workspaceId, taskId);
  }
}

/** /api/attachments/:id — metadados, download e remoção. */
@ApiTags('attachments')
@UseGuards(WorkspaceMemberGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get(':id')
  @ZodResponse(attachmentSchema)
  get(@CurrentWorkspace() workspaceId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(workspaceId, id);
  }

  /** Always a download, never rendered by the browser, so an uploaded file cannot run as a page. */
  @Get(':id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Conteúdo do arquivo', schema: { type: 'string', format: 'binary' } })
  async download(
    @CurrentWorkspace() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.service.download(workspaceId, id);
    return new StreamableFile(file.content, {
      type: file.mimeType,
      disposition: attachmentDisposition(file.fileName),
      length: file.content.length,
    });
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspaceId: string,
    @CurrentMembership() membership: WorkspaceContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove({ userId: user.id, workspaceId, isAdmin: membership.role === 'admin' }, id);
  }
}
