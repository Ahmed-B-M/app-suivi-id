import { Timestamp } from "firebase/firestore";

export interface Article {
    // Identification & Liens
    tacheId?: number;
    barcode?: string;
    tourneeId?: string;
    nomTournee?: string;

    // Détails du Bac
    name?: string;
    type?: string;
    status?: string;
    quantity?: number;
    processedQuantity?: number;
    dimensions?: any;
    barcodeEncoding?: string;
    damaged?: any;

    // Champs Techniques
    log?: any[];
    reference?: string;
    labels?: any[];
    skills?: any[];
    metadata?: any;
    description?: string;
    group?: string;
}


export interface Tache {
    // Identification
    tacheId: string;
    idInterne: string;
    referenceTache?: string;
    id: string; // _id from API
    commande?: string; // metadata.numeroCommande
    client?: string;
    nomCompletChauffeur?: string;

    // Contenu de la Tâche
    bacsSurg: number;
    bacsFrais: number;
    bacsSec: number;
    bacsPoisson: number;
    bacsBoucherie: number;
    totalSecFrais: number;
    nombreDeBacs?: number; // dimensions.bac
    nombreDeBacsMeta?: number; // metadata.nbreBacs
    poidsEnKg?: number; // dimensions.poids
    volumeEnCm3?: number; // dimensions.volume

    // Planification
    date?: string | Date | Timestamp;
    dateInitialeLivraison?: string; // metadata.Date_Initiale_Livraison
    debutCreneauInitial?: string; // timeWindow.start
    finCreneauInitial?: string; // timeWindow.stop
    debutFenetre?: string; // timeWindow.start (doublon)
    finFenetre?: string; // timeWindow.stop (doublon)
    margeFenetreHoraire?: number; // timeWindowMargin
    heureArriveeEstimee?: string; // arriveTime
    tempsDeServiceEstime?: number; // serviceTime

    // Adresse & Instructions
    adresse?: string; // location.address
    numero?: string; // location.number
    rue?: string; // location.street
    batiment?: string; // location.building
    batimentMeta?: string; // metadata.building
    etage?: string | number; // contact.buildingInfo.floor
    digicode1?: string; // contact.buildingInfo.digicode1
    avecAscenseur?: boolean; // contact.buildingInfo.hasElevator
    avecInterphone?: boolean; // contact.buildingInfo.hasInterphone
    codeInterphone?: string; // contact.buildingInfo.interphoneCode
    ville?: string; // location.city
    codePostal?: string; // location.zip
    pays?: string; // location.countryCode
    instructions?: string;

    // Contact Client
    personneContact?: string; // contact.person
    compteContact?: string; // contact.account
    emailContact?: string; // contact.email
    telephoneContact?: string; // contact.phone
    notifEmail?: boolean; // notificationSettings.email
    notifSms?: boolean; // notificationSettings.sms

    // Réalisation & Statuts
    status?: string;
    heureArriveeReelle?: string; // actualTime.arrive.when
    dateCloture?: string; // closureDate
    surPlaceForce?: boolean; // actualTime.arrive.forced
    surPlaceValide?: boolean; // actualTime.arrive.isCorrectAddress
    tempsDeRetard?: number; // delay.time
    dateDuRetard?: string; // delay.when
    tentatives?: number;
    completePar?: string;

    // Temps de Service Réel
    tempsDeServiceReel?: number; // realServiceTime.serviceTime
    debutTempsService?: string; // realServiceTime.startTime
    finTempsService?: string; // realServiceTime.endTime
    confianceTempsService?: string; // realServiceTime.confidence
    versionTempsService?: number; // realServiceTime.version
    horodatagesMinuteur?: any[]; // execution.timer.timestamps

    // Preuves & Échecs
    sansContactForce?: boolean; // execution.contactless.forced
    raisonSansContact?: string; // execution.contactless.reason
    raisonEchec?: string; // execution.failedReason.reason
    raisonEchecCusto?: string; // execution.failedReason.custom
    nomSignature?: string; // execution.signature.name
    photoSucces?: string; // execution.successPicture
    latitudePosition?: number; // execution.position.latitude
    longitudePosition?: number; // execution.position.longitude

    // Infos Tournée & Chauffeur
    nomTournee?: string; // roundName
    sequence?: number;
    nomAssocie?: string; // associatedName
    idExterneChauffeur?: string; // driver.externalId
    prenomChauffeur?: string; // driver.firstName
    nomChauffeur?: string; // driver.lastName
    hubId?: string; // hub
    nomHub?: string; // hubName
    nomPlateforme?: string; // platformName

    // Métadonnées & Système
    type?: string;
    flux?: string;
    progression?: string;
    tachesMemeArret?: number; // realServiceTime.tasksDeliveredInSameStop
    categories?: any[];
    codePe?: string; // metadata.codePe
    notationLivreur?: number; // metadata.notationLivreur
    serviceMeta?: string; // metadata.service
    codeEntrepôt?: string; // metadata.warehouseCode
    commentaireLivreur?: string; // metadata.commentaireLivreur
    infosSuiviTransp?: any; // externalCarrier.trackingInfo
    desassocTranspRejetee?: boolean; // externalCarrier.unassociationRejected
    dateMiseAJour?: string; // updated
    dateCreation?: string; // when
    
    // Données brutes et calculées
    articles: Article[];
    raw: any;
    [key: string]: any; // Pour la flexibilité avec les données brutes
}

export interface Tournee {
    // Identification
    id: string; // id ou _id
    idInterne: string; // id ou _id (doublon)
    nom?: string; // name
    statut?: string; // status
    activite?: string; // activity
    date?: string | Date | Timestamp; // date
    hubId?: string; // hub
    nomHub?: string; // nomHub (venant de la tâche)

    // Infos Chauffeur & Véhicule
    associeNom?: string; // associatedName
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
    poidsReel?: number; // doublon de poidsTournee
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
    
    // Données brutes
    raw: any;
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


export interface ForecastRule {
  id: string;
  name: string;
  type: 'time' | 'type';
  keywords: string[];
  category: 'Matin' | 'Soir' | 'BU' | 'Classique';
  isActive: boolean;
}
