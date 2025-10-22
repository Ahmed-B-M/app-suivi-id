
"use client";

import { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tache } from '@/lib/types';
import { getCarrierFromDriver, getDepotFromHub, getDriverFullName } from '@/lib/grouping';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, FileUp, Loader2, Rocket } from 'lucide-react';
import { NpsVerbatimAnalysis } from '@/components/app/nps-verbatim-analysis';
import { useCollection, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

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

type ProcessedNpsData = {
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
    const [files, setFiles] = useState<File[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedNpsData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const tasksCollection = useMemo(() => {
        return firestore ? collection(firestore, 'tasks') : null;
    }, [firestore]);

    const { data: allTasks, loading: isLoadingTasks } = useCollection<Tache>(tasksCollection);
    
    const taskMap = useMemo(() => {
        if (isLoadingTasks || !allTasks) return new Map();
        return new Map(allTasks.map(task => [task.tacheId, task]));
    }, [allTasks, isLoadingTasks]);

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
                complete: (results) => resolve(results.data),
                error: (err: any) => reject(err),
            });
        });
    }

    const handleProcessFiles = async () => {
        if (!files || files.length === 0) {
            setError("Veuillez sélectionner un ou plusieurs fichiers.");
            return;
        }

        if (isLoadingTasks) {
            setError("Les données des tâches sont encore en cours de chargement. Veuillez réessayer dans un instant.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setProcessedData([]);

        try {
            const allResults = await Promise.all(files.map(file => processFile(file)));
            const combinedData = allResults.flat();

            const linkedData: ProcessedNpsData[] = [];
            let notFoundCount = 0;

            combinedData.forEach(row => {
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
                        carrier: getCarrierFromDriver(task.livreur?.nom),
                        depot: getDepotFromHub(task.nomHub),
                        driver: getDriverFullName(task),
                    });
                } else {
                    notFoundCount++;
                }
            });

            setProcessedData(linkedData);
            if (notFoundCount > 0) {
                 setError(`${notFoundCount} commandes des fichiers CSV n'ont pas été trouvées dans la base de données et ont été ignorées.`);
            }
        } catch (err: any) {
            setError(`Erreur lors de la lecture d'un fichier CSV: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

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
                                Chargez un ou plusieurs fichiers CSV de retours clients pour calculer le NPS. Le système recherchera les correspondances dans toute la base de données.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input type="file" accept=".csv" onChange={handleFileChange} multiple />
                            <Button onClick={handleProcessFiles} disabled={isProcessing || !files || files.length === 0 || isLoadingTasks} className="w-full">
                                {isProcessing || isLoadingTasks ? <Loader2 className="animate-spin mr-2"/> : <Rocket className="mr-2"/>}
                                {isLoadingTasks ? 'Chargement des tâches...' : (isProcessing ? 'Traitement en cours...' : 'Lancer l\'analyse')}
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
