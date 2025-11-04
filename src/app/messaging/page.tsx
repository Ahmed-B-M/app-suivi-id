
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useUser, useFirebase, useMemoFirebase } from "@/firebase";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, orderBy, serverTimestamp, addDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Hash, Loader2, MessageCircle, Pencil, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: string;
}

interface Room {
    id: string;
    name: string;
    members: string[];
    isGroup: boolean;
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

const RoomListItem = ({ room, isSelected, onSelect, currentUserId }: { room: Room; isSelected: boolean; onSelect: () => void; currentUserId: string | undefined }) => {
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

const ChatMessage = ({ message, isOwn }: { message: Message; isOwn: boolean; }) => {
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

const NewChatDialog = ({ onRoomCreated }: { onRoomCreated: (roomId: string) => void }) => {
    const { firestore } = useFirebase();
    const { user: currentUser, userProfile: currentUserProfile } = useUser();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: allUsers, loading } = useCollection<UserProfile>(usersQuery, [], {realtime: true});

    const filteredUsers = useMemo(() => {
        return (allUsers || [])
            .filter(u => u.uid !== currentUser?.uid) // Exclude self
            .filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()));
    }, [allUsers, search, currentUser]);
    
    const handleSelectUser = async (selectedUser: UserProfile) => {
        if (!firestore || !currentUser) return;
        
        // Check if a 1-on-1 room already exists
        const members = [currentUser.uid, selectedUser.uid].sort();
        const roomQuery = query(collection(firestore, 'rooms'), where('isGroup', '==', false), where('members', '==', members));

        const querySnapshot = await getDocs(roomQuery);
        if (!querySnapshot.empty) {
            // Room exists, select it
            const existingRoom = querySnapshot.docs[0];
            onRoomCreated(existingRoom.id);
        } else {
            // Create a new room
            const newRoomData = {
                name: `Conversation avec ${selectedUser.displayName}`,
                isGroup: false,
                members: members,
                createdAt: serverTimestamp(),
            };
            const newRoomRef = await addDoc(collection(firestore, 'rooms'), newRoomData);
            onRoomCreated(newRoomRef.id);
        }
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
```
  </change>
  <change>
    <file>src/lib/types.ts</file>
    <content><![CDATA[
import { Timestamp } from "firebase/firestore";

export interface Article {
    // Identification & Liens
    tacheId: string;
    codeBarre: string;
    tourneeId: string;
    nomTournee: string;

    // Détails du Bac
    nom: string;
    type: string;
    statut: string;
    quantite: number;
    quantiteTraitee: number;
    dimensions: any;
    encodageCodeBarres: string;
    endommage: any;

    // Champs Techniques & Vides
    log: any[];
    reference: string;
    etiquettes: any[];
    competences: any[];
    metaDonnees: any;
    description: string;
    groupe: string;
}


export interface Tache {
    // Identification
    tacheId: string; // Votre ID de tâche (ex: 619118027)
    idInterne: string; // taskReference
    referenceTache: string; // taskReference (doublon)
    id: string; // _id from API
    commande?: string; // metadata.numeroCommande
    client?: string; // L'expéditeur, ex: "CARREFOUR LAD"

    // Contenu de la Tâche
    bacsSurg: number;
    bacsFrais: number;
    bacsSec: number;
    bacsPoisson: number;
    bacsBoucherie: number;
    totalSecFrais: number;
    nombreDeBacs?: number;
    nombreDeBacsMeta?: number;
    poidsEnKg?: number;
    volumeEnCm3?: number;

    // Planification
    date?: string | Date | Timestamp;
    dateInitialeLivraison?: string;
    debutCreneauInitial?: string;
    finCreneauInitial?: string;
    debutFenetre?: string;
    finFenetre?: string;
    margeFenetreHoraire?: number;
    heureArriveeEstimee?: string;
    tempsDeServiceEstime?: number;

    // Adresse & Instructions
    adresse?: string;
    numero?: string;
    rue?: string;
    batiment?: string;
    batimentMeta?: string;
    etage?: string | number;
    digicode1?: string;
    avecAscenseur?: boolean;
    avecInterphone?: boolean;
    codeInterphone?: string;
    ville?: string;
    codePostal?: string;
    pays?: string;
    instructions?: string;

    // Contact Client
    personneContact?: string; // Le client final livré
    compteContact?: string;
    emailContact?: string;
    telephoneContact?: string;
    notifEmail?: boolean;
    notifSms?: boolean;

    // Réalisation & Statuts
    status?: string;
    heureArriveeReelle?: string;
    dateCloture?: string;
    surPlaceForce?: boolean;
    surPlaceValide?: boolean;
    tempsDeRetard?: number;
    dateDuRetard?: string;
    tentatives?: number;
    terminePar?: string;

    // Temps de Service Réel
    tempsDeServiceReel?: number;
    debutTempsService?: string;
    finTempsService?: string;
    confianceTempsService?: string;
    versionTempsService?: number;
    horodatagesMinuteur?: any[];

    // Preuves & Échecs
    sansContactForce?: boolean;
    raisonSansContact?: string;
    raisonEchec?: string;
    raisonEchecCusto?: string;
    nomSignature?: string;
    photoSucces?: string;
    latitudePosition?: number;
    longitudePosition?: number;

    // Infos Tournée & Chauffeur
    nomTournee?: string;
    sequence?: number;
    nomAssocie?: string; // La plateforme associée (ex: "ID Logistics")
    idExterneChauffeur?: string;
    prenomChauffeur?: string;
    nomChauffeur?: string;
    hubId?: string;
    nomHub?: string;
    nomPlateforme?: string;
    nomCompletChauffeur?: string;

    // Métadonnées & Système
    type?: string;
    flux?: string;
    progression?: string;
    tachesMemeArret?: number;
    categories?: any[];
    codePe?: string;
    notationLivreur?: number;
    serviceMeta?: string;
    codeEntrepôt?: string;
    metaCommentaireLivreur?: string;
    infosSuiviTransp?: any;
    desassocTranspRejetee?: boolean;
    dateMiseAJour?: string;
    dateCreation?: string;
    
    // Données brutes des articles
    articles: Article[];

    // Pour la liaison avec la tournée
    livreur?: {
        prenom?: string;
        nom?: string;
        idExterne?: string;
    };
}

export interface Tournee {
    // Identification
    id: string; // id ou _id
    idInterne: string; // id ou _id (doublon)
    nom: string; // name
    statut: string; // status
    activite: string; // activity
    date: string | Date | Timestamp; // date
    hubId: string; // hub
    nomHub: string; // nomHub (venant de la tâche)

    // Infos Chauffeur & Véhicule
    associeNom?: string; // La plateforme associée (ex: "ID Logistics")
    emailChauffeur?: string; // driver.externalId
    prenomChauffeur?: string; // driver.firstName
    nomChauffeur?: string; // driver.lastName
    immatriculation?: string; // metadata.Immatriculation
    nomVehicule?: string; // vehicle.name
    energie?: string; // metadata.Energie

    // Totaux de la Tournée (calculés)
    bacsSurg: number;
    bacsFrais: number;
    bacsSec: number;
    bacsPoisson: number;
    bacsBoucherie: number;
    totalSecFrais: number;

    // Totaux depuis l'API
    nombreDeBacs?: number; // dimensions.bac
    poidsTournee?: number; // dimensions.poids
    poidsReel: number; // calculé à partir des tâches
    volumeTournee?: number; // dimensions.volume
    nbCommandes?: number; // orderCount
    commandesTerminees?: number; // orderDone

    // Horaires & Lieux
    lieuDepart?: string; // startLocation
    heureDepart?: string; // startTime
    lieuFin?: string; // endLocation
    heureFin?: string; // endTime
    heureFinReelle?: string; // realInfo.hasFinished
    demarreeReel?: string; // realInfo.hasStarted
    prepareeReel?: string; // realInfo.hasPrepared
    tempsPreparationReel?: number; // realInfo.preparationTime

    // Métriques & Coûts
    dureeReel?: number; // realInfo.hasLasted
    tempsTotal?: number; // totalTime
    tempsTrajetTotal?: number; // totalTravelTime
    tempsServiceCmdTotal?: number; // totalOrderServiceTime
    tempsPauseTotal?: number; // totalBreakServiceTime
    tempsAttenteTotal?: number; // totalWaitTime
    tempsDeRetard?: number; // delay.time
    dateDuRetard?: string; // delay.when
    tempsViolationTotal?: number; // totalViolationTime
    distanceTotale?: number; // totalDistance
    coutTotal?: number; // totalCost
    coutParTemps?: number; // vehicle.costPerUnitTime

    // Données Techniques & Véhicule
    flux?: string;
    tempSurgChargement?: string; // metadata.TempSURG_Chargement
    tempFraisChargement?: string; // metadata.TempsFRAIS_Chargement
    tempFraisFin?: string; // metadata.TempsFRAIS_Fin
    tempSurgFin?: string; // metadata.TempsSURG_Fin
    codePostalMaitre?: string; // metadata.codePostalMaitre
    arrets?: any[]; // stops
    tempsAccelerationVehicule?: number; // vehicle.accelerationTime
    pausesVehicule?: boolean; // vehicle.breaks
    capaciteBacs?: number; // vehicle.dimensions.bac
    capacitePoids?: number; // vehicle.dimensions.poids
    dimVehiculeVolume?: number; // vehicle.dimensions.volume
    distanceMaxVehicule?: number; // vehicle.maxDistance
    dureeMaxVehicule?: number; // vehicle.maxDuration
    commandesMaxVehicule?: number; // vehicle.maxOrders
    misAJourLe?: string; // updated
    valide?: boolean; // validated
    carrierOverride?: string;
    driver?: any; // Garder l'objet driver pour getDriverFullName
}


// Représentation de base de l'objet Tournée (ancien)
export interface Round {
  id: string;
  _id: string; // some items use _id
  name: string;
  status: string;
  date: string;
  // Add other round properties as needed
  [key: string]: any;
}

export type NpsVerbatim = {
    taskId: string;
    npsScore: number;
    npsCategory: 'Promoter' | 'Passive' | 'Detractor';
    verbatim: string;
    store: string;
    taskDate: string;
    carrier?: string;
    depot?: string;
    driver?: string;
};

export type NpsData = {
    id: string;
    associationDate: string | Date | Timestamp;
    verbatims: NpsVerbatim[];
}

export type CommentStatus = 'à traiter' | 'en cours' | 'traité';

export type ProcessedNpsVerbatim = {
    id: string; // document id
    taskId: string;
    npsScore: number;
    verbatim: string;
    responsibilities: string[] | string;
    category: string[] | string;
    status: CommentStatus;
    // other fields from NpsVerbatim if needed
    store: string;
    taskDate: string;
    carrier?: string;
    depot?: string;
    driver?: string;
    associationDate: string;
}

export interface ActionNoteDepot {
    id: string; // Will be `depot-date` format
    depot: string;
    date: string; // YYYY-MM-DD
    content: string;
}

export interface Notification {
  id: string;
  type: 'quality_alert' | 'overweight_round' | 'late_delivery_pattern';
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string; // ISO string
  relatedEntity: {
    type: 'task' | 'round' | 'driver';
    id: string;
  };
}


export interface ForecastRule {
  id: string;
  name: string;
  type: 'time' | 'type';
  keywords: string[];
  category: 'Matin' | 'Soir' | 'BU' | 'Classique';
  isActive: boolean;
}

export interface Room {
  id: string;
  name: string;
  members: string[]; // array of user UIDs
  isGroup: boolean; // true for group chats, false for 1-on-1
  createdAt: Timestamp;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: Timestamp;
  };
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Timestamp;
}
```
  </change>
  <change>
    <file>src/components/ui/input.tsx</file>
    <content><![CDATA[import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
