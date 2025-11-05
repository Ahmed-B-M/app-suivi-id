
"use client";

import { useState, useMemo, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Truck, Package, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilters } from "@/context/filter-context";

type CostRuleType = 'tournee' | 'tache' | 'jour';

interface CostRule {
    target: 'entrepot' | 'magasin' | string; // 'entrepot', 'magasin', or a specific carrier name
    type: CostRuleType;
    cost: number;
}

export function CostConfigTab() {
  const { allCarrierRules } = useFilters();
  const [isPending, startTransition] = useTransition();

  const carriers = useMemo(() => [...new Set(allCarrierRules.map(r => r.carrier))], [allCarrierRules]);

  // This would come from and be saved to Firestore in a real app
  const [costRules, setCostRules] = useState<Record<string, CostRule>>({
      'entrepot': { target: 'entrepot', type: 'tournee', cost: 120 },
      'magasin': { target: 'magasin', type: 'jour', cost: 180 },
  });
  
  const handleRuleChange = (target: string, field: 'type' | 'cost', value: any) => {
      const existingRule = costRules[target] || { target, type: 'tournee', cost: 0 };
      setCostRules(prev => ({
          ...prev,
          [target]: { ...existingRule, [field]: field === 'cost' ? parseFloat(value) || 0 : value }
      }));
  };

  const handleSave = () => {
    startTransition(() => {
      // Here you would save the 'costRules' state to Firestore
      console.log("Saving cost configurations:", costRules);
    });
  };
  
  const allTargets = ['entrepot', 'magasin', ...carriers];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration des Coûts Transporteurs</CardTitle>
        <CardDescription>
          Définissez les coûts payés aux transporteurs. Les règles peuvent être globales (pour tous les entrepôts/magasins) ou spécifiques à un transporteur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sauvegarder les Coûts
          </Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cible (Type ou Transporteur)</TableHead>
                <TableHead className="w-[200px]">Modèle de Coût</TableHead>
                <TableHead className="w-[200px]">Coût (€)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTargets.map(target => {
                const rule = costRules[target] || { type: 'tournee', cost: 0 };
                return (
                    <TableRow key={target}>
                        <TableCell className="font-medium capitalize">{target}</TableCell>
                        <TableCell>
                            <Select value={rule.type} onValueChange={(v: CostRuleType) => handleRuleChange(target, 'type', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tournee"><Truck className="inline-block mr-2 h-4 w-4"/> Par Tournée</SelectItem>
                                    <SelectItem value="tache"><Package className="inline-block mr-2 h-4 w-4"/> Par Tâche</SelectItem>
                                    <SelectItem value="jour"><Calendar className="inline-block mr-2 h-4 w-4"/> Par Jour</SelectItem>
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>
                            <Input
                            type="number"
                            value={rule.cost || ''}
                            onChange={(e) => handleRuleChange(target, 'cost', e.target.value)}
                            placeholder="Coût"
                            />
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
