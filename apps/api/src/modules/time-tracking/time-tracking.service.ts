import { Injectable } from '@nestjs/common';
import type {
  CreateTimeEntryInput,
  CurrentTimer,
  MemberRole,
  RunningTimer,
  StartTimerResult,
  Task,
  TaskTimeEntries,
  TimeEntry,
  UpdateTimeEntryInput,
} from '@clickunicap/shared';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '@/core/errors';
import { ProjectsService } from '@/modules/projects/projects.service';
import { TasksService } from '@/modules/tasks/tasks.service';
import { TimeTrackingRepository, type TimeEntryRow } from './time-tracking.repository';
import { addMinutes, minutesBetween } from './utils/duration';

/** Tentativas de iniciar o timer quando outro início grava ao mesmo tempo. */
const START_ATTEMPTS = 2;

/** Quem está agindo: o usuário logado, o workspace ativo e o papel dele nesse workspace. */
export interface TimeContext {
  userId: string;
  workspaceId: string;
  role: MemberRole;
}

export function toTimeEntryDto(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    userName: row.userName,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    minutes: row.minutes,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRunningTimerDto(row: TimeEntryRow): RunningTimer {
  return { ...toTimeEntryDto(row), taskTitle: row.taskTitle };
}

/**
 * Regras do controle de tempo: cada usuário tem no máximo 1 timer ativo (iniciar outro para o anterior), quem edita ou exclui uma entrada é o autor
 * ou o admin do workspace, e projeto arquivado é somente leitura (mas um timer ativo ainda pode ser parado).
 */
@Injectable()
export class TimeTrackingService {
  constructor(
    private readonly repo: TimeTrackingRepository,
    private readonly tasks: TasksService,
    private readonly projects: ProjectsService,
  ) {}

  async listForTask(workspaceId: string, taskId: string): Promise<TaskTimeEntries> {
    await this.mustFindTask(workspaceId, taskId);
    const rows = await this.repo.listByTask(workspaceId, taskId);
    return {
      entries: rows.map(toTimeEntryDto),
      totalMinutes: rows.reduce((sum, r) => sum + (r.minutes ?? 0), 0),
    };
  }

  async current(workspaceId: string, userId: string): Promise<CurrentTimer> {
    const row = await this.repo.findRunning(workspaceId, userId);
    return { timer: row ? toRunningTimerDto(row) : null };
  }

  /**
   * Inicia o timer na tarefa. Se houver um ativo em outra tarefa deste workspace, ele é parado antes (vem em
   * `stopped`). Na mesma tarefa, devolve o timer que já conta. Num timer de outro workspace, não mexe.
   */
  async start(ctx: TimeContext, taskId: string): Promise<StartTimerResult> {
    const task = await this.mustFindTask(ctx.workspaceId, taskId);
    await this.assertNotArchived(ctx.workspaceId, task.projectId);

    // Dois inícios ao mesmo tempo: quem perde a corrida tenta de novo e para o timer de quem ganhou.
    for (let attempt = 0; attempt < START_ATTEMPTS; attempt++) {
      const now = new Date();
      const result = await this.repo.startReplacing(ctx.workspaceId, ctx.userId, taskId, now, (startedAt) =>
        minutesBetween(startedAt, now),
      );
      if ('rejected' in result) {
        if (result.rejected === 'elsewhere') {
          throw new ConflictError(
            'Você tem um timer ativo em outro workspace. Pare-o lá antes de iniciar outro.',
            'TIMER_RUNNING_ELSEWHERE',
          );
        }
        continue;
      }
      const timer = toTimeEntryDto(await this.mustLoad(ctx.workspaceId, result.startedId));
      const stopped = result.stoppedId ? toTimeEntryDto(await this.mustLoad(ctx.workspaceId, result.stoppedId)) : null;
      return { timer, stopped };
    }
    throw new ConflictError('Outro timer foi iniciado ao mesmo tempo. Tente de novo.', 'TIMER_ALREADY_RUNNING');
  }

  /** Para o timer ativo do usuário neste workspace. Funciona mesmo com o projeto arquivado. */
  async stop(ctx: TimeContext): Promise<TimeEntry> {
    const running = await this.repo.findRunning(ctx.workspaceId, ctx.userId);
    if (!running) throw new NotFoundError('Timer ativo');

    const endedAt = new Date();
    const stopped = await this.repo.stop(
      ctx.workspaceId,
      running.id,
      endedAt,
      minutesBetween(running.startedAt, endedAt),
    );
    if (!stopped) throw new NotFoundError('Timer ativo');
    return toTimeEntryDto(await this.mustLoad(ctx.workspaceId, running.id));
  }

  /** Lançamento manual. Sem `startedAt`, o tempo termina agora. */
  async create(ctx: TimeContext, taskId: string, input: CreateTimeEntryInput): Promise<TimeEntry> {
    const task = await this.mustFindTask(ctx.workspaceId, taskId);
    await this.assertNotArchived(ctx.workspaceId, task.projectId);

    const now = new Date();
    const startedAt = input.startedAt ? new Date(input.startedAt) : addMinutes(now, -input.minutes);
    const endedAt = addMinutes(startedAt, input.minutes);
    this.assertNotInFuture(endedAt, now);

    const created = await this.repo.insert({
      taskId,
      userId: ctx.userId,
      startedAt,
      endedAt,
      minutes: input.minutes,
      note: input.note ?? null,
    });
    if (!created) throw new ConflictError('Não foi possível gravar o lançamento', 'TIME_ENTRY_CONFLICT');
    return toTimeEntryDto(await this.mustLoad(ctx.workspaceId, created.id));
  }

  /**
   * Mudar os minutos mantém o fim e recalcula o início ("trabalhei 25 min, não 20, e terminei na mesma hora"):
   * assim a edição nunca leva o lançamento para o futuro. Os minutos de um timer ativo não mudam.
   */
  async update(ctx: TimeContext, id: string, input: UpdateTimeEntryInput): Promise<TimeEntry> {
    const entry = await this.mustLoad(ctx.workspaceId, id);
    this.assertCanManage(ctx, entry);
    await this.assertNotArchived(ctx.workspaceId, entry.projectId);

    const patch: Parameters<TimeTrackingRepository['update']>[2] = {};
    if (input.minutes !== undefined) {
      if (!entry.endedAt) {
        throw new ConflictError('Pare o timer antes de mudar os minutos', 'TIMER_RUNNING');
      }
      patch.minutes = input.minutes;
      patch.startedAt = addMinutes(entry.endedAt, -input.minutes);
    }
    if (input.note !== undefined) patch.note = input.note;

    if (!(await this.repo.update(ctx.workspaceId, id, patch))) throw new NotFoundError('Lançamento', id);
    return toTimeEntryDto(await this.mustLoad(ctx.workspaceId, id));
  }

  async delete(ctx: TimeContext, id: string): Promise<void> {
    const entry = await this.mustLoad(ctx.workspaceId, id);
    this.assertCanManage(ctx, entry);
    await this.assertNotArchived(ctx.workspaceId, entry.projectId);
    if (!(await this.repo.delete(ctx.workspaceId, id))) throw new NotFoundError('Lançamento', id);
  }

  private async mustFindTask(workspaceId: string, taskId: string): Promise<Task> {
    const task = await this.tasks.findOne(workspaceId, taskId);
    if (!task) throw new NotFoundError('Tarefa', taskId);
    return task;
  }

  private async mustLoad(workspaceId: string, id: string): Promise<TimeEntryRow> {
    const row = await this.repo.findById(workspaceId, id);
    if (!row) throw new NotFoundError('Lançamento', id);
    return row;
  }

  private assertCanManage(ctx: TimeContext, entry: TimeEntryRow) {
    if (entry.userId !== ctx.userId && ctx.role !== 'admin') {
      throw new ForbiddenError('Só quem lançou o tempo ou um admin do workspace pode alterar este lançamento');
    }
  }

  private assertNotInFuture(endedAt: Date, now: Date) {
    if (endedAt.getTime() > now.getTime()) {
      throw new DomainError('O lançamento não pode terminar no futuro', 'TIME_ENTRY_IN_FUTURE', 400);
    }
  }

  /** Mesma regra das tarefas: projeto arquivado é somente leitura. */
  private async assertNotArchived(workspaceId: string, projectId: string) {
    const project = await this.projects.get(workspaceId, projectId);
    if (project.archivedAt) throw new ConflictError('Este projeto está arquivado', 'PROJECT_ARCHIVED');
  }
}
