
"use client";

import { useState, useMemo, useTransition } from "react";
import { useQuery, useFirebase } from "@/firebase";
import { collection, orderBy, writeBatch, doc, where, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, Archive, Eye, Link as LinkIcon, Loader2, User, Route, AlertCircle, Weight, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";


export default function NotificationsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const notificationsCollection = useMemo(() => 
        firestore 
            ? query(
                collection(firestore, "notifications"), 
                where("status", "!=", "archived"), 
                orderBy("status", "asc"), 
                orderBy("createdAt", "desc")
              ) 
            : null
    , [firestore]);

    const { data: notifications, loading, error } = useQuery<Notification>(notificationsCollection, [], {realtime: true});

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
    
    const parseDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        if (typeof dateValue === 'object' && dateValue.seconds) {
            return new Date(dateValue.seconds * 1000);
        }
        if (dateValue instanceof Date) {
            return dateValue;
        }
        const parsedDate = new Date(dateValue);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
    };
    
    const extractInfo = (message: string): { driver: string | null; round: string | null; mainMessage: string, detail: string | null } => {
        const driverMatch = message.match(/pour (.*?)\./);
        const roundMatch = message.match(/tournée (.*?)\./);
        const noteMatch = message.match(/Note de (\d+\/\d+)/);
        const weightMatch = message.match(/\((\d+(\.\d+)?) kg\)/);

        let mainMessage = message;
        if (driverMatch) mainMessage = mainMessage.replace(driverMatch[0], '');
        if (roundMatch) mainMessage = mainMessage.replace(roundMatch[0], '');
        if (noteMatch) mainMessage = mainMessage.replace(noteMatch[0], '');
        if (weightMatch) mainMessage = mainMessage.replace(weightMatch[0], '');

        return {
            driver: driverMatch ? driverMatch[1] : null,
            round: roundMatch ? roundMatch[1] : null,
            mainMessage: mainMessage.replace(/\.$/, '').trim(),
            detail: noteMatch ? noteMatch[1] : (weightMatch ? `${weightMatch[1]} kg` : null)
        };
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'quality_alert': return <AlertCircle className="h-4 w-4 text-destructive" />;
            case 'overweight_round': return <Weight className="h-4 w-4 text-orange-500" />;
            case 'late_delivery_pattern': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default: return <Bell className="h-4 w-4" />;
        }
    }


    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Livreur</TableHead>
                        <TableHead>Tournée</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Détail</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notifications.map(notification => {
                        const createdAtDate = parseDate(notification.createdAt);
                        const linkHref = notification.relatedEntity ? `/${notification.relatedEntity.type}/${notification.relatedEntity.id}` : '#';
                        const info = extractInfo(notification.message);

                        return (
                            <TableRow key={notification.id} className={cn(isRead && "text-muted-foreground")}>
                                <TableCell className="text-xs">
                                    {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true, locale: fr }) : 'Date inconnue'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={notification.type === 'quality_alert' ? 'destructive' : 'secondary'}>
                                        <div className="flex items-center gap-1.5">
                                            {getNotificationIcon(notification.type)}
                                            <span className="capitalize">{notification.type.replace(/_/g, ' ')}</span>
                                        </div>
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                  {info.driver && <span className="flex items-center gap-1.5"><User className="h-4 w-4"/>{info.driver}</span>}
                                </TableCell>
                                <TableCell>
                                  {info.round && <span className="flex items-center gap-1.5"><Route className="h-4 w-4"/>{info.round}</span>}
                                </TableCell>
                                <TableCell>
                                    <Link href={linkHref} className="hover:underline flex items-center gap-2">
                                        <span>{info.mainMessage}</span>
                                        {notification.relatedEntity && <LinkIcon className="h-3 w-3 shrink-0" />}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    {info.detail && <Badge variant="outline">{info.detail}</Badge>}
                                </TableCell>
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
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
