"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' });
    } catch (e) {
        return "Date invalide";
    }
}

const fieldsToRemove = [
  'endpoint', 'announcement', 'by', 'collect', 'externalCarrier', 'flux', 'hub',
  'barcodeEncoding', 'log.by', 'log.id', 'items.id', 'location.geocodeScore',
  'location.origin', 'location.precision', 'platform', 'platformName',
  'targetFlux', 'taskReference', 'trackingId', 'order', 'associated',
  'driver.id', 'round', 'realServiceTime.taskIdsDeliveredInSameStop',
  'realServiceTime.id', 'imagePath', 'id'
];

const shouldRemoveField = (key: string, path: string = ''): boolean => {
    const fullPath = path ? `${path}.${key}` : key;
    const genericPath = path.replace(/\.\d+\./, '.'); // items.0.id -> items.id
    const fullGenericPath = path ? `${genericPath}.${key}` : key;

    return fieldsToRemove.includes(key) || fieldsToRemove.includes(fullPath) || fieldsToRemove.includes(fullGenericPath);
}

const renderValue = (value: any, path: string): React.ReactNode => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Oui' : 'Non'}</Badge>;
  }
  if (value instanceof Date) {
    return formatDate(value.toISOString());
  }
  if (typeof value === 'string' && (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/).test(value)) {
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
        {entries.map(([key, value], index) => {
           const currentPath = Array.isArray(data) ? path : (path ? `${path}.${key}` : key);
           
           if (key === '_id' || shouldRemoveField(key, path)) return null;
           if (value === null || value === undefined) return null;
           if (Array.isArray(value) && value.length === 0) return null;
           if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return null;

           return (
            <TableRow key={key + index}>
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


export function TaskDetails({ task }: { task: any }) {
  if (!task) return null;

  return (
    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
      <DataObjectTable data={task} />
    </div>
  );
}
