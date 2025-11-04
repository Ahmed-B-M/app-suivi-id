
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, addDoc, updateDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Loader2, User as UserIcon } from "lucide-react";
import { ChatMessage } from "./chat-message";
import type { Room, Message } from "@/lib/types";

export const ChatWindow = ({ room }: { room: Room }) => {
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
            setTimeout(() => {
                 if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
                 }
            }, 100);
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
                {room.isGroup ? <Users className="h-5 w-5 text-muted-foreground"/> : <UserIcon className="h-5 w-5 text-muted-foreground"/>}
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
