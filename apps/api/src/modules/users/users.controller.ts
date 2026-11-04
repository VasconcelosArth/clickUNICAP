import { Body, Controller, Get, Patch } from '@nestjs/common';
import { updateProfileSchema, type UpdateProfileInput } from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { ZodValidationPipe } from '@/core/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

/** Perfil do usuário logado. */
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  /** GET /api/users/me */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.service.getProfile(user.id);
  }

  /** PATCH /api/users/me — altera nome e/ou avatar */
  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput) {
    return this.service.updateProfile(user.id, body);
  }
}
