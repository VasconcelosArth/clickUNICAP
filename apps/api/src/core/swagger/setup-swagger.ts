import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACCESS_COOKIE } from '@/core/auth/auth.constants';

/** Documentação em /api/docs e JSON em /api/docs-json. Não é publicada em produção. */
export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('ClickUNICAP API')
    .setDescription('Rotas de negócio pedem o header X-Workspace-Id. O login grava os cookies de sessão.')
    .setVersion('0.1.0')
    .addCookieAuth(ACCESS_COOKIE)
    .addBearerAuth()
    .addGlobalParameters({ name: 'X-Workspace-Id', in: 'header', required: false, schema: { type: 'string' } })
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));
}
