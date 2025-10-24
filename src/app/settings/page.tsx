

"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { UnifiedExportForm } from "@/components/app/unified-export-form";
import { Scheduler } from "@/components/app/scheduler";
import { LogDisplay } from "@/components/app/log-display";
import { TasksTable } from "@/components/app/tasks-table";
import { RoundsTable } from "@/components/app/rounds-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSearch, PlusCircle, Save, Trash2, Edit } from "lucide-react";
import type { Tache, Tournee, ForecastRule } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, writeBatch, doc, addDoc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
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

  const showResults =
    (taskJsonData && taskJsonData.length > 0) ||
    (roundJsonData && roundJsonData.length > 0);

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

        {showResults && (
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

  const tasksCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "tasks"), orderBy("date", "desc"));
  }, [firestore]);

  const roundsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "rounds"), orderBy("date", "desc"));
  }, [firestore]);

  const { data: tasks, loading: isLoadingTasks, error: tasksError } = useCollection<Tache>(tasksCollection);
  const { data: rounds, loading: isLoadingRounds, error: roundsError } = useCollection<Tournee>(roundsCollection);

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

function ForecastRulesTab() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const rulesCollection = useMemo(() => firestore ? collection(firestore, "forecast_rules") : null, [firestore]);
    const { data: rules, loading, error } = useCollection<ForecastRule>(rulesCollection);
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
        // This is a placeholder, as we don't have delete functionality yet.
        console.log("Delete rule", id);
    }

    if (loading) {
        return <Skeleton className="h-96 w-full" />
    }

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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom de la Règle</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Catégorie</TableHead>
                            <TableHead className="w-1/3">Mots-clés (séparés par une virgule)</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead>Action</TableHead>
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
                                        value={Array.isArray(currentRuleState.keywords) ? currentRuleState.keywords.join(', ') : ''}
                                        onChange={(e) => handleRuleChange(rule.id, 'keywords', e.target.value.split(',').map(k => k.trim()))}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={currentRuleState.isActive}
                                        onCheckedChange={(checked) => handleRuleChange(rule.id, 'isActive', checked)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" disabled>
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
                                    placeholder="motclé1, motclé2, ..."
                                    value={newRule?.keywords?.join(', ') || ''}
                                    onChange={(e) => handleNewRuleChange('keywords', e.target.value.split(',').map(k => k.trim()))}
                                />
                            </TableCell>
                            <TableCell>
                               <Switch
                                    checked={newRule?.isActive ?? true}
                                    onCheckedChange={(checked) => handleNewRuleChange('isActive', checked)}
                                />
                            </TableCell>
                            <TableCell>
                               <Button size="sm" onClick={handleAddRule} disabled={isPending}>
                                   <PlusCircle className="mr-2"/> Ajouter
                               </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
  return (
    <main className="flex-1 container py-8">
      <h1 className="text-3xl font-bold mb-8">Paramètres</h1>
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">Configuration de l'Export</TabsTrigger>
          <TabsTrigger value="database">Base de Données</TabsTrigger>
          <TabsTrigger value="forecast-rules">Règles de Prévision</TabsTrigger>
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
      </Tabs>
    </main>
  );
}
