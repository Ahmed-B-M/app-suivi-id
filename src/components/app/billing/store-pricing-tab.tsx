
"use client";

import { useState, useMemo } from "react";
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
import { PlusCircle } from "lucide-react";

type RuleType = 'tournee' | 'tache' | 'jour' | 'semaine' | 'mois' | 'bacs_zone';

interface StoreRule {
    id: string;
    storeName: string;
    ruleType: RuleType;
}

export function StorePricingTab() {
  const { availableStores } = useFilters();
  const [rules, setRules] = useState<StoreRule[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');

  const handleAddRule = () => {
    if (!selectedStore) return;
    const newRule: StoreRule = {
        id: `${selectedStore}-${Date.now()}`,
        storeName: selectedStore,
        ruleType: 'tournee', // default
    }
    setRules(prev => [...prev, newRule]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifs pour les Magasins</CardTitle>
        <CardDescription>
          Créez des règles de tarification personnalisées pour chaque magasin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-4 border rounded-lg">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Sélectionnez un magasin pour ajouter une règle..." />
                </SelectTrigger>
                <SelectContent>
                    {availableStores.map(store => (
                        <SelectItem key={store} value={store}>{store}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button onClick={handleAddRule} disabled={!selectedStore}>
                <PlusCircle className="mr-2"/>
                Ajouter une Règle
            </Button>
        </div>

        <div className="space-y-4">
            {rules.length === 0 && <p className="text-center text-muted-foreground pt-8">Aucune règle définie. Ajoutez une règle pour commencer.</p>}
            {rules.map(rule => (
                <p key={rule.id}>Règle pour {rule.storeName}</p>
                // Here we will build out the detailed rule configuration components
            ))}
        </div>

      </CardContent>
    </Card>
  );
}
