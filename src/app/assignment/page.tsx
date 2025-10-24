
"use client";

import { useState, useMemo, useTransition } from "react";
import { useFilters } from "@/context/filter-context";
import { useCollection } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { Tournee, ForecastRule } from "@/lib/types";
import { getCarrierFromDriver, getDriverFullName } from "@/lib/grouping";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AssignmentPage() {
    const { allRounds, isContextLoading } = useFilters();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [editedRounds, setEditedRounds] = useState<Record<string, string>>({});

    const rulesCollection = useMemo(() => firestore ? collection(firestore, "forecast_rules") : null, [firestore]);
    const { data: rulesData, loading: rulesLoading } = useCollection<ForecastRule>(rulesCollection);
    
    const [rules, setRules] = useState<ForecastRule[]>([]);
    const [newRule, setNewRule] = useState<Partial<ForecastRule>>({type: 'time', category: 'Matin', isActive: true});

    useMemo(() => {
        if (rulesData) setRules(rulesData);
    }, [rulesData]);

    const handleCarrierChange = (roundId: string, newCarrier: string) => {
        setEditedRounds(prev => ({ ...prev, [roundId]: newCarrier }));
    };

    const handleSaveChanges = () => {
        if (!firestore) return;
        startTransition(async () => {
            const batch = writeBatch(firestore);
            Object.entries(editedRounds).forEach(([roundId, carrier]) => {
                const roundRef = doc(firestore, "rounds", roundId);
                batch.update(roundRef, { carrierOverride: carrier });
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

    const handleRuleChange = (id: string, field: keyof ForecastRule, value: any) => {
        setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleAddRule = () => {
        if (!newRule.name || !newRule.keywords || !firestore) return;
        
        const tempId = `temp_${Date.now()}`;

        const ruleToAdd: ForecastRule = {
            id: tempId,
            name: newRule.name,
            type: newRule.type!,
            keywords: Array.isArray(newRule.keywords) ? newRule.keywords : (newRule.keywords as string).split(',').map(k => k.trim()),
            category: newRule.category!,
            isActive: newRule.isActive!
        };
        setRules([...rules, ruleToAdd]);
        setNewRule({type: 'time', category: 'Matin', isActive: true});
    }
    
    const handleDeleteRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    }

    const handleSaveRules = () => {
        if (!firestore) return;
        startTransition(async () => {
            const batch = writeBatch(firestore);
            rules.forEach(rule => {
                const keywordsAsArray = typeof rule.keywords === 'string' 
                    ? (rule.keywords as string).split(',').map(k => k.trim()) 
                    : rule.keywords;

                if (rule.id.startsWith('temp_')) {
                    // It's a new rule, create a new document reference
                    const newRuleRef = doc(collection(firestore, "forecast_rules"));
                    const { id, ...ruleData } = rule; // remove temporary id
                    batch.set(newRuleRef, { ...ruleData, keywords: keywordsAsArray });
                } else {
                    // It's an existing rule, update it
                    const ruleRef = doc(firestore, "forecast_rules", rule.id);
                    batch.set(ruleRef, { ...rule, keywords: keywordsAsArray });
                }
            });
            try {
                await batch.commit();
                toast({ title: "Succès", description: "Règles de prévision sauvegardées." });
            } catch (error: any) {
                console.error("Error saving rules:", error);
                toast({ title: "Erreur", description: `Erreur de sauvegarde des règles: ${error.message}`, variant: "destructive" });
            }
        });
    }

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
                    <CardTitle>Gestion des Règles de Prévision</CardTitle>
                    <CardDescription>
                        Activez, désactivez ou créez de nouvelles règles pour classifier les tournées (Matin, Soir, BU).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Button onClick={handleSaveRules} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2"/>}
                            Sauvegarder les règles
                        </Button>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Mots-clés</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map((rule) => (
                                <TableRow key={rule.id}>
                                <TableCell>
                                    <Input value={rule.name} onChange={(e) => handleRuleChange(rule.id, 'name', e.target.value)} />
                                </TableCell>
                                <TableCell>
                                    <Input value={Array.isArray(rule.keywords) ? rule.keywords.join(', ') : rule.keywords} onChange={(e) => handleRuleChange(rule.id, 'keywords', e.target.value)} />
                                </TableCell>
                                <TableCell><Badge>{rule.category}</Badge></TableCell>
                                <TableCell><Badge variant="secondary">{rule.type}</Badge></TableCell>
                                <TableCell>
                                    <Switch checked={rule.isActive} onCheckedChange={(checked) => handleRuleChange(rule.id, 'isActive', checked)} />
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell>
                                    <Input placeholder="Nom de la nouvelle règle" value={newRule.name || ''} onChange={(e) => setNewRule(p => ({...p, name: e.target.value}))}/>
                                </TableCell>
                                 <TableCell>
                                    <Input placeholder="Mots-clés (ex: soir, j)" value={newRule.keywords as string || ''} onChange={(e) => setNewRule(p => ({...p, keywords: e.target.value.split(',').map(k=>k.trim())}))}/>
                                </TableCell>
                                <TableCell>
                                    <Select value={newRule.category} onValueChange={(v) => setNewRule(p => ({...p, category: v as any}))}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Matin">Matin</SelectItem>
                                            <SelectItem value="Soir">Soir</SelectItem>
                                            <SelectItem value="BU">BU</SelectItem>
                                            <SelectItem value="Classique">Classique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                 <TableCell>
                                    <Select value={newRule.type} onValueChange={(v) => setNewRule(p => ({...p, type: v as any}))}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="time">Temps (nom entrepôt)</SelectItem>
                                            <SelectItem value="type">Type (nom tournée)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell>
                                    <Button size="sm" onClick={handleAddRule}><PlusCircle/> Ajouter</Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    )
}
