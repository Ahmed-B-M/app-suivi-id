
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy, serverTimestamp, getDoc, doc, QueryConstraint } from "firebase/firestore";
import { Loader2, MessageCircle } from "lucide-react";
import { RoomListItem } from "@/components/app/messaging/room-list-item";
import { ChatWindow } from "@/components/app/messaging/chat-window";
import { NewChatDialog } from "@/components/app/messaging/new-chat-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Room } from "@/lib/types";
import { useSearchParams } from "next/navigation";


export default function MessagingPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const searchParams = useSearchParams();
    const initialRoomId = searchParams.get('roomId');

    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId);

    const roomsCollection = useMemoFirebase(() => 
        firestore ? collection(firestore, 'rooms') : null
    , [firestore]);
    
    const roomsConstraints = useMemoFirebase((): QueryConstraint[] => 
        user 
            ? [
                where('members', 'array-contains', user.uid),
                orderBy('createdAt', 'desc')
              ] 
            : []
    , [user]);

    const { data: rooms, loading, setData: setRooms } = useCollection<Room>(roomsCollection, roomsConstraints, { realtime: true });
    
    const sortedRooms = useMemo(() => {
        return [...rooms].sort((a, b) => {
            const timeA = a.lastMessage?.timestamp?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
            const timeB = b.lastMessage?.timestamp?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
        });
    }, [rooms]);


    useEffect(() => {
        if (initialRoomId && !selectedRoomId) {
            setSelectedRoomId(initialRoomId);
        } else if (!selectedRoomId && !initialRoomId && sortedRooms.length > 0) {
            setSelectedRoomId(sortedRooms[0].id);
        }
    }, [sortedRooms, selectedRoomId, initialRoomId]);

    const selectedRoom = useMemo(() => sortedRooms.find(r => r.id === selectedRoomId), [sortedRooms, selectedRoomId]);
    
    const handleRoomCreated = (newRoom: Room) => {
        // Optimistically add the new room to the list to avoid waiting for the listener
        setRooms(prevRooms => {
            const roomExists = prevRooms.some(r => r.id === newRoom.id);
            if (!roomExists) {
                return [newRoom, ...prevRooms];
            }
            return prevRooms;
        });
        setSelectedRoomId(newRoom.id);
    };

    // This effect ensures that if a room ID is provided (e.g., from a URL)
    // but the room isn't in the local list yet, we fetch it directly.
    useEffect(() => {
        if (firestore && selectedRoomId && !selectedRoom) {
            const roomRef = doc(firestore, 'rooms', selectedRoomId);
            getDoc(roomRef).then(docSnap => {
                if (docSnap.exists()) {
                    const newRoom = { id: docSnap.id, ...docSnap.data() } as Room;
                    // Add the fetched room to the local state so it can be rendered.
                    setRooms(prevRooms => {
                         if (!prevRooms.some(r => r.id === newRoom.id)) {
                             return [newRoom, ...prevRooms];
                         }
                         return prevRooms;
                    });
                } else {
                    // Handle case where the room doesn't exist or user doesn't have access
                    setSelectedRoomId(null);
                }
            });
        }
    }, [selectedRoomId, selectedRoom, firestore, setRooms]);

    return (
        <div className="h-[calc(100vh-10rem)] border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            <aside className="md:col-span-1 lg:col-span-1 border-r flex flex-col">
                <header className="p-4 border-b flex justify-between items-center">
                    <h1 className="text-xl font-bold">Messagerie</h1>
                    <NewChatDialog onRoomCreated={handleRoomCreated} />
                </header>
                <ScrollArea className="flex-1 p-2">
                    {loading && <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    {!loading && sortedRooms.length === 0 && <p className="p-4 text-center text-muted-foreground">Aucun salon de discussion.</p>}
                    <div className="space-y-1">
                        {sortedRooms.map(room => (
                            <RoomListItem 
                                key={room.id} 
                                room={room} 
                                isSelected={room.id === selectedRoomId}
                                onSelect={() => setSelectedRoomId(room.id)}
                                currentUserId={user?.uid}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </aside>
            <main className="md:col-span-2 lg:col-span-3">
                 {selectedRoom ? (
                    <ChatWindow room={selectedRoom} />
                 ) : (
                    <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground p-8">
                        {loading ? (
                            <Loader2 className="h-16 w-16 animate-spin mb-4" />
                        ) : (
                            <MessageCircle className="h-16 w-16 mb-4"/>
                        )}
                        <h2 className="text-xl font-semibold">
                           {loading ? "Chargement..." : "Sélectionnez un salon"}
                        </h2>
                        <p>{loading ? "Récupération des discussions..." : "Choisissez un salon de discussion dans la liste pour commencer à chatter."}</p>
                    </div>
                 )}
            </main>
        </div>
    );
}
