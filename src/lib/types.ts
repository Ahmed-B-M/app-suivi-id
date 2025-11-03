
import { Timestamp } from "firebase/firestore";

export interface Tache {
  // Identification
  id: string; // From _id
  tacheId: string;
  referenceTache?: string;
  numeroCommande?: string;
  client?: string;

  // Contenu
  bacsSurg: number;
  bacsFrais: number;
  bacsSec: number;
  bacsPoisson: number;
  bacsBoucherie: number;
  totalSecFrais: number;
  nombreDeBacs?: number; // dimensions.bac
  nombreDeBacsMeta?: number; // metaDonnees.nbreBacs
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
  personneContact?: string;
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
  completePar?: string;

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
  nomAssocie?: string;
  idExterneChauffeur?: string;
  prenomChauffeur?: string;
  nomChauffeur?: string;
  nomHub?: string;
  nomPlateforme?: string;
  
  // Métadonnées & Système
  type?: string;
  flux?: string;
  progression?: string;
  tachesMemeArret?: boolean;
  categories?: any[];
  codePe?: string;
  notationLivreur?: number;
  serviceMeta?: string;
  codeEntrepôt?: string;
  commentaireLivreur?: string;
  infosSuiviTransp?: any;
  desassocTranspRejetee?: boolean;
  dateMiseAJour?: string;
  dateCreation?: string;
  
  // Pour la flexibilité
  [key: string]: any;
}


export interface Tournee {
  // Identification
  id: string;
  nom?: string;
  statut?: string;
  activite?: string;
  date?: string | Date | Timestamp;
  hubId?: string;
  nomHub?: string;

  // Chauffeur & Véhicule
  associeNom?: string;
  emailChauffeur?: string;
  prenomChauffeur?: string;
  nomChauffeur?: string;
  immatriculation?: string;
  nomVehicule?: string;
  energie?: string;
  
  // Totaux
  bacsSurg: number;
  bacsFrais: number;
  bacsSec: number;
  bacsPoisson: number;
  bacsBoucherie: number;
  totalSecFrais: number;
  nombreDeBacs?: number;
  poidsTournee?: number;
  poidsReel?: number;
  volumeTournee?: number;
  nbCommandes?: number;
  commandesTerminees?: number;

  // Horaires & Lieux
  lieuDepart?: string;
  heureDepart?: string;
  lieuFin?: string;
  heureFin?: string;
  heureFinReelle?: string;
  demarreeReel?: string;
  prepareeReel?: string;
  tempsPreparationReel?: number;

  // Métriques & Coûts
  dureeReel?: number;
  tempsTotal?: number;
  tempsTrajetTotal?: number;
  tempsServiceCmdTotal?: number;
  tempsPauseTotal?: number;
  tempsAttenteTotal?: number;
  tempsDeRetard?: number;
  dateDuRetard?: string;
  tempsViolationTotal?: number;
  distanceTotale?: number;
  coutTotal?: number;
  coutParTemps?: number;
  
  // Données Techniques
  flux?: string;
  tempSurgChargement?: string;
  tempFraisChargement?: string;
  tempFraisFin?: string;
  tempSurgFin?: string;
  codePostalMaitre?: string;
  arrets?: any[];
  tempsAccelerationVehicule?: number;
  pausesVehicule?: boolean;
  capaciteBacs?: number;
  capacitePoids?: number;
  dimVehiculeVolume?: number;
  distanceMaxVehicule?: number;
  dureeMaxVehicule?: number;
  commandesMaxVehicule?: number;
  misAJourLe?: string;
  valide?: boolean;
  
  // Pour la flexibilité
  [key: string]: any;
}


export interface ForecastRule {
  id: string;
  name: string;
  type: 'time' | 'type';
  keywords: string[];
  category: 'Matin' | 'Soir' | 'BU' | 'Classique';
  isActive: boolean;
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


export type ProcessedNpsVerbatim = {
    id: string; // document id
    taskId: string;
    npsScore: number;
    verbatim: string;
    responsibilities: string[] | string;
    category: string[] | string;
    status: 'à traiter' | 'traité';
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

    