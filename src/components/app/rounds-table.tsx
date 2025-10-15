"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { RoundDetails } from "./round-details";

export function RoundsTable({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <p>Aucune tournée trouvée.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {data.map((round) => (
        <AccordionItem value={round.id || round._id} key={round.id || round._id}>
          <AccordionTrigger>
            <div className="flex items-center gap-4 justify-between w-full pr-4">
              <span className="font-mono text-sm">
                Tournée: {round.name}
              </span>
              <Badge
                variant={round.status === "COMPLETED" ? "default" : "secondary"}
              >
                {round.status}
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
