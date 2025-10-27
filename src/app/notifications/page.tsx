
"use client";

import { useState, useMemo, useTransition } from "react";
import { useCollection, useFirebase } from "@/firebase";
import { collection, orderBy, query, writeBatch, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, Archive, Eye, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";


export default function NotificationsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const notificationsCollection = useMemo(() => 
        firestore ? query(collection(firestore, "notifications"), orderBy("createdAt", "desc")) : null
    , [firestore]);

    const { data: notifications, loading, error } = useCollection<Notification>(notificationsCollection);

    const handleUpdateStatus = (ids: string[], status: 'read' | 'archived') => {
        if (!firestore || ids.length === 0) return;

        startTransition(async () => {
            const batch = writeBatch(firestore);
            ids.forEach(id => {
                const docRef = doc(firestore, "notifications", id);
                batch.update(docRef, { status });
            });
            try {
                await batch.commit();
                toast({ title: "Succès", description: `Les notifications ont été mises à jour.` });
            } catch (error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            }
        });
    };

    const unreadNotifications = useMemo(() => notifications.filter(n => n.status === 'unread'), [notifications]);
    const readNotifications = useMemo(() => notifications.filter(n => n.status === 'read'), [notifications]);

    if (loading) {
        return (
            <main className="container mx-auto py-8">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-1/4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </main>
        )
    }

    if (error) {
        return <div className="text-destructive">Erreur: {error.message}</div>
    }

    return (
        <main className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Bell />
                        Centre de Notifications
                    </CardTitle>
                    <CardDescription>
                        Liste des alertes et notifications générées par le système.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-semibold mb-4">Non lues ({unreadNotifications.length})</h3>
                    {unreadNotifications.length > 0 ? (
                        <div className="mb-8">
                             <div className="flex justify-end gap-2 mb-4">
                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(unreadNotifications.map(n => n.id), 'read')} disabled={isPending}>
                                    <Eye className="mr-2 h-4 w-4" /> Marquer tout comme lu
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(unreadNotifications.map(n => n.id), 'archived')} disabled={isPending}>
                                    <Archive className="mr-2 h-4 w-4" /> Tout archiver
                                </Button>
                            </div>
                            <NotificationTable 
                                notifications={unreadNotifications} 
                                onUpdateStatus={handleUpdateStatus}
                                isPending={isPending}
                            />
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8 border rounded-md">Aucune nouvelle notification.</p>
                    )}

                    <h3 className="text-lg font-semibold my-4">Lues ({readNotifications.length})</h3>
                     {readNotifications.length > 0 ? (
                        <div>
                            <div className="flex justify-end gap-2 mb-4">
                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(readNotifications.map(n => n.id), 'archived')} disabled={isPending}>
                                    <Archive className="mr-2 h-4 w-4" /> Tout archiver
                                </Button>
                            </div>
                            <NotificationTable 
                                notifications={readNotifications} 
                                onUpdateStatus={handleUpdateStatus}
                                isPending={isPending}
                                isRead={true}
                            />
                        </div>
                    ) : (
                         <p className="text-muted-foreground text-center py-8 border rounded-md">Aucune notification lue.</p>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}

const NotificationTable = ({ notifications, onUpdateStatus, isPending, isRead = false }: { notifications: Notification[], onUpdateStatus: (ids: string[], status: 'read' | 'archived') => void, isPending: boolean, isRead?: boolean}) => {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-1/2">Message</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notifications.map(notification => (
                        <TableRow key={notification.id} className={cn(isRead && "text-muted-foreground")}>
                            <TableCell className="text-xs">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}
                            </TableCell>
                            <TableCell>
                                <Badge variant={notification.type === 'quality_alert' ? 'destructive' : 'secondary'}>
                                    {notification.type}
                                </Badge>
                            </TableCell>
                            <TableCell>{notification.message}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    {!isRead && (
                                        <Button size="sm" variant="ghost" onClick={() => onUpdateStatus([notification.id], 'read')} disabled={isPending}>
                                            <Eye className="mr-2 h-4 w-4" /> Marquer comme lu
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => onUpdateStatus([notification.id], 'archived')} disabled={isPending}>
                                        <Archive className="mr-2 h-4 w-4" /> Archiver
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
