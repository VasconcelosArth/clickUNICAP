import type { Task } from '@clickunicap/shared';
import { taskSlots } from '@/app/slots/registry';
import type { TaskSlotRegion } from '@/app/slots/task-detail-slots';

export function TaskSlots({ region, task }: { region: TaskSlotRegion; task: Task }) {
  const slots = taskSlots.filter((slot) => slot.region === region).sort((a, b) => a.order - b.order);

  return (
    <>
      {slots.map(({ id, Component }) => (
        <section key={id} className="border-t border-gray-100 dark:border-gray-700/60 pt-5 mt-5">
          <Component taskId={task.id} projectId={task.projectId} />
        </section>
      ))}
    </>
  );
}
