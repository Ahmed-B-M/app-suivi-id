"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function HubsTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <p>Aucun hub trouvé.</p>;
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>ID Externe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((hub) => (
            <TableRow key={hub.id}>
              <TableCell className="font-medium">{hub.name}</TableCell>
              <TableCell>{hub.address?.addressLines?.join(', ') || 'N/A'}</TableCell>
              <TableCell>{hub.externalId || "N/A"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
