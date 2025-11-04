
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Loader2, MessageCircle, Pencil } from "lucide-react";
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

    const roomsQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'rooms'), where('members', 'array-contains', user.uid), orderBy('lastMessage.timestamp', 'desc')) : null
    , [firestore, user]);

    const { data: rooms, loading } = useCollection<Room>(roomsQuery, [], { realtime: true });

    useEffect(() => {
        // If there's an initial room ID from URL, keep it.
        // Otherwise, if no room is selected and rooms have loaded, select the first one.
        if (initialRoomId && !selectedRoomId) {
            setSelectedRoomId(initialRoomId);
        } else if (!selectedRoomId && !initialRoomId && rooms.length > 0) {
            setSelectedRoomId(rooms[0].id);
        }
    }, [rooms, selectedRoomId, initialRoomId]);

    const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);
    
    const handleRoomCreated = (roomId: string) => {
        setSelectedRoomId(roomId);
    };

    return (
        <div className="h-[calc(100vh-10rem)] border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            <aside className="md:col-span-1 lg:col-span-1 border-r flex flex-col">
                <header className="p-4 border-b flex justify-between items-center">
                    <h1 className="text-xl font-bold">Messagerie</h1>
                    <NewChatDialog onRoomCreated={handleRoomCreated} />
                </header>
                <ScrollArea className="flex-1 p-2">
                    {loading && <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    {!loading && rooms.length === 0 && <p className="p-4 text-center text-muted-foreground">Aucun salon de discussion.</p>}
                    <div className="space-y-1">
                        {rooms.map(room => (
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
                        <MessageCircle className="h-16 w-16 mb-4"/>
                        <h2 className="text-xl font-semibold">Sélectionnez un salon</h2>
                        <p>Choisissez un salon de discussion dans la liste pour commencer à chatter.</p>
                    </div>
                 )}
            </main>
        </div>
    );
}
