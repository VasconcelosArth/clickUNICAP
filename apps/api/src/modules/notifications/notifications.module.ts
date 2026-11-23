import { Module } from '@nestjs/common';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { UsersModule } from '@/modules/users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

/** Dono: Pessoa 5. Caixa de entrada: ouve os eventos de domínio e guarda as notificações de cada usuário. */
@Module({
  imports: [TasksModule, UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
