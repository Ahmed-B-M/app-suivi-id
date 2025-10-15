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

export function TicketsTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <p>Aucun ticket trouvé.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Raison</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead>ID Tâche</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium">{ticket.reason}</TableCell>
              <TableCell>
                <Badge variant={ticket.status === 'CLOSED' ? 'default' : 'secondary'}>
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(ticket.when).toLocaleDateString()}</TableCell>
              <TableCell>{ticket.task}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
