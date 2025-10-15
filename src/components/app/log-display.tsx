import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";

type LogDisplayProps = {
  logs: string[];
};

export function LogDisplay({ logs }: LogDisplayProps) {
  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-2">
        <Terminal className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-xl">Logs</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow min-h-0">
        <ScrollArea className="h-full bg-muted/50 rounded-md p-4">
          <div className="text-sm font-code text-foreground">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">
                Les logs apparaîtront ici lorsque vous lancerez un export.
              </p>
            ) : (
              logs.map((log, index) => (
                <p key={index} className="whitespace-pre-wrap">
                  {log}
                </p>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
