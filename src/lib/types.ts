
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
  type: 'quality_alert' | 'overweight_round' | 'late_delivery_pattern' | 'new_message';
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string | Timestamp;
  relatedEntity: {
    type: 'task' | 'round' | 'driver' | 'room';
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
  notificationId?: string; // Optional ID of the notification this room is about
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: string; // The role used for permissions
    jobTitle?: string; // The user's actual job title
    firstName?: string;
    lastName?: string;
    depots?: string[];
}
