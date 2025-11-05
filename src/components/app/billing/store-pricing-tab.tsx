
"use client";

import { useState, useMemo, useTransition } from "react";
import { useFilters } from "@/context/filter-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Save, Loader2, Calendar as CalendarIcon, Map, Zone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format, addDays } from "date-fns";

type RuleType = 'tournee' | 'tache' | 'jour' | 'semaine' | 'mois' | 'grille';

interface StoreRule {
    id: string;
    storeName: string;
    ruleType: RuleType;
    price: number;
    nonWorkedDays: Date[];
    grid?: {
        bacThreshold: number;
        zonePrices: { id: string; zoneName: string; price: number }[];
    }
}

const ruleTypeLabels: Record<RuleType, string> = {
    tournee: "Prix à la Tournée",
    tache: "Prix à la Tâche",
    jour: "Prix par Jour",
    semaine: "Prix par Semaine",
    mois: "Prix par Mois",
    grille: "Prix par Grille (Bacs/Zones)"
};

export function StorePricingTab() {
  const { availableStores } = useFilters();
  const [rules, setRules] = useState<StoreRule[]>([]);
  const [editingRule, setEditingRule] = useState<StoreRule | null>(null);

  const handleAddRule = (storeName: string) => {
    const newRule: StoreRule = {
        id: `${storeName}-${Date.now()}`,
        storeName: storeName,
        ruleType: 'jour', // default
        price: 0,
        nonWorkedDays: [],
        grid: {
            bacThreshold: 10,
            zonePrices: [{ id: `zone-${Date.now()}`, zoneName: 'Zone A', price: 0 }]
        }
    }
    setRules(prev => [...prev, newRule]);
    setEditingRule(newRule);
  };

  const handleUpdateRule = (updatedRule: StoreRule) => {
      setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
      if (editingRule && editingRule.id === updatedRule.id) {
          setEditingRule(updatedRule);
      }
  };
  
  const handleSaveAndClose = () => {
    // Here you would save the 'rules' state to Firestore
    console.log("Saving store pricing rules:", rules);
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }

  const groupedByStore = useMemo(() => {
    const allStores = [...new Set([...availableStores, ...rules.map(r => r.storeName)])];
    return allStores.sort().reduce((acc, storeName) => {
        acc[storeName] = rules.filter(rule => rule.storeName === storeName);
        return acc;
    }, {} as Record<string, StoreRule[]>);
  }, [rules, availableStores]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifs pour les Magasins</CardTitle>
        <CardDescription>
          Créez des règles de tarification personnalisées pour chaque magasin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        <Accordion type="multiple" className="w-full space-y-4">
            {Object.entries(groupedByStore).map(([storeName, storeRules]) => (
                <AccordionItem value={storeName} key={storeName} className="border-b-0">
                    <Card>
                         <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                            <div className="w-full flex justify-between items-center">
                                <span className="flex items-center gap-3">{storeName}</span>
                                <Badge variant="outline">{storeRules.length} règle(s)</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                           <div className="border rounded-lg p-4 space-y-4">
                                {storeRules.map(rule => (
                                    <div key={rule.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                        <div>
                                            <p className="font-semibold">{ruleTypeLabels[rule.ruleType]}</p>
                                            <p className="text-sm text-muted-foreground">Prix: {rule.price}€</p>
                                        </div>
                                        <div>
                                            <Button variant="ghost" size="icon" onClick={() => setEditingRule(rule)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    </div>
                                ))}
                                 <Button onClick={() => handleAddRule(storeName)} className="w-full mt-2" variant="outline">
                                    <PlusCircle className="mr-2"/>
                                    Ajouter une Règle de Tarification
                                </Button>
                           </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
        </Accordion>
        
        {editingRule && (
            <EditRuleDialog 
                rule={editingRule} 
                onUpdate={handleUpdateRule}
                onSaveAndClose={handleSaveAndClose}
                onCancel={() => setEditingRule(null)}
            />
        )}

      </CardContent>
    </Card>
  );
}


function EditRuleDialog({ rule, onUpdate, onSaveAndClose, onCancel }: { rule: StoreRule, onUpdate: (rule: StoreRule) => void, onSaveAndClose: () => void, onCancel: () => void }) {
    
    const handleFieldChange = (field: keyof StoreRule, value: any) => {
        onUpdate({ ...rule, [field]: value });
    };

    const handleGridChange = (field: keyof NonNullable<StoreRule['grid']>, value: any) => {
        handleFieldChange('grid', { ...rule.grid, [field]: value });
    }
    
    const handleZonePriceChange = (zoneId: string, field: 'zoneName' | 'price', value: any) => {
        const updatedZones = rule.grid?.zonePrices.map(zone => 
            zone.id === zoneId ? { ...zone, [field]: value } : zone
        );
        handleGridChange('zonePrices', updatedZones);
    }
    
    const addZone = () => {
        const newZone = { id: `zone-${Date.now()}`, zoneName: `Nouvelle Zone`, price: 0 };
        const updatedZones = [...(rule.grid?.zonePrices || []), newZone];
        handleGridChange('zonePrices', updatedZones);
    }

    const removeZone = (zoneId: string) => {
        const updatedZones = rule.grid?.zonePrices.filter(zone => zone.id !== zoneId);
        handleGridChange('zonePrices', updatedZones);
    }

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Modifier la règle pour {rule.storeName}</CardTitle>
                    <CardDescription>Ajustez les paramètres de cette règle de tarification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="ruleType">Modèle de tarification</Label>
                            <Select value={rule.ruleType} onValueChange={(v: RuleType) => handleFieldChange('ruleType', v)}>
                                <SelectTrigger id="ruleType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ruleTypeLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label htmlFor="price">Prix/Coût de base (€)</Label>
                            <Input id="price" type="number" value={rule.price} onChange={e => handleFieldChange('price', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>

                    {rule.ruleType === 'grille' && (
                        <Card className="bg-muted/50">
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Map/> Grille Bacs/Zones</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                 <div>
                                    <Label>Seuil de Bacs</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="Ex: 10" 
                                        value={rule.grid?.bacThreshold}
                                        onChange={e => handleGridChange('bacThreshold', parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Le prix de base s'applique jusqu'à ce seuil. Au-delà, le prix de la zone est utilisé.</p>
                                 </div>
                                 <div className="space-y-2">
                                     <Label>Zones de Tarification</Label>
                                     {rule.grid?.zonePrices.map(zone => (
                                         <div key={zone.id} className="flex items-center gap-2">
                                             <Input placeholder="Nom de la zone" value={zone.zoneName} onChange={e => handleZonePriceChange(zone.id, 'zoneName', e.target.value)} />
                                             <Input type="number" placeholder="Prix" className="w-32" value={zone.price} onChange={e => handleZonePriceChange(zone.id, 'price', parseFloat(e.target.value) || 0)} />
                                             <Button variant="ghost" size="icon" onClick={() => removeZone(zone.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                         </div>
                                     ))}
                                      <Button variant="outline" size="sm" onClick={addZone} className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une zone
                                      </Button>
                                 </div>
                            </CardContent>
                        </Card>
                    )}

                    <div>
                        <Label>Jours non travaillés</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                    {rule.nonWorkedDays?.length > 0 ? `${rule.nonWorkedDays.length} jour(s) sélectionné(s)` : "Sélectionner les jours"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="multiple"
                                    selected={rule.nonWorkedDays}
                                    onSelect={(days) => handleFieldChange('nonWorkedDays', days || [])}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                </CardContent>
                <CardContent className="flex justify-end gap-2">
                     <Button variant="ghost" onClick={onCancel}>Annuler</Button>
                     <Button onClick={onSaveAndClose}>Sauvegarder et Fermer</Button>
                </CardContent>
            </Card>
        </div>
    )
}
