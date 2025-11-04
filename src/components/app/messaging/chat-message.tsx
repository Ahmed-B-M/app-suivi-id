
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Message } from "@/lib/types";

export const ChatMessage = ({ message, isOwn }: { message: Message; isOwn: boolean; }) => {
    const messageTimestamp = message.timestamp?.toDate ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true, locale: fr }) : null;
    const initials = message.senderName ? message.senderName.split(' ').map(n => n[0]).join('') : '?';

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
