
"use client";

import { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/context/filter-context';
import { Tache } from '@/lib/types';
import { getCarrierFromDriver, getDepotFromHub, getDriverFullName } from '@/lib/grouping';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, FileUp, Loader2, Rocket } from 'lucide-react';
import { NpsVerbatimAnalysis } from '@/components/app/nps-verbatim-analysis';

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
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processedData, setProcessedData] = useState<ProcessedNpsData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { allTasks } = useFilters();
    
    const taskMap = useMemo(() => {
        return new Map(allTasks.map(task => [task.tacheId, task]));
    }, [allTasks]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
            setProcessedData([]);
            setError(null);
        }
    };

    const handleProcessFile = () => {
        if (!file) {
            setError("Veuillez sélectionner un fichier.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        Papa.parse<NpsDataRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const linkedData: ProcessedNpsData[] = [];
                let notFoundCount = 0;

                results.data.forEach(row => {
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
                            taskDate: task.date ? new Date(task.date).toISOString() : "N/A",
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
                     setError(`${notFoundCount} commandes du fichier CSV n'ont pas été trouvées dans les données de la période sélectionnée et ont été ignorées.`);
                }
                setIsProcessing(false);
            },
            error: (err: any) => {
                setError(`Erreur lors de la lecture du fichier CSV: ${err.message}`);
                setIsProcessing(false);
            }
        });
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
                            <CardTitle className="flex items-center gap-2"><FileUp /> Importer un fichier NPS</CardTitle>
                            <CardDescription>
                                Chargez votre fichier CSV de retours clients pour calculer le NPS.
                                Assurez-vous que les données de tâches pour la période correspondante sont chargées.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input type="file" accept=".csv" onChange={handleFileChange} />
                            <Button onClick={handleProcessFile} disabled={isProcessing || !file} className="w-full">
                                {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Rocket className="mr-2"/>}
                                {isProcessing ? 'Traitement en cours...' : 'Lancer l\'analyse'}
                            </Button>
                            {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                            {processedData.length > 0 && (
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
