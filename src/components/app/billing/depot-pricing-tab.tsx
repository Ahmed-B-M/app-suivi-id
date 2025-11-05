
"use client";

import { useState, useMemo, useTransition } from "react";
import { useFilters } from "@/context/filter-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

export function DepotPricingTab() {
  const { availableDepots } = useFilters();
  const [isPending, startTransition] = useTransition();

  // This would come from Firestore in a real app
  const [pricing, setPricing] = useState<Record<string, { weekday: number, sunday: number }>>(
    availableDepots.reduce((acc, depot) => {
      acc[depot] = { weekday: 0, sunday: 0 };
      return acc;
    }, {} as Record<string, { weekday: number, sunday: number }>)
  );

  const handlePriceChange = (depot: string, dayType: 'weekday' | 'sunday', value: string) => {
    const numericValue = parseFloat(value) || 0;
    setPricing(prev => ({
      ...prev,
      [depot]: {
        ...prev[depot],
        [dayType]: numericValue,
      }
    }));
  };

  const handleSave = () => {
    startTransition(() => {
      // Here you would save the 'pricing' state to Firestore
      console.log("Saving depot pricing:", pricing);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifs par Tournée pour les Entrepôts</CardTitle>
        <CardDescription>
          Définissez le prix facturé par tournée pour chaque dépôt, avec une distinction entre la semaine et le dimanche.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sauvegarder les Tarifs
          </Button>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dépôt</TableHead>
                <TableHead className="w-[200px]">Prix Semaine (€)</TableHead>
                <TableHead className="w-[200px]">Prix Dimanche (€)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableDepots.map(depot => (
                <TableRow key={depot}>
                  <TableCell className="font-medium">{depot}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={pricing[depot]?.weekday || ''}
                      onChange={(e) => handlePriceChange(depot, 'weekday', e.target.value)}
                      placeholder="Prix / tournée"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={pricing[depot]?.sunday || ''}
                      onChange={(e) => handlePriceChange(depot, 'sunday', e.target.value)}
                      placeholder="Prix / tournée"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
