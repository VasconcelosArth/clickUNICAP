import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { InvitesController, WorkspacesController } from './workspaces.controller';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [UsersModule],
  controllers: [WorkspacesController, InvitesController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService], // outros módulos usam isMember(); nunca o repository
})
export class WorkspacesModule {}
