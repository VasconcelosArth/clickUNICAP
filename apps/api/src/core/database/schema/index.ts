/**
 * Schema completo do banco. O drizzle-kit lê este arquivo para gerar migrations.
 * Arquivos por domínio:
 *   users.ts          → users, refresh_tokens, password_reset_tokens       (Pessoa 1)
 *   workspaces.ts     → workspaces, workspace_members, workspace_invites   (Pessoa 1)
 *   projects.ts       → projects                                           (Pessoa 1)
 *   tasks.ts          → tasks                                              (Pessoa 1)
 *   collaboration.ts  → subtasks, comments, comment_mentions, notifications (Pessoas 4 e 5)
 *   phase2.ts         → attachments, custom_fields, task_custom_field_values,
 *                       task_dependencies, time_entries                     (Pessoas 7 a 10)
 */
export * from './enums';
export * from './users';
export * from './workspaces';
export * from './projects';
export * from './tasks';
export * from './collaboration';
export * from './phase2';
