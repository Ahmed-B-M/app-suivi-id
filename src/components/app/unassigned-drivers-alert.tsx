
"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, UserCog } from "lucide-react";

interface UnassignedDriversAlertProps {
  unassignedDrivers: string[];
}

export function UnassignedDriversAlert({
  unassignedDrivers,
}: UnassignedDriversAlertProps) {
  if (unassignedDrivers.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mt-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Livreurs non assignés à un transporteur !</AlertTitle>
      <AlertDescription>
        <div className="flex justify-between items-start">
            <div>
                <p>
                    {unassignedDrivers.length} livreur(s) n'ont pas pu être affectés à un
                    transporteur selon les règles actuelles.
                </p>
                 <ScrollArea className="h-24 mt-2 pr-4">
                    <ul className="list-disc list-inside text-xs">
                        {unassignedDrivers.map(driver => <li key={driver}>{driver}</li>)}
                    </ul>
                </ScrollArea>
            </div>
            {/* The button is currently disabled as the functionality is not implemented yet */}
            <Button size="sm" className="mt-2" disabled>
                <UserCog className="mr-2 h-4 w-4"/>
                Gérer les affectations
            </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
