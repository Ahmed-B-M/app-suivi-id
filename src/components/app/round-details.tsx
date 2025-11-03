"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tournee } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

const formatDate = (dateValue?: string | Date | Timestamp) => {
    if (!dateValue) return "N/A";

    try {
        let date: Date;
        if (dateValue instanceof Timestamp) {
            date = dateValue.toDate();
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            // Attempt to parse the string
            date = new Date(dateValue);
        }

        // Check if the date is valid after conversion/parsing
        if (isNaN(date.getTime())) {
            return "Date invalide";
        }

        return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' });
    } catch (e) {
        console.error("Failed to format date:", dateValue, e);
        return "Date invalide";
    }
}


const renderValue = (value: any, path: string): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Oui' : 'Non'}</Badge>;
  }
  // Use the robust formatDate for any potential date-like value
  if (value instanceof Date || value instanceof Timestamp || (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))) {
      return formatDate(value);
  }
  if (typeof value === 'object') {
    return (
      <div className="pl-4 border-l">
        <DataObjectTable data={value} path={path} />
      </div>
    );
  }
  return String(value);
};


const DataObjectTable = ({ data, path = '' }: { data: any, path?: string }) => {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return <span className="text-muted-foreground">Données vides</span>;
  }
  
  return (
    <Table>
      <TableBody>
        {entries.map(([key, value]) => {
           const currentPath = Array.isArray(data) ? path : (path ? `${path}.${key}` : key);
           
           if (value === null || value === undefined) return null;
           if (Array.isArray(value) && value.length === 0) return null;
           // Avoid rendering empty objects
           if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return null;

           return (
            <TableRow key={currentPath}>
              <TableCell className="font-medium capitalize py-1 pr-2 w-1/3">{key.replace(/([A-Z])/g, ' $1')}</TableCell>
              <TableCell className="py-1">
                {Array.isArray(value) ? (
                   <div className="flex flex-col gap-2">
                    {value.map((item, itemIndex) => (
                      <div key={itemIndex} className="border rounded-md p-2">
                        {renderValue(item, `${currentPath}.${itemIndex}`)}
                      </div>
                    ))}
                  </div>
                ) : renderValue(value, currentPath)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};


export function RoundDetails({ round }: { round: Tournee }) {
  if (!round) return null;

  return (
    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
      <DataObjectTable data={round} />
    </div>
  );
}
