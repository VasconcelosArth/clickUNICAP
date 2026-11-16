import type { ComponentType } from 'react';

export type TaskSlotProps = { taskId: string; projectId: string };
export type TaskSlotRegion = 'main' | 'activity' | 'sidebar' | 'attachments';

export interface TaskSlot {
  id: string;
  region: TaskSlotRegion;
  order: number;
  Component: ComponentType<TaskSlotProps>;
}
