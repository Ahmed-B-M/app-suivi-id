
"use client";

import { useState, useMemo, useTransition } from "react";
import { useFilters } from "@/context/filter-context";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { getCarrierFromDriver, getDriverFullName, getDepotFromHub } from "@/lib/grouping";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import type { Tournee } from "@/lib/types";
import { errorEmitter, FirestorePermissionError } from "@/firebase";

// Helper to group rounds by a key
function groupRoundsBy<T extends keyof any>(rounds: Tournee[], getKey: (round: Tournee) => T) {
    return rounds.reduce((acc, round) => {
        const key = getKey(round);
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(round);
        return acc;
    }, {} as Record<T, Tournee[]>);
}


export default function AssignmentPage() {
    const { allRounds } = useFilters();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [editedRounds, setEditedRounds] = useState<Record<string, string>>({});

    const handleCarrierChange = (roundId: string, newCarrier: string) => {
        setEditedRounds(prev => ({ ...prev, [roundId]: newCarrier }));
    };

    const handleSaveChanges = () => {
        if (!firestore) return;
        startTransition(async () => {
            const batch = writeBatch(firestore);
            const roundIds = Object.keys(editedRounds);
            
            roundIds.forEach((roundId) => {
                const roundRef = doc(firestore, "rounds", roundId);
                const newCarrier = editedRounds[roundId];
                batch.update(roundRef, { carrierOverride: newCarrier === 'default' ? null : newCarrier });
            });

            try {
                await batch.commit();
                toast({ title: "Succès", description: `${roundIds.length} affectation(s) sauvegardée(s).` });
                setEditedRounds({});
            } catch (error: any) {
                toast({ title: "Erreur de Sauvegarde", description: error.message, variant: "destructive" });
                 const permissionError = new FirestorePermissionError({
                    path: 'rounds',
                    operation: 'write',
                    requestResourceData: roundIds.map(id => ({ roundId: id, carrierOverride: editedRounds[id] }))
                 });
                errorEmitter.emit('permission-error', permissionError);
            }
        });
    };

    const groupedByDepot = useMemo(() => {
        return groupRoundsBy(allRounds, (round) => getDepotFromHub(round.nomHub));
    }, [allRounds]);
    
    const roundsByDepotAndDate = useMemo(() => {
        const result: Record<string, Record<string, Tournee[]>> = {};
        for (const depot in groupedByDepot) {
            result[depot] = groupRoundsBy(groupedByDepot[depot], (round) => 
                round.date ? format(new Date(round.date as string), 'yyyy-MM-dd') : 'Sans Date'
            );
        }
        return result;
    }, [groupedByDepot]);

    const availableCarriers = useMemo(() => {
        const carriers = new Set<string>();
        allRounds.forEach(round => {
            const determinedCarrier = getCarrierFromDriver(round);
            if (determinedCarrier !== 'Inconnu') carriers.add(determinedCarrier);
            if (round.carrierOverride) carriers.add(round.carrierOverride);
        });
        return Array.from(carriers).sort();
    }, [allRounds]);
    
    const sortedDepots = useMemo(() => Object.keys(roundsByDepotAndDate).sort(), [roundsByDepotAndDate]);

    return (
        <main className="container mx-auto py-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Affectation des Transporteurs par Tournée</CardTitle>
                    <CardDescription>
                        Visualisez et modifiez le transporteur assigné à chaque tournée. Les modifications ici outrepassent les règles de déduction automatique.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleSaveChanges} disabled={isPending || Object.keys(editedRounds).length === 0}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Sauvegarder ({Object.keys(editedRounds).length})
                        </Button>
                    </div>

                    <Accordion type="multiple" className="w-full space-y-4">
                        {sortedDepots.map(depot => (
                             <AccordionItem value={depot} key={depot} className="border-b-0">
                                <Card>
                                    <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                                        <div className="w-full flex justify-between items-center">
                                            <span className="flex items-center gap-3"><Building />{depot}</span>
                                            <Badge variant="outline">{groupedByDepot[depot].length} tournées</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0 pt-0">
                                        <div className="p-4 bg-muted/50">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                                {Object.entries(roundsByDepotAndDate[depot]).sort((a,b) => b[0].localeCompare(a[0])).map(([date, rounds]) => (
                                                    <AccordionItem value={date} key={date} className="border-b-0">
                                                        <Card>
                                                            <AccordionTrigger className="p-3 hover:no-underline font-semibold text-base">
                                                                <div className="w-full flex justify-between items-center">
                                                                    <span className="flex items-center gap-3"><Calendar />{format(new Date(date), 'dd MMMM yyyy')}</span>
                                                                    <Badge variant="secondary">{rounds.length} tournées</Badge>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="p-0 pt-0">
                                                                <div className="p-3 bg-background">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Tournée</TableHead>
                                                                                <TableHead>Livreur</TableHead>
                                                                                <TableHead>Transporteur Déduit</TableHead>
                                                                                <TableHead className="w-[250px]">Changer l'affectation</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {rounds.map(round => (
                                                                                <TableRow key={round.id}>
                                                                                    <TableCell className="font-medium">{round.name}</TableCell>
                                                                                    <TableCell>{getDriverFullName(round)}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{getCarrierFromDriver({ ...round, carrierOverride: undefined })}</Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Select
                                                                                            value={editedRounds[round.id] || round.carrierOverride || 'default'}
                                                                                            onValueChange={(value) => handleCarrierChange(round.id, value)}
                                                                                        >
                                                                                            <SelectTrigger>
                                                                                                <SelectValue />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                <SelectItem value="default">Défaut ({getCarrierFromDriver({ ...round, carrierOverride: undefined })})</SelectItem>
                                                                                                {availableCarriers.map(carrier => (
                                                                                                    <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                                                                                                ))}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </AccordionContent>
                                                        </Card>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        ))}
                    </Accordion>
                     {allRounds.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 border rounded-lg">
                            Aucune tournée à afficher pour la période sélectionnée.
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
