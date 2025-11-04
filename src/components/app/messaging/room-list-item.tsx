
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Users, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Room } from "@/lib/types";

export const RoomListItem = ({ room, isSelected, onSelect, currentUserId }: { room: Room; isSelected: boolean; onSelect: () => void; currentUserId: string | undefined }) => {
    const lastMessageTimestamp = room.lastMessage?.timestamp?.toDate ? formatDistanceToNow(room.lastMessage.timestamp.toDate(), { addSuffix: true, locale: fr }) : null;
    
    // For 1-on-1 chats, we might want to show the other user's name
    // This part can be enhanced later by fetching user profiles
    const roomName = room.name;

    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
        >
            <Avatar className="h-10 w-10 border">
                <AvatarFallback>
                    {room.isGroup ? <Users className="w-5 h-5"/> : <Hash className="w-5 h-5"/>}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
                <div className="flex justify-between items-center">
                    <p className="font-semibold truncate">{roomName}</p>
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
