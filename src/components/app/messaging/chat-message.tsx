
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Message } from "@/lib/types";
import { Bot } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export const ChatMessage = ({ message, isOwn }: { message: Message; isOwn: boolean; }) => {
    const messageTimestamp = message.timestamp?.toDate ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true, locale: fr }) : null;
    const initials = message.senderName ? message.senderName.split(' ').map(n => n[0]).join('') : '?';
    const isBot = message.senderId === 'system';

    return (
        <div className={cn("flex items-start gap-3 my-4", isOwn && "flex-row-reverse")}>
            <Avatar className="h-8 w-8 border">
                 {isBot ? <Bot /> : <AvatarFallback>{initials}</AvatarFallback>}
            </Avatar>
            <div className={cn(
                "max-w-xs md:max-w-md p-3 rounded-lg",
                isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
                isBot && "bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800"
            )}>
                <p className={cn("font-semibold text-sm mb-1", isOwn ? "text-primary-foreground" : "text-foreground")}>{message.senderName}</p>
                <div className={cn("text-sm prose prose-sm dark:prose-invert max-w-none", isOwn ? "text-primary-foreground" : "text-foreground")}>
                  <ReactMarkdown
                    components={{
                        p: ({node, ...props}) => <p className="my-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
                 {messageTimestamp && <p className={cn("text-xs mt-2 text-right", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>{messageTimestamp}</p>}
            </div>
        </div>
    )
}
