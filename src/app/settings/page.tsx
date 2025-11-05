
"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { UnifiedExportForm } from "@/app/unified-export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSearch, PlusCircle, Save, Trash2, Edit, Truck, Map } from "lucide-react";
import type { Tache, Tournee, ForecastRule, CarrierRule, DepotRule } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useFirebase } from "@/firebase";
import { collection, query, orderBy, writeBatch, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";


function ExportTab() {
  const [logs, setLogs] = useState<string[]>([]);
  const [taskJsonData, setTaskJsonData] = useState<Tache[] | null>(null);
  const [roundJsonData, setRoundJsonData] = useState<Tournee[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleExportStart = () => {
    setLogs([]);
    setTaskJsonData(null);
    setRoundJsonData(null);
    setIsExporting(true);
  };

  const handleExportComplete = (
    newLogs: string[],
    data: { tasks: Tache[]; rounds: Tournee[] } | null
  ) => {
    setLogs((prev) => [...prev, ...newLogs]);
    if (data) {
      setTaskJsonData(data.tasks);
      setRoundJsonData(data.rounds);
    }
    setIsExporting(false);
  };

  const handleLogUpdate = (newLogs: string[]) => {
    setLogs((prev) => [...prev, ...newLogs]);
  };

  const handleSavingChange = (saving: boolean) => {
    setIsSaving(saving);
  };

  const handleReset = () => {
    setLogs([]);
    setTaskJsonData(null);
    setRoundJsonData(null);
  };

  const isLoading = isExporting || isSaving;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div className="lg:col-span-3 flex flex-col gap-8">
        <UnifiedExportForm
          onExportStart={handleExportStart}
          onExportComplete={handleExportComplete}
          onReset={handleReset}
          onLogUpdate={handleLogUpdate}
          onSavingChange={handleSavingChange}
          taskJsonData={taskJsonData}
          roundJsonData={roundJsonData}
          isExporting={isExporting}
          isSaving={isSaving}
        />

        {(taskJsonData || roundJsonData) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch />
                Données Extraites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tasks">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tasks">
                    Tâches ({taskJsonData?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="rounds">
                    Tournées ({roundJsonData?.length || 0})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="tasks" className="mt-4">
                  {taskJsonData && taskJsonData.length > 0 ? (
                    <TasksTable data={taskJsonData} />
                  ) : (
                    <p className="text-muted-foreground text-center p-4">
                      Aucune tâche extraite.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="rounds" className="mt-4">
                  {roundJsonData && roundJsonData.length > 0 ? (
                    <RoundsTable data={roundJsonData} />
                  ) : (
                    <p className="text-muted-foreground text-center p-4">
                      Aucune tournée extraite.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && <LogDisplay logs={logs} />}
      </div>
      <div className="lg:col-span-2">
        <Scheduler />
      </div>
    </div>
  );
}

function DatabaseTab() {
  const { firestore } = useFirebase();

  const tasksCollection = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "tasks"), orderBy("date", "desc"));
  }, [firestore]);

  const roundsCollection = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "rounds"), orderBy("date", "desc"));
  }, [firestore]);

  const { data: tasks, loading: isLoadingTasks, error: tasksError } = useQuery<Tache>(tasksCollection, [], { realtime: true });
  const { data: rounds, loading: isLoadingRounds, error: roundsError } = useQuery<Tournee>(roundsCollection, [], { realtime: true });

  const tasksByStatus = useMemo(() => {
    if (!tasks) return {};
    return tasks.reduce((acc, task) => {
      const status = task.progression || "Unknown";
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    }, {} as Record<string, Tache[]>);
  }, [tasks]);

  const roundsByDate = useMemo(() => {
    if (!rounds) return {};
    return rounds.reduce((acc, round) => {
      const date = round.date ? (round.date as string).split("T")[0] : "Sans date";
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(round);
      return acc;
    }, {} as Record<string, Tournee[]>);
  }, [rounds]);

  const sortedRoundDates = useMemo(() => {
    return Object.keys(roundsByDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
  }, [roundsByDate]);
  
  const isLoading = isLoadingTasks || isLoadingRounds;

  return (
    <Tabs defaultValue="tasks" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="tasks">
          Tâches ({isLoading ? '...' : tasks?.length || 0})
        </TabsTrigger>
        <TabsTrigger value="rounds">
          Tournées ({isLoading ? '...' : rounds?.length || 0})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tasks" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch />
              Données de Tâches Sauvegardées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTasks && (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
            )}
            {tasksError && (
              <p className="text-destructive">Erreur: {tasksError.message}</p>
            )}
            {!isLoadingTasks && tasks && Object.keys(tasksByStatus).length > 0 ? (
               <Accordion type="multiple" className="w-full">
                {Object.entries(tasksByStatus).map(
                  ([status, tasksInStatus]) => (
                     <AccordionItem value={status} key={status}>
                        <AccordionTrigger>
                           <div className="flex items-center gap-4 justify-between w-full pr-4">
                              <span className="text-lg capitalize">{status.toLowerCase()}</span>
                              <p className="text-sm text-muted-foreground">{tasksInStatus.length} tâches</p>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <TasksTable data={tasksInStatus} />
                        </AccordionContent>
                     </AccordionItem>
                  )
                )}
              </Accordion>
            ) : (
              !isLoadingTasks && (
                <p className="text-muted-foreground p-4 text-center">
                  Aucune tâche trouvée dans la base de données.
                </p>
              )
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rounds" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch />
              Données de Tournées Sauvegardées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRounds && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}
            {roundsError && (
              <p className="text-destructive">Erreur: {roundsError.message}</p>
            )}
            {!isLoadingRounds && rounds && sortedRoundDates.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {sortedRoundDates.map((date) => (
                  <AccordionItem value={date} key={date}>
                     <AccordionTrigger>
                        <div className="flex items-center gap-4 justify-between w-full pr-4">
                           <span className="text-lg">{date}</span>
                           <p className="text-sm text-muted-foreground">{roundsByDate[date].length} tournées</p>
                        </div>
                     </AccordionTrigger>
                     <AccordionContent>
                        <RoundsTable data={roundsByDate[date]} />
                     </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              !isLoadingRounds && (
                <p className="text-muted-foreground p-4 text-center">
                  Aucune tournée trouvée dans la base de données.
                </p>
              )
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function DepotRulesTab() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const rulesCollection = useMemo(() => firestore ? collection(firestore, "depot_rules") : null, [firestore]);
  const { data: rules, loading, error } = useQuery<DepotRule>(rulesCollection, [], { realtime: true });
  const [isPending, startTransition] = useTransition();

  const [editedRules, setEditedRules] = useState<Record<string, Partial<DepotRule>>>({});
  const [newRule, setNewRule] = useState<Partial<Omit<DepotRule, 'id'>>>({ type: 'entrepot', isActive: true, prefixes: [] });

  const handleRuleChange = (id: string, field: keyof DepotRule, value: any) => {
    setEditedRules(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleNewRuleChange = (field: keyof typeof newRule, value: any) => {
     setNewRule(prev => {
      const updatedRule = { ...prev, [field]: value };
      if (field === 'type' && value === 'magasin') {
        updatedRule.depotName = 'Magasin';
      }
      return updatedRule;
    });
  };

  const handleAddRule = () => {
    if ((!newRule?.depotName && newRule.type !== 'magasin') || !newRule.type || !newRule.prefixes || newRule.prefixes.length === 0) {
      toast({ title: "Champs requis manquants", description: "Veuillez remplir le nom du dépôt, le type et au moins un préfixe.", variant: "destructive" });
      return;
    }
    if (!firestore) return;
    
    const finalNewRule = { ...newRule, depotName: newRule.type === 'magasin' ? 'Magasin' : newRule.depotName };

    startTransition(async () => {
      try {
        await addDoc(collection(firestore, 'depot_rules'), finalNewRule);
        toast({ title: "Règle ajoutée" });
        setNewRule({ type: 'entrepot', isActive: true, prefixes: [] });
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      }
    });
  };

  const handleSaveRules = () => {
    if (!firestore || Object.keys(editedRules).length === 0) return;
    startTransition(async () => {
      const batch = writeBatch(firestore);
      Object.entries(editedRules).forEach(([id, changes]) => {
        batch.update(doc(firestore, "depot_rules", id), changes);
      });
      try {
        await batch.commit();
        toast({ title: "Sauvegarde réussie" });
        setEditedRules({});
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      }
    });
  };

  const handleDeleteRule = (id: string) => {
    if (!firestore) return;
    startTransition(async () => {
        try {
            await deleteDoc(doc(firestore, "depot_rules", id));
            toast({ title: "Règle supprimée" });
        } catch (e: any) {
            toast({ title: "Erreur", description: e.message, variant: "destructive" });
        }
    });
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <p className="text-destructive">Erreur: {error.message}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Règles de Groupement des Hubs</CardTitle>
        <CardDescription>
          Gérez comment les hubs sont regroupés en dépôts et classifiés comme entrepôt ou magasin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={handleSaveRules} disabled={isPending || Object.keys(editedRules).length === 0}>
            <Save className="mr-2" />
            Sauvegarder les modifications ({Object.keys(editedRules).length})
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Nom du Dépôt</TableHead>
                <TableHead className="w-[150px]">Type</TableHead>
                <TableHead>Préfixes (séparés par virgule)</TableHead>
                <TableHead className="w-[80px]">Active</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => {
                const current = { ...rule, ...editedRules[rule.id] };
                const isMagasin = current.type === 'magasin';
                return (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Input value={current.depotName} onChange={e => handleRuleChange(rule.id, 'depotName', e.target.value)} disabled={isMagasin} />
                    </TableCell>
                    <TableCell>
                      <Select value={current.type} onValueChange={v => handleRuleChange(rule.id, 'type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrepot">Entrepôt</SelectItem>
                          <SelectItem value="magasin">Magasin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={(current.prefixes || []).join(', ')} onChange={e => handleRuleChange(rule.id, 'prefixes', e.target.value.split(',').map(p => p.trim()).filter(Boolean))} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={current.isActive} onCheckedChange={c => handleRuleChange(rule.id, 'isActive', c)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} disabled={isPending}><Trash2 className="text-destructive h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* New Rule Row */}
              <TableRow>
                <TableCell>
                    <Input 
                        placeholder="Nom du Dépôt" 
                        value={newRule.type === 'magasin' ? 'Magasin' : newRule.depotName || ''} 
                        onChange={e => handleNewRuleChange('depotName', e.target.value)} 
                        disabled={newRule.type === 'magasin'}
                    />
                </TableCell>
                <TableCell>
                  <Select value={newRule.type} onValueChange={v => handleNewRuleChange('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrepot">Entrepôt</SelectItem>
                      <SelectItem value="magasin">Magasin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Input placeholder="prefixe1, prefixe2" value={(newRule.prefixes || []).join(', ')} onChange={e => handleNewRuleChange('prefixes', e.target.value.split(',').map(p => p.trim()).filter(Boolean))} /></TableCell>
                <TableCell><Switch checked={newRule.isActive ?? true} onCheckedChange={c => handleNewRuleChange('isActive', c)} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={handleAddRule} disabled={isPending}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}


function ForecastRulesTab() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const rulesCollection = useMemo(() => firestore ? collection(firestore, "forecast_rules") : null, [firestore]);
    const { data: rules, loading, error } = useQuery<ForecastRule>(rulesCollection, [], { realtime: true });
    const [isPending, startTransition] = useTransition();

    const [editedRules, setEditedRules] = useState<Record<string, Partial<ForecastRule>>>({});
    const [newRule, setNewRule] = useState<Partial<ForecastRule> | null>(null);

    const handleRuleChange = (id: string, field: keyof ForecastRule, value: any) => {
        setEditedRules(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };
    
    const handleNewRuleChange = (field: keyof ForecastRule, value: any) => {
        setNewRule(prev => ({ ...prev, [field]: value }));
    };

    const processKeywords = (value: string) => {
        return value.split(/[\s,]+/).map(k => k.trim()).filter(Boolean);
    }

    const handleAddRule = () => {
        if (!newRule || !newRule.name || !newRule.type || !newRule.category) {
            toast({ title: "Champs requis manquants", description: "Veuillez remplir le nom, le type et la catégorie.", variant: "destructive" });
            return;
        }
        if (!firestore) return;

        const ruleToAdd: Omit<ForecastRule, 'id'> = {
            name: newRule.name,
            type: newRule.type,
            keywords: newRule.keywords || [],
            category: newRule.category,
            isActive: newRule.isActive ?? true,
        };

        startTransition(async () => {
            try {
                await addDoc(collection(firestore, 'forecast_rules'), ruleToAdd);
                toast({ title: "Règle ajoutée", description: "La nouvelle règle a été sauvegardée." });
                setNewRule(null);
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    };

    const handleSaveRules = () => {
        if (!firestore || Object.keys(editedRules).length === 0) return;

        startTransition(async () => {
            const batch = writeBatch(firestore);
            Object.entries(editedRules).forEach(([id, changes]) => {
                const ruleRef = doc(firestore, "forecast_rules", id);
                batch.update(ruleRef, changes);
            });
            try {
                await batch.commit();
                toast({ title: "Sauvegarde réussie", description: "Les modifications des règles ont été sauvegardées." });
                setEditedRules({});
            } catch (e: any) {
                toast({ title: "Erreur de sauvegarde", description: e.message, variant: "destructive" });
            }
        });
    };
    
    const handleDeleteRule = (id: string) => {
        if (!firestore) return;
        startTransition(async () => {
            try {
                await deleteDoc(doc(firestore, "forecast_rules", id));
                toast({ title: "Règle supprimée" });
            } catch (e: any) {
                toast({ title: "Erreur", description: e.message, variant: "destructive" });
            }
        });
    }

    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }
     if (error) return <p className="text-destructive">Erreur: {error.message}</p>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestion des Règles de Prévision</CardTitle>
                <CardDescription>
                    Configurez comment les tournées sont classifiées en "Matin", "Soir", ou "BU".
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={handleSaveRules} disabled={isPending || Object.keys(editedRules).length === 0}>
                        <Save className="mr-2" />
                        Sauvegarder les modifications ({Object.keys(editedRules).length})
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de la Règle</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead className="w-1/3">Mots-clés (séparés par espace ou virgule)</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map(rule => {
                                const currentRuleState = { ...rule, ...editedRules[rule.id] };
                                return (
                                <TableRow key={rule.id}>
                                    <TableCell>
                                        <Input
                                            value={currentRuleState.name}
                                            onChange={(e) => handleRuleChange(rule.id, 'name', e.target.value)}
                                            className="font-medium"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={currentRuleState.type}
                                            onValueChange={(value) => handleRuleChange(rule.id, 'type', value)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="time">Temps</SelectItem>
                                                <SelectItem value="type">Type</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={currentRuleState.category}
                                            onValueChange={(value) => handleRuleChange(rule.id, 'category', value)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Matin">Matin</SelectItem>
                                                <SelectItem value="Soir">Soir</SelectItem>
                                                <SelectItem value="BU">BU</SelectItem>
                                                <SelectItem value="Classique">Classique</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={Array.isArray(currentRuleState.keywords) ? currentRuleState.keywords.join(' ') : ''}
                                            onChange={(e) => handleRuleChange(rule.id, 'keywords', processKeywords(e.target.value))}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={currentRuleState.isActive}
                                            onCheckedChange={(checked) => handleRuleChange(rule.id, 'isActive', checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} disabled={isPending}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                            {/* New Rule Row */}
                            <TableRow>
                                <TableCell>
                                    <Input
                                        placeholder="Nouvelle règle..."
                                        value={newRule?.name || ''}
                                        onChange={(e) => handleNewRuleChange('name', e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select onValueChange={(v) => handleNewRuleChange('type', v)}>
                                        <SelectTrigger><SelectValue placeholder="Type..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="time">Temps</SelectItem>
                                            <SelectItem value="type">Type</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                <Select onValueChange={(v) => handleNewRuleChange('category', v)}>
                                        <SelectTrigger><SelectValue placeholder="Catégorie..."/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Matin">Matin</SelectItem>
                                            <SelectItem value="Soir">Soir</SelectItem>
                                            <SelectItem value="BU">BU</SelectItem>
                                            <SelectItem value="Classique">Classique</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        placeholder="motclé1 motclé2..."
                                        value={newRule?.keywords?.join(' ') || ''}
                                        onChange={(e) => handleNewRuleChange('keywords', processKeywords(e.target.value))}
                                    />
                                </TableCell>
                                <TableCell>
                                <Switch
                                        checked={newRule?.isActive ?? true}
                                        onCheckedChange={(checked) => handleNewRuleChange('isActive', checked)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                <Button size="sm" onClick={handleAddRule} disabled={isPending}>
                                    <PlusCircle className="mr-2"/> Ajouter
                                </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function CarrierRulesTab() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const rulesCollection = useMemo(() => firestore ? collection(firestore, "carrier_rules") : null, [firestore]);
  const { data: rules, loading, error } = useQuery<CarrierRule>(rulesCollection, [orderBy("priority", "asc")], { realtime: true });
  const [isPending, startTransition] = useTransition();

  const [editedRules, setEditedRules] = useState<Record<string, Partial<CarrierRule>>>({});
  const [newRule, setNewRule] = useState<Partial<Omit<CarrierRule, 'id'>>>({ type: 'suffix', priority: (rules?.length + 1) * 10, isActive: true });

  const handleRuleChange = (id: string, field: keyof CarrierRule, value: any) => {
    setEditedRules(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleNewRuleChange = (field: keyof typeof newRule, value: any) => {
    setNewRule(prev => ({ ...prev, [field]: value }));
  };

  const handleAddRule = () => {
    if (!newRule?.carrier || !newRule.type || !newRule.value) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    if (!firestore) return;

    startTransition(async () => {
      try {
        await addDoc(collection(firestore, 'carrier_rules'), newRule);
        toast({ title: "Règle ajoutée" });
        setNewRule({ type: 'suffix', priority: (rules?.length + 2) * 10, isActive: true });
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      }
    });
  };

  const handleSaveRules = () => {
    if (!firestore || Object.keys(editedRules).length === 0) return;
    startTransition(async () => {
      const batch = writeBatch(firestore);
      Object.entries(editedRules).forEach(([id, changes]) => {
        batch.update(doc(firestore, "carrier_rules", id), changes);
      });
      try {
        await batch.commit();
        toast({ title: "Sauvegarde réussie" });
        setEditedRules({});
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      }
    });
  };

  const handleDeleteRule = (id: string) => {
    if (!firestore) return;
    startTransition(async () => {
        try {
            await deleteDoc(doc(firestore, "carrier_rules", id));
            toast({ title: "Règle supprimée" });
        } catch (e: any) {
            toast({ title: "Erreur", description: e.message, variant: "destructive" });
        }
    });
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <p className="text-destructive">Erreur: {error.message}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Règles d'Affectation des Transporteurs</CardTitle>
        <CardDescription>
          Gérez les règles qui déterminent le transporteur en fonction du nom du chauffeur. La priorité la plus basse (ex: 10) est appliquée en premier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={handleSaveRules} disabled={isPending || Object.keys(editedRules).length === 0}>
            <Save className="mr-2" />
            Sauvegarder les modifications ({Object.keys(editedRules).length})
          </Button>
        </div>
         <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Priorité</TableHead>
                  <TableHead>Transporteur</TableHead>
                  <TableHead className="w-[150px]">Type de Règle</TableHead>
                  <TableHead>Valeur (Suffixe/Préfixe/Contient)</TableHead>
                  <TableHead className="w-[80px]">Active</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => {
                  const current = { ...rule, ...editedRules[rule.id] };
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Input type="number" value={current.priority} onChange={e => handleRuleChange(rule.id, 'priority', parseInt(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>
                        <Input value={current.carrier} onChange={e => handleRuleChange(rule.id, 'carrier', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Select value={current.type} onValueChange={v => handleRuleChange(rule.id, 'type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="suffix">Se termine par</SelectItem>
                            <SelectItem value="prefix">Commence par</SelectItem>
                            <SelectItem value="contains">Contient</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={current.value} onChange={e => handleRuleChange(rule.id, 'value', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={current.isActive} onCheckedChange={c => handleRuleChange(rule.id, 'isActive', c)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} disabled={isPending}><Trash2 className="text-destructive h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* New Rule Row */}
                <TableRow>
                  <TableCell><Input type="number" placeholder="Priorité" value={newRule.priority || ''} onChange={e => handleNewRuleChange('priority', parseInt(e.target.value) || 0)} /></TableCell>
                  <TableCell><Input placeholder="Nom du transporteur" value={newRule.carrier || ''} onChange={e => handleNewRuleChange('carrier', e.target.value)} /></TableCell>
                  <TableCell>
                    <Select value={newRule.type} onValueChange={v => handleNewRuleChange('type', v)}>
                      <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suffix">Se termine par</SelectItem>
                        <SelectItem value="prefix">Commence par</SelectItem>
                        <SelectItem value="contains">Contient</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input placeholder="Valeur à rechercher" value={newRule.value || ''} onChange={e => handleNewRuleChange('value', e.target.value)} /></TableCell>
                  <TableCell><Switch checked={newRule.isActive ?? true} onCheckedChange={c => handleNewRuleChange('isActive', c)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={handleAddRule} disabled={isPending}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Paramètres et Outils</h1>
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="export">Configuration de l'Export</TabsTrigger>
          <TabsTrigger value="database">Explorateur de Données</TabsTrigger>
          <TabsTrigger value="forecast-rules">Règles de Prévision</TabsTrigger>
          <TabsTrigger value="carrier-rules"><Truck className="mr-2 h-4 w-4"/>Règles Transporteurs</TabsTrigger>
          <TabsTrigger value="depot-rules"><Map className="mr-2 h-4 w-4"/>Règles de Groupement</TabsTrigger>
        </TabsList>
        <TabsContent value="export" className="mt-4">
          <ExportTab />
        </TabsContent>
        <TabsContent value="database" className="mt-4">
          <DatabaseTab />
        </TabsContent>
         <TabsContent value="forecast-rules" className="mt-4">
          <ForecastRulesTab />
        </TabsContent>
        <TabsContent value="carrier-rules" className="mt-4">
          <CarrierRulesTab />
        </TabsContent>
        <TabsContent value="depot-rules" className="mt-4">
          <DepotRulesTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
