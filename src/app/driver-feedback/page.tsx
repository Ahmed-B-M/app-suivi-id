
"use client";

import { useMemo, useState, useTransition } from "react";
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
import { AlertTriangle, BookUser, MessageSquare, ThumbsDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveActionNoteAction } from "../actions";
import { useCollection } from "@/firebase";
import { collection } from "firebase/firestore";
import { useFirebase } from "@/firebase/provider";


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
};

export default function DriverFeedbackPage() {
    const { allComments, allProcessedVerbatims, isContextLoading, dateRange } = useFilters();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [note, setNote] = useState("");
    const [isSaving, startSaving] = useTransition();

    const todayString = format(new Date(), 'yyyy-MM-dd');
    const notesCollection = useMemo(() => {
        return firestore ? collection(firestore, 'action_notes') : null;
    }, [firestore]);
    const { data: savedNotes, loading: notesLoading } = useCollection<{date: string, content: string}>(notesCollection);

    const todaysNote = useMemo(() => {
        return savedNotes.find(n => n.id === todayString)?.content || "";
    }, [savedNotes, todayString]);
    
    // Set initial note content when today's note is loaded
    useState(() => {
        if (todaysNote) {
            setNote(todaysNote);
        }
    });

    const aggregatedFeedback = useMemo(() => {
        if (isContextLoading) return [];

        const feedback: AggregatedFeedback[] = [];

        // Process negative comments
        allComments.forEach(comment => {
            const categories = Array.isArray(comment.category) ? comment.category : [comment.category];
            if (categories.some(cat => RELEVANT_COMMENT_CATEGORIES.has(cat as string))) {
                feedback.push({
                    date: comment.taskDate ? format(new Date(comment.taskDate as string), 'yyyy-MM-dd') : 'N/A',
                    driver: comment.driverName || "Inconnu",
                    source: 'Commentaire',
                    content: comment.comment,
                    score: comment.rating,
                });
            }
        });

        // Process NPS verbatims with "ID" responsibility
        allProcessedVerbatims.forEach(verbatim => {
            if (verbatim.responsibilities.includes('ID')) {
                feedback.push({
                    date: verbatim.taskDate ? format(new Date(verbatim.taskDate), 'yyyy-MM-dd') : 'N/A',
                    driver: verbatim.driver || 'Inconnu',
                    source: 'Verbatim NPS',
                    content: verbatim.verbatim,
                    score: verbatim.npsScore,
                });
            }
        });

        // Sort by date descending
        return feedback.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [allComments, allProcessedVerbatims, isContextLoading]);
    
    const handleSaveNote = () => {
        startSaving(async () => {
            const result = await saveActionNoteAction({ content: note, date: todayString });
            if (result.success) {
                toast({ title: 'Note sauvegardée', description: 'Votre note pour aujourd\'hui a été enregistrée.' });
            } else {
                toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
            }
        });
    };

    const isLoading = isContextLoading || notesLoading;

    return (
        <main className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Suivi des Retours Livreurs</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookUser /> Retours Agrégés</CardTitle>
                            <CardDescription>
                                Centralisation des commentaires et verbatims liés à la performance des livreurs (responsabilité ID).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[600px] overflow-y-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Livreur</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead className="w-[50%]">Contenu</TableHead>
                                            <TableHead className="text-right">Note/Score</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Chargement...</TableCell></TableRow>}
                                        {!isLoading && aggregatedFeedback.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-48 text-muted-foreground">
                                                    Aucun retour pertinent pour la période sélectionnée.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {!isLoading && aggregatedFeedback.map((item, index) => (
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
                            <CardTitle>Notes et Plan d'Action</CardTitle>
                            <CardDescription>Saisissez ici vos notes pour la journée du {format(new Date(), 'dd/MM/yyyy')}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <Textarea 
                                placeholder="Vos notes pour le suivi, les actions à mener..."
                                className="min-h-[400px]"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                defaultValue={todaysNote}
                            />
                            <Button onClick={handleSaveNote} disabled={isSaving} className="w-full">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sauvegarder la note
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

