
"use client";

import { useState, useMemo, useTransition } from "react";
import { useFilters } from "@/context/filter-context";
import { doc, writeBatch, collection, addDoc, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";
import { useFirebase, useQuery } from "@/firebase/provider";
import { getCarrierFromDriver, getDriverFullName, getDepotFromHub } from "@/lib/grouping";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building, Calendar, ChevronDown, ChevronRight, Briefcase, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from "date-fns";
import type { Tournee, BuRound, ForecastRule } from "@/lib/types";
import { errorEmitter, FirestorePermissionError } from "@/firebase";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

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

function BuRoundsManager() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { allRounds, allCarrierRules, availableDepots, forecastRules } = useFilters();
    const [isPending, startTransition] = useTransition();

    const buRules = useMemo(() => forecastRules.filter(r => r.type === 'type' && r.category === 'BU'), [forecastRules]);

    const existingBuRounds = useMemo(() => {
        return allRounds.filter(round => {
            const roundNameLower = round.nom?.toLowerCase() || '';
            return buRules.some(rule => rule.keywords.some(k => roundNameLower.startsWith(k.toLowerCase())));
        });
    }, [allRounds, buRules]);

    const { data: manualBuRounds = [], loading: manualLoading } = useQuery<BuRound>(
        firestore ? collection(firestore, 'bu_rounds') : null,
        [],
        { realtime: true }
    );
    
    const allBuRounds = useMemo(() => {
        const all = [...manualBuRounds];
        const manualNames = new Set(manualBuRounds.map(r => r.name));
        existingBuRounds.forEach(r => {
            if (!manualNames.has(r.nom)) {
                all.push({ id: r.id, name: r.nom, carrier: getCarrierFromDriver(r, allCarrierRules), depot: getDepotFromHub(r.nomHub, []), isActive: true, isAutoDetected: true } as any);
            }
        });
        return all.sort((a,b) => a.name.localeCompare(b.name));
    }, [manualBuRounds, existingBuRounds, allCarrierRules]);


    const [newRound, setNewRound] = useState<Partial<Omit<BuRound, 'id' | 'createdAt'>>>({ name: '', isActive: true, carrier: '', depot: '' });
    
    const carriers = useMemo(() => [...new Set(allCarrierRules.map(r => r.carrier))], [allCarrierRules]);

    const handleNewRoundChange = (field: keyof typeof newRound, value: any) => {
        setNewRound(prev => ({ ...prev, [field]: value }));
    };

    const handleAddRound = () => {
        if (!newRound.name || !newRound.carrier || !newRound.depot) {
            toast({ title: "Champs requis manquants", description: "Veuillez remplir le nom, le transporteur et le dépôt.", variant: "destructive" });
            return;
        }
        if (!firestore) return;

        startTransition(async () => {
            try {
                await addDoc(collection(firestore, 'bu_rounds'), { ...newRound, createdAt: serverTimestamp() });
                toast({ title: "Tournée BU ajoutée" });
                setNewRound({ name: '', isActive: true, carrier: '', depot: '' });
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    };

    const handleStatusChange = (id: string, isActive: boolean, isAutoDetected: boolean) => {
        if (!firestore) return;
        
        startTransition(async () => {
            try {
                if (isAutoDetected) {
                     toast({ title: "Action non permise", description: "Le statut des tournées détectées automatiquement ne peut être changé ici.", variant: "destructive" });
                     return;
                }
                await updateDoc(doc(firestore, "bu_rounds", id), { isActive });
                toast({ title: "Statut mis à jour" });
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    };
    
    const handleDeleteRound = (id: string, isAutoDetected?: boolean) => {
        if (isAutoDetected || !firestore) return;
        startTransition(async () => {
             try {
                await deleteDoc(doc(firestore, "bu_rounds", id));
                toast({ title: "Tournée BU manuelle supprimée" });
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase /> Gestion des Tournées BU</CardTitle>
                <CardDescription>
                    Créez, activez ou désactivez des tournées BU. Seules les tournées actives sont comptées dans les statistiques.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de la Tournée</TableHead>
                                <TableHead>Transporteur</TableHead>
                                <TableHead>Dépôt</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Statut Actif</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell><Input placeholder="Nom tournée" value={newRound.name} onChange={e => handleNewRoundChange('name', e.target.value)} /></TableCell>
                                <TableCell>
                                    <Select value={newRound.carrier} onValueChange={v => handleNewRoundChange('carrier', v)}>
                                        <SelectTrigger><SelectValue placeholder="Transporteur..."/></SelectTrigger>
                                        <SelectContent>{carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select value={newRound.depot} onValueChange={v => handleNewRoundChange('depot', v)}>
                                        <SelectTrigger><SelectValue placeholder="Dépôt..."/></SelectTrigger>
                                        <SelectContent>{availableDepots.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell><Badge variant="outline">Manuelle</Badge></TableCell>
                                <TableCell><Switch checked={newRound.isActive} onCheckedChange={c => handleNewRoundChange('isActive', c)} /></TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={handleAddRound} disabled={isPending}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
                                </TableCell>
                            </TableRow>
                            {allBuRounds.map((round: BuRound & {isAutoDetected?: boolean}) => (
                                <TableRow key={round.id}>
                                    <TableCell className="font-medium">{round.name}</TableCell>
                                    <TableCell>{round.carrier}</TableCell>
                                    <TableCell>{round.depot}</TableCell>
                                    <TableCell>
                                        <Badge variant={round.isAutoDetected ? "secondary" : "default"}>
                                            {round.isAutoDetected ? "Auto" : "Manuelle"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell><Switch checked={round.isActive} onCheckedChange={c => handleStatusChange(round.id, c, !!round.isAutoDetected)} disabled={isPending} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRound(round.id, round.isAutoDetected)} disabled={isPending || round.isAutoDetected}><Trash2 className="text-destructive h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

export default function AssignmentPage() {
    const { allRounds, allCarrierRules, allDepotRules } = useFilters();
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
        return groupRoundsBy(allRounds, (round) => getDepotFromHub(round.nomHub, allDepotRules));
    }, [allRounds, allDepotRules]);
    
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
            const determinedCarrier = getCarrierFromDriver(round, allCarrierRules);
            if (determinedCarrier !== 'Inconnu') carriers.add(determinedCarrier);
            if (round.carrierOverride) carriers.add(round.carrierOverride);
        });
        return Array.from(carriers).sort();
    }, [allRounds, allCarrierRules]);
    
    const sortedDepots = useMemo(() => Object.keys(roundsByDepotAndDate).sort(), [roundsByDepotAndDate]);

    return (
        <main className="container mx-auto py-8 space-y-8">
            <BuRoundsManager />
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
                            Sauvegarder les Affectations ({Object.keys(editedRounds).length})
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
                                                                                    <TableCell className="font-medium">{round.nom}</TableCell>
                                                                                    <TableCell>{getDriverFullName(round)}</TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="outline">{getCarrierFromDriver({ ...round, carrierOverride: undefined }, allCarrierRules)}</Badge>
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
                                                                                                <SelectItem value="default">Défaut ({getCarrierFromDriver({ ...round, carrierOverride: undefined }, allCarrierRules)})</SelectItem>
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
