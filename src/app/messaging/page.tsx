
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useUser, useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, orderBy, serverTimestamp, addDoc, updateDoc, doc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Hash, Loader2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Room {
    id: string;
    name: string;
    members: string[];
    lastMessage?: {
        text: string;
        timestamp: any;
        senderName: string;
    }
}

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: any;
}

const RoomListItem = ({ room, isSelected, onSelect }: { room: Room; isSelected: boolean; onSelect: () => void; }) => {
    const lastMessageTimestamp = room.lastMessage?.timestamp?.toDate ? formatDistanceToNow(room.lastMessage.timestamp.toDate(), { addSuffix: true, locale: fr }) : null;

    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
        >
            <Avatar className="h-10 w-10 border">
                <AvatarFallback><Hash className="w-5 h-5"/></AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">{room.name}</p>
                    {lastMessageTimestamp && <p className={cn("text-xs", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>{lastMessageTimestamp}</p>}
                </div>
                {room.lastMessage ? (
                    <p className={cn("text-sm truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                        <span className="font-medium">{room.lastMessage.senderName}:</span> {room.lastMessage.text}
                    </p>
                ) : (
                     <p className={cn("text-sm truncate italic", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>Aucun message</p>
                )}
            </div>
        </button>
    )
}

const ChatMessage = ({ message, isOwn }: { message: Message; isOwn: boolean; }) => {
    const messageTimestamp = message.timestamp?.toDate ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true, locale: fr }) : null;
    const initials = message.senderName.split(' ').map(n => n[0]).join('');

    return (
        <div className={cn("flex items-start gap-3 my-4", isOwn && "flex-row-reverse")}>
            <Avatar className="h-8 w-8 border">
                 <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className={cn(
                "max-w-xs md:max-w-md p-3 rounded-lg",
                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
                <p className="font-semibold text-sm mb-1">{message.senderName}</p>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                 {messageTimestamp && <p className={cn("text-xs mt-2 text-right", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>{messageTimestamp}</p>}
            </div>
        </div>
    )
}

const ChatWindow = ({ room }: { room: Room }) => {
    const { firestore } = useFirebase();
    const { user, userProfile } = useUser();
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, "rooms", room.id, "messages"), orderBy("timestamp", "asc")) : null
    , [firestore, room.id]);

    const { data: messages, loading } = useCollection<Message>(messagesQuery, [], {realtime: true});

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user || !userProfile || !newMessage.trim()) return;

        setIsSending(true);
        const messageText = newMessage.trim();
        setNewMessage("");
        
        try {
            const messagesCol = collection(firestore, "rooms", room.id, "messages");
            const roomDoc = doc(firestore, "rooms", room.id);

            await addDoc(messagesCol, {
                text: messageText,
                senderId: user.uid,
                senderName: userProfile.displayName,
                timestamp: serverTimestamp(),
            });

            await updateDoc(roomDoc, {
                lastMessage: {
                    text: messageText,
                    senderName: userProfile.displayName,
                    timestamp: serverTimestamp(),
                }
            });

        } catch (error) {
            console.error("Error sending message:", error);
            // Optionally show a toast
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground"/>
                <h2 className="text-xl font-semibold">{room.name}</h2>
            </header>

            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {loading && <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>}
                {!loading && messages.length === 0 && <div className="text-center text-muted-foreground pt-16">Soyez le premier à envoyer un message !</div>}
                {messages.map(msg => <ChatMessage key={msg.id} message={msg} isOwn={msg.senderId === user?.uid} />)}
            </ScrollArea>

            <footer className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Écrivez votre message..."
                        disabled={isSending}
                    />
                    <Button type="submit" disabled={!newMessage.trim() || isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Envoyer</span>
                    </Button>
                </form>
            </footer>
        </div>
    )
}

export default function MessagingPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

    const roomsQuery = useMemoFirebase(() => 
        firestore && user ? query(collection(firestore, 'rooms'), where('members', 'array-contains', user.uid), orderBy('lastMessage.timestamp', 'desc')) : null
    , [firestore, user]);

    const { data: rooms, loading } = useCollection<Room>(roomsQuery, [], { realtime: true });

    useEffect(() => {
        if (!selectedRoomId && rooms.length > 0) {
            setSelectedRoomId(rooms[0].id);
        }
    }, [rooms, selectedRoomId]);

    const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);

    return (
        <div className="h-[calc(100vh-10rem)] border rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
            <aside className="md:col-span-1 lg:col-span-1 border-r flex flex-col">
                <header className="p-4 border-b">
                    <h1 className="text-xl font-bold">Messagerie</h1>
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
