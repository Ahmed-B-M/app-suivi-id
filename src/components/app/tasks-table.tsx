"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function TasksTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <p>Aucune tâche trouvée.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Tournée</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.contact?.person || 'N/A'}</TableCell>
              <TableCell>{task.location?.city || 'N/A'}</TableCell>
              <TableCell>{task.roundName || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={task.progress === 'COMPLETED' ? 'default' : 'secondary'}>
                  {task.progress}
                </Badge>
              </TableCell>
              <TableCell>{new Date(task.date || task.timeWindow.start).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
