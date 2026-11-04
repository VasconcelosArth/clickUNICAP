import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher';

/**
 * Cadastro, login, sessão e recuperação de senha.
 * O guard global (JwtAuthGuard) e o JwtModule ficam no CoreAuthModule (src/core/auth).
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, PasswordHasher],
  exports: [PasswordHasher],
})
export class AuthModule {}
