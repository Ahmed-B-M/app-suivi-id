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

export function RoundsTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <p>Aucune tournée trouvée.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Hub</TableHead>
            <TableHead>Chauffeur</TableHead>
            <TableHead>Tâches</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((round) => (
            <TableRow key={round.id}>
              <TableCell className="font-medium">{round.name}</TableCell>
               <TableCell>
                <Badge variant={round.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {round.status}
                </Badge>
              </TableCell>
              <TableCell>{new Date(round.date).toLocaleDateString()}</TableCell>
              <TableCell>{round.hub?.externalId || "N/A"}</TableCell>
              <TableCell>{round.driver?.firstName || 'Non assigné'}</TableCell>
               <TableCell>{round.orderCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
