"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
        return "Date invalide";
    }
}

const renderValue = (value: any): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Oui' : 'Non'}</Badge>;
  }
  if (Array.isArray(value)) {
    return (
        <div className="flex flex-col gap-2 pl-4 border-l">
            {value.map((item, index) => (
                <div key={index} className="border rounded-md p-2">
                    {renderValue(item)}
                </div>
            ))}
        </div>
    );
  }
   if (typeof value === 'object') {
    return (
      <div className="pl-4 border-l">
        <DataObjectTable data={value} />
      </div>
    );
  }
  return String(value);
};


const DataObjectTable = ({ data }: { data: any }) => {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <span className="text-muted-foreground">Données vides</span>;
  }
  
  return (
    <Table>
      <TableBody>
        {entries.map(([key, value]) => {
           if (value === null || value === undefined) return null;
           if (Array.isArray(value) && value.length === 0) return null;
           if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return null;

           return (
            <TableRow key={key}>
              <TableCell className="font-medium capitalize py-1 pr-2 w-1/3">{key.replace(/([A-Z])/g, ' $1')}</TableCell>
              <TableCell className="py-1">
                {renderValue(value)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};


export function TaskDetails({ taskData }: { taskData: Task }) {
  if (!taskData) return null;

  return (
    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
      <DataObjectTable data={taskData} />
    </div>
  );
}
