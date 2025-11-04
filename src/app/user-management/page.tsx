
"use client";

import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { useQuery, useFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Users } from "lucide-react";
import type { UserProfile, Role } from "@/lib/types";
import { ROLE_PERMISSIONS, ALL_PAGES } from "@/lib/roles";
import { DEPOTS_LIST } from "@/lib/grouping";

type EditableUserProfile = Partial<UserProfile>;

const roles: Role[] = ["admin", "RD", "Dispatch", "RH", "Qualité", "viewer"];

export default function UserManagementPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, startSavingTransition] = useTransition();
    const [editedUsers, setEditedUsers] = useState<Record<string, EditableUserProfile>>({});

    const usersCollection = useMemo(() => firestore ? collection(firestore, "users") : null, [firestore]);
    const { data: users, loading } = useQuery<UserProfile>(usersCollection, [], { realtime: true });

    const handleUserChange = (uid: string, field: keyof EditableUserProfile, value: any) => {
        setEditedUsers(prev => {
            const userChanges = { ...prev[uid], [field]: value };
            // Auto-update displayName when firstName or lastName changes
            if (field === 'firstName' || field === 'lastName') {
                const currentData = users.find(u => u.uid === uid);
                const firstName = (field === 'firstName' ? value : userChanges.firstName) ?? currentData?.firstName ?? '';
                const lastName = (field === 'lastName' ? value : userChanges.lastName) ?? currentData?.lastName ?? '';
                userChanges.displayName = `${firstName} ${lastName}`.trim();
            }
            return { ...prev, [uid]: userChanges };
        });
    };

    const handleSaveChanges = () => {
        if (!firestore || Object.keys(editedUsers).length === 0) return;

        startSavingTransition(async () => {
            const batch = writeBatch(firestore);
            Object.entries(editedUsers).forEach(([uid, changes]) => {
                const userRef = doc(firestore, "users", uid);
                batch.update(userRef, changes);
            });
            try {
                await batch.commit();
                toast({ title: "Succès", description: "Les modifications ont été sauvegardées." });
                setEditedUsers({});
            } catch (error: any) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
            }
        });
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <main className="container mx-auto py-8 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Users /> Gestion des Utilisateurs</CardTitle>
                            <CardDescription>Modifiez les informations, le poste et les permissions des utilisateurs.</CardDescription>
                        </div>
                        <Button onClick={handleSaveChanges} disabled={isSaving || Object.keys(editedUsers).length === 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Sauvegarder ({Object.keys(editedUsers).length})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Nom</TableHead>
                                    <TableHead className="w-[150px]">Prénom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="w-[200px]">Poste</TableHead>
                                    <TableHead className="w-[150px]">Rôle (Permissions)</TableHead>
                                    <TableHead className="w-[250px]">Dépôts d'affectation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => {
                                    const currentUserState = { ...user, ...editedUsers[user.uid] };
                                    return (
                                        <TableRow key={user.uid}>
                                            <TableCell>
                                                <Input
                                                    value={currentUserState.lastName || ''}
                                                    onChange={(e) => handleUserChange(user.uid, 'lastName', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={currentUserState.firstName || ''}
                                                    onChange={(e) => handleUserChange(user.uid, 'firstName', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                 <Input
                                                    value={currentUserState.jobTitle || ''}
                                                    placeholder="Ex: Responsable Qualité"
                                                    onChange={(e) => handleUserChange(user.uid, 'jobTitle', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select value={currentUserState.role} onValueChange={(value) => handleUserChange(user.uid, 'role', value)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {roles.map(role => (
                                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <MultiSelectCombobox
                                                    options={DEPOTS_LIST}
                                                    selected={currentUserState.depots || []}
                                                    onChange={(value) => handleUserChange(user.uid, 'depots', value)}
                                                    placeholder="Affecter à des dépôts..."
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Gestion des Permissions par Rôle</CardTitle>
                    <CardDescription>Définissez les pages accessibles pour chaque rôle. Les administrateurs ont accès à tout.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">La gestion des permissions se fait directement dans le fichier de code <code className="font-mono bg-muted p-1 rounded-sm">src/lib/roles.ts</code>. Vous pouvez y ajuster les tableaux de permissions pour chaque rôle.</p>
                </CardContent>
            </Card>
        </main>
    );
}
