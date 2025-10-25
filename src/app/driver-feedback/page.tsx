
"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useFilters } from "@/context/filter-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertTriangle, BookUser, MessageSquare, ThumbsDown, Building, Save, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveActionNoteAction } from "../actions";
import { useCollection } from "@/firebase";
import { collection, where } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";
import { getDepotFromHub } from "@/lib/grouping";
import type { ActionNoteDepot } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const RELEVANT_COMMENT_CATEGORIES = new Set([
    'Attitude livreur',
    'Process',
    'Amabilité livreur',
    'Rupture chaine de froid'
]);

type AggregatedFeedback = {
    date: string;
    driver: string;
    source: 'Commentaire' | 'Verbatim NPS';
    content: string;
    score: number;
    depot: string;
};

export default function DriverFeedbackPage() {
    const { allComments, allProcessedVerbatims, isContextLoading, dateRange } = useFilters();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [notes, setNotes] = useState<Record<string, string>>({});
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

    const todayString = format(new Date(), 'yyyy-MM-dd');
    
    const notesCollection = useMemo(() => {
        return firestore ? collection(firestore, 'action_notes_depot') : null;
    }, [firestore]);
    const { data: savedNotes, loading: notesLoading } = useCollection<ActionNoteDepot>(notesCollection, [where('date', '==', todayString)]);

    // Initialize notes state when saved notes are loaded
    useEffect(() => {
        if (savedNotes.length > 0) {
            const initialNotes: Record<string, string> = {};
            savedNotes.forEach(note => {
                initialNotes[note.depot] = note.content;
            });
            setNotes(prev => ({ ...initialNotes, ...prev }));
        }
    }, [savedNotes]);

    const feedbackByDepot = useMemo(() => {
        if (isContextLoading) return {};

        const feedback: AggregatedFeedback[] = [];

        // Process negative comments
        allComments.forEach(comment => {
            const categories = Array.isArray(comment.category) ? comment.category : [comment.category];
            if (categories.some(cat => RELEVANT_COMMENT_CATEGORIES.has(cat as string))) {
                 const depot = getDepotFromHub(comment.nomHub);
                if (depot !== 'Magasin') { // Ignore stores
                    feedback.push({
                        date: comment.taskDate ? format(new Date(comment.taskDate as string), 'yyyy-MM-dd') : 'N/A',
                        driver: comment.driverName || "Inconnu",
                        source: 'Commentaire',
                        content: comment.comment,
                        score: comment.rating,
                        depot: depot
                    });
                }
            }
        });

        // Process NPS verbatims with "ID" responsibility
        allProcessedVerbatims.forEach(verbatim => {
            if (verbatim.responsibilities.includes('ID') && verbatim.depot) {
                feedback.push({
                    date: verbatim.taskDate ? format(new Date(verbatim.taskDate), 'yyyy-MM-dd') : 'N/A',
                    driver: verbatim.driver || 'Inconnu',
                    source: 'Verbatim NPS',
                    content: verbatim.verbatim,
                    score: verbatim.npsScore,
                    depot: verbatim.depot
                });
            }
        });

        return feedback.reduce((acc, item) => {
            if (!acc[item.depot]) {
                acc[item.depot] = [];
            }
            acc[item.depot].push(item);
            return acc;
        }, {} as Record<string, AggregatedFeedback[]>);

    }, [allComments, allProcessedVerbatims, isContextLoading]);
    
    const handleSaveNote = async (depot: string) => {
        setSavingStates(prev => ({ ...prev, [depot]: true }));
        const noteContent = notes[depot] || "";
        const result = await saveActionNoteAction({ depot, content: noteContent, date: todayString });
        if (result.success) {
            toast({ title: 'Note sauvegardée', description: `La note pour le dépôt ${depot} a été enregistrée.` });
        } else {
            toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
        }
        setSavingStates(prev => ({ ...prev, [depot]: false }));
    };

    const handleNoteChange = (depot: string, content: string) => {
        setNotes(prev => ({ ...prev, [depot]: content }));
    };

    const isLoading = isContextLoading || notesLoading;
    const depots = Object.keys(feedbackByDepot).sort();

    return (
        <main className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Suivi des Retours Livreurs</h1>
            
            {isLoading && <p>Chargement...</p>}

            {!isLoading && depots.length === 0 && (
                 <Card>
                    <CardContent className="text-center text-muted-foreground py-24">
                        Aucun retour livreur pertinent pour la période sélectionnée.
                    </CardContent>
                </Card>
            )}

            {!isLoading && depots.length > 0 && (
                 <Accordion type="multiple" className="w-full space-y-4">
                    {depots.map(depot => {
                        const depotFeedback = feedbackByDepot[depot].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const isNoteSavedToday = savedNotes.some(n => n.depot === depot && n.content);
                        const isSaving = savingStates[depot];

                        return (
                            <AccordionItem value={depot} key={depot} className="border-b-0">
                                <Card>
                                    <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                                        <div className="w-full flex justify-between items-center">
                                            <span className="flex items-center gap-3"><Building />{depot}</span>
                                            <Badge variant="outline">{depotFeedback.length} retours</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 pt-0">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-2">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center gap-2 text-base"><BookUser /> Retours Agrégés</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="max-h-[450px] overflow-y-auto border rounded-lg">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Date</TableHead>
                                                                        <TableHead>Livreur</TableHead>
                                                                        <TableHead>Source</TableHead>
                                                                        <TableHead className="w-[45%]">Contenu</TableHead>
                                                                        <TableHead className="text-right">Note/Score</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {depotFeedback.map((item, index) => (
                                                                        <TableRow key={index}>
                                                                            <TableCell>{item.date}</TableCell>
                                                                            <TableCell className="font-medium">{item.driver}</TableCell>
                                                                            <TableCell>
                                                                                <Badge variant={item.source === 'Commentaire' ? 'destructive' : 'secondary'}>
                                                                                    {item.source === 'Commentaire' ? <MessageSquare className="mr-1.5 h-3 w-3"/> : <ThumbsDown className="mr-1.5 h-3 w-3"/>}
                                                                                    {item.source}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell className="text-sm text-muted-foreground italic">"{item.content}"</TableCell>
                                                                            <TableCell className="text-right">
                                                                                <Badge variant="destructive">{item.score}</Badge>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                            <div className="lg:col-span-1">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-base">Notes et Plan d'Action</CardTitle>
                                                        <CardDescription>Notes pour la journée du {format(new Date(), 'dd/MM/yyyy')}.</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <Textarea 
                                                            placeholder="Vos notes pour le suivi, les actions à mener..."
                                                            className="min-h-[350px]"
                                                            value={notes[depot] || ''}
                                                            onChange={(e) => handleNoteChange(depot, e.target.value)}
                                                        />
                                                        <Button onClick={() => handleSaveNote(depot)} disabled={isSaving} className="w-full relative">
                                                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            {isSaving ? 'Sauvegarde...' : 'Sauvegarder la note'}
                                                            {!isNoteSavedToday && !isSaving && (
                                                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                                </span>
                                                            )}
                                                             {isNoteSavedToday && !isSaving && (
                                                                <CheckCircle className="ml-2 h-4 w-4 text-green-400" />
                                                            )}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            )}
        </main>
    );
}
