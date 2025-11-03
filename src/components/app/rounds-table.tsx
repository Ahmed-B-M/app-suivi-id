
"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { RoundDetails } from "./round-details";
import { Tournee } from "@/lib/types";

export function RoundsTable({ data }: { data: Tournee[] }) {
  if (!data || data.length === 0) {
    return <p>Aucune tournée trouvée.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {data.map((round) => (
        <AccordionItem value={round.id} key={round.id}>
          <AccordionTrigger>
            <div className="flex items-center gap-4 justify-between w-full pr-4">
              <span className="font-mono text-sm">
                Tournée: {round.nom}
              </span>
              <Badge
                variant={round.statut === "COMPLETED" ? "default" : "secondary"}
              >
                {round.statut}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <RoundDetails round={round} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

    