
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
import Link from "next/link";
import { Button } from "../ui/button";
import type { Tache } from "@/lib/types";

export function TasksTable({ data }: { data: Tache[] }) {

  if (!data || data.length === 0) {
    return <p>Aucune tâche trouvée.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {data.map((task, index) => {
        const rating = task.notationLivreur;
        const hasRating = typeof rating === 'number';
        const key = task.tacheId ? `${task.tacheId.toString()}-${index}` : index.toString();

        return (
          <AccordionItem value={key} key={key}>
            <AccordionTrigger>
              <div className="flex items-center gap-4 justify-between w-full pr-4">
                  <span className="font-mono text-sm truncate">Tâche: {task.tacheId || 'N/A'}</span>
                  <div className="flex items-center gap-2">
                    {hasRating && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {rating.toFixed(1)}
                      </Badge>
                    )}
                    <Badge variant={task.progression === 'COMPLETED' ? 'default' : 'secondary'}>
                        {task.progression}
                    </Badge>
                     <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                       <Link href={`/task/${task.tacheId}`}>
                          Voir Détails
                       </Link>
                    </Button>
                  </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <TaskDetails taskData={task} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

    