
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ThumbsDown } from "lucide-react";
import { format } from "date-fns";

type NpsVerbatimData = {
    taskId: string;
    npsScore: number;
    verbatim: string;
    store: string;
    taskDate: string;
    carrier?: string;
    depot?: string;
    driver?: string;
};

interface NpsVerbatimAnalysisProps {
    data: NpsVerbatimData[];
}

export function NpsVerbatimAnalysis({ data }: NpsVerbatimAnalysisProps) {
    if (!data || data.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ThumbsDown className="text-destructive" /> Verbatims des Détracteurs</CardTitle>
                <CardDescription>
                    Analyse des commentaires laissés par les clients ayant donné une note de 0 à 6.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/4">Détails</TableHead>
                            <TableHead className="w-1/2">Verbatim</TableHead>
                            <TableHead className="text-right">Note NPS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.taskId}>
                                <TableCell>
                                    <div className="font-medium">{item.driver || 'N/A'}</div>
                                    <div className="text-sm text-muted-foreground">{item.carrier || 'N/A'}</div>
                                    <div className="text-xs text-muted-foreground">{item.depot || item.store || 'N/A'}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(item.taskDate), 'dd/MM/yyyy')}
                                    </div>
                                </TableCell>
                                <TableCell className="italic text-muted-foreground">"{item.verbatim}"</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="destructive">{item.npsScore}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
