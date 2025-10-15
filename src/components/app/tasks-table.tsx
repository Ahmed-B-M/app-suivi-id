"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { TaskDetails } from "./task-details";

export function TasksTable({ data }: { data: any[] }) {

  if (!data || data.length === 0) {
    return <p>Aucune tâche trouvée.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {data.map((task) => (
        <AccordionItem value={task.id || task._id} key={task.id || task._id}>
          <AccordionTrigger>
            <div className="flex items-center gap-4 justify-between w-full pr-4">
                <span className="font-mono text-sm">Tâche: {task.taskId || 'N/A'}</span>
                <Badge variant={task.progress === 'COMPLETED' ? 'default' : 'secondary'}>
                    {task.progress}
                </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <TaskDetails task={task} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
