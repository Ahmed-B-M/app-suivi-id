"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";
import { TaskDetails } from "./task-details";

export function TasksTable({ data }: { data: any[] }) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  if (!data || data.length === 0) {
    return <p>Aucune tâche trouvée.</p>;
  }

  const handleViewDetails = (task: any) => {
    setSelectedTask(task);
  };

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Tâche</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Tournée</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-mono text-xs">
                  {task.taskId || "N/A"}
                </TableCell>
                <TableCell className="font-medium">
                  {task.contact?.person || "N/A"}
                </TableCell>
                <TableCell>{task.location?.city || "N/A"}</TableCell>
                <TableCell>{task.roundName || "N/A"}</TableCell>
                <TableCell>
                  {task.driver
                    ? `${task.driver.firstName || ""} ${
                        task.driver.lastName || ""
                      }`.trim()
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      task.progress === "COMPLETED" ? "default" : "secondary"
                    }
                  >
                    {task.progress}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(
                    task.date || task.timeWindow.start
                  ).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(task)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedTask && (
        <Dialog
          open={!!selectedTask}
          onOpenChange={(isOpen) => !isOpen && setSelectedTask(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Détails de la tâche : {selectedTask.taskId}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh] rounded-md border p-4">
              <TaskDetails task={selectedTask} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
