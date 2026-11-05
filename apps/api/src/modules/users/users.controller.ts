import { Controller, Get, Patch } from '@nestjs/common';
import { updateProfileSchema, userSchema, type UpdateProfileInput } from '@clickunicap/shared';
import { CurrentUser, type AuthUser } from '@/core/auth';
import { ZodBody, ZodResponse } from '@/core/swagger/zod-body';
import { UsersService } from './users.service';

/** Perfil do usuário logado. */
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  /** GET /api/users/me */
  @Get('me')
  @ZodResponse(userSchema)
  me(@CurrentUser() user: AuthUser) {
    return this.service.getProfile(user.id);
  }

  /** PATCH /api/users/me — altera nome e/ou avatar */
  @Patch('me')
  @ZodResponse(userSchema)
  update(@CurrentUser() user: AuthUser, @ZodBody(updateProfileSchema) body: UpdateProfileInput) {
    return this.service.updateProfile(user.id, body);
  }
}
