

"use client";

import { useState, useMemo, useTransition } from "react";
import { useFilters } from "@/context/filter-context";
import { useCollection } from "@/firebase";
import { collection, doc, writeBatch, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Tournee } from "@/lib/types";
import { getCarrierFromDriver, getDriverFullName } from "@/lib/grouping";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AssignmentPage() {
    const { allRounds, isContextLoading } = useFilters();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [editedRounds, setEditedRounds] = useState<Record<string, string>>({});
    
    // --- BU Rounds Logic ---
    const buCandidateRounds = useMemo(() => {
        return allRounds.filter(round => round.name?.toUpperCase().startsWith('R'));
    }, [allRounds]);

    const handleBuStatusChange = (roundId: string, isActive: boolean) => {
        if (!firestore) return;
        
        startTransition(async () => {
            const roundRef = doc(firestore, "rounds", roundId);
            try {
                await updateDoc(roundRef, { buStatus: isActive ? 'active' : 'inactive' });
                toast({ title: "Succès", description: `Statut de la tournée BU mis à jour.` });
            } catch(error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            }
        });
    }

    const handleCarrierChange = (roundId: string, newCarrier: string) => {
        setEditedRounds(prev => ({ ...prev, [roundId]: newCarrier }));
    };

    const handleSaveChanges = () => {
        if (!firestore) return;
        startTransition(async () => {
            const batch = writeBatch(firestore);
            Object.entries(editedRounds).forEach(([roundId, carrier]) => {
                const roundRef = doc(firestore, "rounds", roundId);
                batch.update(roundRef, { carrierOverride: carrier === 'default' ? null : carrier });
            });
            try {
                await batch.commit();
                toast({ title: "Succès", description: `${Object.keys(editedRounds).length} affectation(s) sauvegardée(s).` });
                setEditedRounds({});
            } catch (error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            }
        });
    };

    const availableCarriers = useMemo(() => {
        const carriers = new Set<string>();
        allRounds.forEach(round => {
            const determinedCarrier = getCarrierFromDriver(round);
            if (determinedCarrier !== 'Inconnu') carriers.add(determinedCarrier);
            if (round.carrierOverride) carriers.add(round.carrierOverride);
        });
        return Array.from(carriers).sort();
    }, [allRounds]);

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
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sauvegarder les modifications ({Object.keys(editedRounds).length})
                        </Button>
                    </div>
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
                            {allRounds.map(round => (
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Gestion des Tournées BU</CardTitle>
                    <CardDescription>
                        Activez ou désactivez les tournées BU détectées (nom commençant par "R"). Seules les tournées actives seront comptabilisées dans les prévisions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex justify-end mb-4">
                        <Button disabled>
                            <PlusCircle className="mr-2"/> Créer une tournée BU (Bientôt)
                        </Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de la Tournée</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Entrepôt</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Activée</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {buCandidateRounds.map((round) => (
                                <TableRow key={round.id}>
                                    <TableCell className="font-medium">{round.name}</TableCell>
                                    <TableCell>{round.date ? format(new Date(round.date as string), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{round.nomHub || 'N/A'}</TableCell>
                                    <TableCell><Badge variant="secondary">{round.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Switch 
                                            checked={round.buStatus !== 'inactive'}
                                            onCheckedChange={(checked) => handleBuStatusChange(round.id, checked)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                             {buCandidateRounds.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Aucune tournée BU potentielle trouvée pour cette période.</TableCell>
                                </TableRow>
                             )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}
