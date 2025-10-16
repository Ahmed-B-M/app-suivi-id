
"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { TaskDetails } from "./task-details";
import { Star } from "lucide-react";

export function TasksTable({ data }: { data: any[] }) {

  if (!data || data.length === 0) {
    return <p>Aucune tâche trouvée.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {data.map((task) => {
        const rating = task.metadata?.notationLivreur ?? task.notationLivreur ?? task.rating;
        const hasRating = typeof rating === 'number';

        return (
          <AccordionItem value={task.id || task._id} key={task.id || task._id}>
            <AccordionTrigger>
              <div className="flex items-center gap-4 justify-between w-full pr-4">
                  <span className="font-mono text-sm truncate">Tâche: {task.taskId || 'N/A'}</span>
                  <div className="flex items-center gap-4">
                    {hasRating && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {rating.toFixed(1)}
                      </Badge>
                    )}
                    <Badge variant={task.progress === 'COMPLETED' ? 'default' : 'secondary'}>
                        {task.progress}
                    </Badge>
                  </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <TaskDetails task={task} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
