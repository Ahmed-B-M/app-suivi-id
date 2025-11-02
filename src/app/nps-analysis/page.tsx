
"use client";

import { useState, useMemo, useEffect, useTransition } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tache } from '@/lib/types';
import { getCarrierFromDriver, getDepotFromHub, getDriverFullName } from '@/lib/grouping';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CalendarIcon, CheckCircle, FileUp, Loader2, Rocket, Save } from 'lucide-react';
import { NpsVerbatimAnalysis } from '@/components/app/nps-verbatim-analysis';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveNpsDataAction } from '../actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ProcessedVerbatim } from '@/app/verbatim-treatment/page';


type NpsDataRow = {
    'Num_commande': string;
    'DATE_RETRAIT': string;
    'NOTE_RECOMMANDATION': string;
    'PC_commande_complete': string;
    'PC_qualite_pdts_frais': string;
    'PC_respect_DLC': string;
    'PC_soin_produits': string;
    'VERBATIM': string;
    'MAG': string;
};

export type ProcessedNpsData = {
    taskId: string;
    npsScore: number;
    npsCategory: 'Promoter' | 'Passive' | 'Detractor';
    verbatim: string;
    store: string;
    taskDate: string;
    carrier?: string;
    depot?: string;
    driver?: string;
};

export default function NpsAnalysisPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [files, setFiles] = useState<File[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, startSavingTransition] = useTransition();
    const [processedData, setProcessedData] = useState<ProcessedNpsData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [associationDate, setAssociationDate] = useState<Date>(new Date());

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(Array.from(event.target.files));
            setProcessedData([]);
            setError(null);
        }
    };

    const processFile = (file: File): Promise<NpsDataRow[]> => {
        return new Promise((resolve, reject) => {
            Papa.parse<NpsDataRow>(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data.filter(row => row.Num_commande)),
                error: (err: any) => reject(err),
            });
        });
    }

    const handleProcessFiles = async () => {
        if (!files || files.length === 0) {
            setError("Veuillez sélectionner un ou plusieurs fichiers.");
            return;
        }
        if (!firestore) {
            setError("La connexion à la base de données n'est pas disponible.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setProcessedData([]);

        try {
            // 1. Parse all CSV files and get all unique task IDs
            const allCsvRows = (await Promise.all(files.map(file => processFile(file)))).flat();
            const taskIdsFromCsv = [...new Set(allCsvRows.map(row => row.Num_commande))];

            if (taskIdsFromCsv.length === 0) {
                setError("Aucun numéro de commande trouvé dans les fichiers CSV.");
                setIsProcessing(false);
                return;
            }

            // 2. Fetch only the necessary tasks from Firestore in batches of 30 (Firestore 'in' query limit)
            const taskMap = new Map<string, Tache>();
            const tasksCollection = collection(firestore, 'tasks');
            const fetchPromises: Promise<void>[] = [];

            for (let i = 0; i < taskIdsFromCsv.length; i += 30) {
                const batchIds = taskIdsFromCsv.slice(i, i + 30);
                const q = query(tasksCollection, where('tacheId', 'in', batchIds));
                
                fetchPromises.push(
                    getDocs(q).then(snapshot => {
                        snapshot.forEach(doc => {
                            taskMap.set(doc.id, doc.data() as Tache);
                        });
                    })
                );
            }

            await Promise.all(fetchPromises);
            
            // 3. Process and link the data
            const linkedData: ProcessedNpsData[] = [];
            let notFoundCount = 0;

            allCsvRows.forEach(row => {
                const taskId = row.Num_commande;
                if (taskMap.has(taskId)) {
                    const task = taskMap.get(taskId)!;
                    const npsScore = parseInt(row.NOTE_RECOMMANDATION, 10);
                    let npsCategory: ProcessedNpsData['npsCategory'];
                    
                    if (npsScore >= 9) npsCategory = 'Promoter';
                    else if (npsScore >= 7) npsCategory = 'Passive';
                    else npsCategory = 'Detractor';

                    linkedData.push({
                        taskId,
                        npsScore,
                        npsCategory,
                        verbatim: row.VERBATIM,
                        store: row.MAG,
                        taskDate: task.date ? new Date(task.date as string).toISOString() : "N/A",
                        carrier: getCarrierFromDriver(task),
                        depot: getDepotFromHub(task.nomHub),
                        driver: getDriverFullName(task),
                    });
                } else {
                    notFoundCount++;
                }
            });

            setProcessedData(linkedData);
            if (notFoundCount > 0) {
                 setError(`${notFoundCount} sur ${allCsvRows.length} commandes des fichiers CSV n'ont pas été trouvées dans la base de données et ont été ignorées.`);
            }
        } catch (err: any) {
            setError(`Erreur lors du traitement : ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSave = () => {
        if(processedData.length === 0) {
            toast({
                title: "Aucune donnée à sauvegarder",
                description: "Veuillez d'abord traiter des fichiers.",
                variant: "destructive"
            })
            return;
        }

        startSavingTransition(async () => {
            const result = await saveNpsDataAction({
                associationDate: format(associationDate, 'yyyy-MM-dd'),
                verbatims: processedData
            });

            if(result.success) {
                toast({
                    title: "Sauvegarde réussie",
                    description: `${processedData.length} verbatims ont été sauvegardés avec la date du ${format(associationDate, 'dd/MM/yyyy')}.`
                })
            } else {
                toast({
                    title: "Erreur de sauvegarde",
                    description: result.error,
                    variant: "destructive"
                })
            }
        })
    }

    const npsScores = useMemo(() => {
        if (processedData.length === 0) return { global: 0, byEntity: {} };
        
        const promoterCount = processedData.filter(d => d.npsCategory === 'Promoter').length;
        const detractorCount = processedData.filter(d => d.npsCategory === 'Detractor').length;
        
        const global = ((promoterCount / processedData.length) - (detractorCount / processedData.length)) * 100;

        const byEntity = processedData.reduce((acc, curr) => {
            const entityName = curr.depot || curr.store || 'Inconnu';
            if (!acc[entityName]) {
                acc[entityName] = { promoters: 0, passives: 0, detractors: 0, total: 0 };
            }
            if (curr.npsCategory === 'Promoter') acc[entityName].promoters++;
            if (curr.npsCategory === 'Passive') acc[entityName].passives++;
            if (curr.npsCategory === 'Detractor') acc[entityName].detractors++;
            acc[entityName].total++;
            return acc;
        }, {} as Record<string, { promoters: number; passives: number; detractors: number; total: number }>);
        
        const entityNps = Object.fromEntries(
            Object.entries(byEntity).map(([name, data]) => {
                const score = ((data.promoters / data.total) - (data.detractors / data.total)) * 100;
                return [name, score];
            })
        );
        
        return { global, byEntity: entityNps };

    }, [processedData]);

    const detractorVerbatims = useMemo(() => {
        return processedData.filter(d => d.npsCategory === 'Detractor' && d.verbatim && d.verbatim.trim() !== '');
    }, [processedData]);

    return (
        <main className="flex-1 container py-8">
            <h1 className="text-3xl font-bold mb-8">Analyse NPS</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileUp /> Importer Fichiers NPS</CardTitle>
                            <CardDescription>
                                Chargez un ou plusieurs fichiers CSV. La recherche des tâches correspondantes se fera après avoir cliqué sur "Lancer l'analyse".
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input type="file" accept=".csv" onChange={handleFileChange} multiple />

                            <div className="flex flex-col space-y-2">
                               <label className="text-sm font-medium">Date d'association</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !associationDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {associationDate ? format(associationDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={associationDate}
                                        onSelect={(date) => date && setAssociationDate(date)}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            
                            <Button onClick={handleProcessFiles} disabled={isProcessing || !files || files.length === 0} className="w-full">
                                {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Rocket className="mr-2"/>}
                                {isProcessing ? 'Analyse en cours...' : 'Lancer l\'analyse'}
                            </Button>
                            
                             <Button onClick={handleSave} disabled={isSaving || processedData.length === 0} className="w-full">
                                {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                                {isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder les résultats'}
                            </Button>

                            {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Avertissement</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                            {processedData.length > 0 && !error && (
                                <Alert variant="default">
                                    <CheckCircle className="h-4 w-4" />
                                    <AlertTitle>Traitement réussi</AlertTitle>
                                    <AlertDescription>{processedData.length} lignes ont été traitées et liées avec succès.</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                         <CardHeader>
                            <CardTitle>Résultats NPS</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Score NPS Global</p>
                                <p className={`text-4xl font-bold ${npsScores.global > 0 ? 'text-green-600' : 'text-destructive'}`}>{npsScores.global.toFixed(1)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Score NPS par Entité</p>
                                <div className="space-y-1">
                                    {Object.entries(npsScores.byEntity).sort((a, b) => b[1] - a[1]).map(([name, score]) => (
                                        <div key={name} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                            <span className="font-medium">{name}</span>
                                            <span className={`font-bold ${score > 0 ? 'text-green-600' : 'text-destructive'}`}>{score.toFixed(1)}</span>
                                        </div>
                                    ))}
                                     {Object.keys(npsScores.byEntity).length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center pt-4">Aucun score à afficher.</p>
                                    )}
                                </div>
                            </div>
                         </CardContent>
                    </Card>
                </div>
            </div>

            {detractorVerbatims.length > 0 && (
                <div className="mt-8">
                    <NpsVerbatimAnalysis data={detractorVerbatims} />
                </div>
            )}
        </main>
    );
}
