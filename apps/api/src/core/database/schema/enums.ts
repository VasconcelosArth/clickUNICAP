import { pgEnum } from 'drizzle-orm/pg-core';
import {
  CUSTOM_FIELD_TYPES,
  MEMBER_ROLES,
  NOTIFICATION_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@clickunicap/shared';

/**
 * Enums do Postgres. Os VALORES vêm de @clickunicap/shared, então banco, API e frontend
 * nunca divergem. Mudou um valor no shared? Gere uma migration.
 */
export const memberRoleEnum = pgEnum('member_role', MEMBER_ROLES);
export const taskStatusEnum = pgEnum('task_status', TASK_STATUSES);
export const taskPriorityEnum = pgEnum('task_priority', TASK_PRIORITIES);
export const notificationTypeEnum = pgEnum('notification_type', NOTIFICATION_TYPES);
export const customFieldTypeEnum = pgEnum('custom_field_type', CUSTOM_FIELD_TYPES);
