
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
import { PlusCircle, Trash2, Edit, Save, Loader2, Calendar as CalendarIcon, Map } from "lucide-react";
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
        zonePrices: { zoneName: string; price: number }[];
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
    }
    setRules(prev => [...prev, newRule]);
    setEditingRule(newRule);
  };

  const handleUpdateRule = (updatedRule: StoreRule) => {
      setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
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
    return rules.reduce((acc, rule) => {
      if (!acc[rule.storeName]) {
        acc[rule.storeName] = [];
      }
      acc[rule.storeName].push(rule);
      return acc;
    }, {} as Record<string, StoreRule[]>);
  }, [rules]);

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
            {availableStores.map(store => (
                <AccordionItem value={store} key={store} className="border-b-0">
                    <Card>
                         <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                            <div className="w-full flex justify-between items-center">
                                <span className="flex items-center gap-3">{store}</span>
                                <Badge variant="outline">{groupedByStore[store]?.length || 0} règles</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                           <div className="border rounded-lg p-4 space-y-4">
                                {groupedByStore[store]?.map(rule => (
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
                                 <Button onClick={() => handleAddRule(store)} className="w-full mt-2" variant="outline">
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
                            <CardContent>
                                 <div>
                                    <Label>Seuil de Bacs</Label>
                                    <Input type="number" placeholder="Ex: 10" />
                                 </div>
                                 {/* Zone editor will go here */}
                                 <p className="text-center text-muted-foreground text-sm pt-4">Le configurateur de zones sera bientôt disponible.</p>
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
