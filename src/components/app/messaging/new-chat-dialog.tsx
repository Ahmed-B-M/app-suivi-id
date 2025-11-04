
"use client";

import { useState, useMemo } from "react";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UserProfile, Room } from "@/lib/types";

export const NewChatDialog = ({ onRoomCreated }: { onRoomCreated: (room: Room) => void }) => {
    const { firestore } = useFirebase();
    const { user: currentUser } = useUser();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: allUsers, loading } = useCollection<UserProfile>(usersQuery, [], {realtime: true});

    const filteredUsers = useMemo(() => {
        return (allUsers || [])
            .filter(u => u.uid !== currentUser?.uid)
            .filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()));
    }, [allUsers, search, currentUser]);
    
    const handleSelectUser = async (selectedUser: UserProfile) => {
        if (!firestore || !currentUser) return;
        
        const members = [currentUser.uid, selectedUser.uid].sort();
        const roomQuery = query(collection(firestore, 'rooms'), where('isGroup', '==', false), where('members', '==', members));

        const querySnapshot = await getDocs(roomQuery);
        let roomToSelect: Room;

        if (!querySnapshot.empty) {
            const existingRoomDoc = querySnapshot.docs[0];
            roomToSelect = { id: existingRoomDoc.id, ...existingRoomDoc.data() } as Room;
        } else {
            const newRoomData = {
                name: `Conversation avec ${selectedUser.displayName}`,
                isGroup: false,
                members: members,
                createdAt: serverTimestamp(),
                lastMessage: null,
            };
            const newRoomRef = await addDoc(collection(firestore, 'rooms'), newRoomData);
            const newDocSnap = await getDoc(newRoomRef);
            roomToSelect = { id: newDocSnap.id, ...newDocSnap.data() } as Room;
        }

        onRoomCreated(roomToSelect);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4"/>
                    <span className="sr-only">Nouveau message</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nouveau Message</DialogTitle>
                    <DialogDescription>Sélectionnez un utilisateur pour démarrer une conversation.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Rechercher un utilisateur..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <ScrollArea className="h-72">
                    {loading && <Loader2 className="animate-spin mx-auto my-4"/>}
                    <div className="p-1">
                        {filteredUsers.map(user => (
                            <button key={user.uid} onClick={() => handleSelectUser(user)} className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-muted">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback>{user.displayName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{user.displayName}</p>
                                    <p className="text-xs text-muted-foreground">{user.role}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
