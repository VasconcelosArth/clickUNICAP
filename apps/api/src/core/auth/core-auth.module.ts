import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfig } from '@/core/config';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * - JwtAuthGuard GLOBAL: toda rota exige login, exceto @Public().
 *   O segredo é passado em cada sign/verify (vem do AppConfig), por isso o JwtModule não tem config aqui.
 * - ThrottlerModule: limite de requisições por IP. Aplicado nas rotas de auth com @UseGuards(ThrottlerGuard)
 *   e ajustado por rota com @Throttle(). Desligado nos testes (NODE_ENV=test).
 */
@Global()
@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 20 }],
        skipIf: () => config.isTest,
        errorMessage: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [JwtModule, ThrottlerModule],
})
export class CoreAuthModule {}
