import type { Attachment } from '@clickunicap/shared';
import { http, HttpResponse } from 'msw';
import { ids } from '@/mocks/fixtures';

const CREATED_AT = '2026-11-04T12:00:00.000Z';

export const attachmentIds = {
  pdf: '77777777-7777-4777-8777-777777777771',
  image: '77777777-7777-4777-8777-777777777772',
  sheet: '77777777-7777-4777-8777-777777777773',
};

export const attachmentFixtures: Attachment[] = [
  {
    id: attachmentIds.pdf,
    taskId: ids.task,
    fileName: 'briefing.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245_760,
    uploadedBy: ids.user,
    createdAt: CREATED_AT,
  },
  {
    id: attachmentIds.image,
    taskId: ids.task,
    fileName: 'wireframe.png',
    mimeType: 'image/png',
    sizeBytes: 1_258_291,
    uploadedBy: ids.otherUser,
    createdAt: CREATED_AT,
  },
  {
    id: attachmentIds.sheet,
    taskId: ids.task,
    fileName: 'orcamento.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 512,
    uploadedBy: ids.otherUser,
    createdAt: CREATED_AT,
  },
];

/** PNG de 1×1, para o preview. */
const PNG_BYTES = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
);

export const attachmentsHandlers = [
  http.get('*/tasks/:taskId/attachments', () => HttpResponse.json(attachmentFixtures)),
  http.post('*/tasks/:taskId/attachments', ({ params }) =>
    HttpResponse.json<Attachment>(
      {
        id: '77777777-7777-4777-8777-777777777779',
        taskId: String(params.taskId),
        fileName: 'novo-arquivo.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        uploadedBy: ids.user,
        createdAt: CREATED_AT,
      },
      { status: 201 },
    ),
  ),
  http.get('*/attachments/:id/download', ({ params }) => {
    const attachment = attachmentFixtures.find((item) => item.id === params.id);
    const isImage = attachment?.mimeType.startsWith('image/');
    return new HttpResponse(isImage ? PNG_BYTES : '%PDF-1.7 exemplo', {
      headers: {
        'Content-Type': attachment?.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment?.fileName ?? 'arquivo'}"`,
      },
    });
  }),
  http.delete('*/attachments/:id', () => new HttpResponse(null, { status: 204 })),
];
