// Définition de la structure d'une Tâche avec les champs en français
export interface Tache {
  tacheId: string | number;
  type?: string;
  date?: string;
  progression?: string;
  client?: string;
  nomPlateforme?: string;
  dateCreation?: string;
  dateCloture?: string;
  dateMiseAJour?: string;
  tentatives?: number;
  completePar?: string;
  nonPlanifie?: boolean;

  nomHub?: string;
  nomTournee?: string;
  sequence?: number;
  nomAssocie?: string;
  livreur?: {
    prenom?: string;
    nom?: string;
    idExterne?: string;
  };

  creneauHoraire?: {
    debut?: string;
    fin?: string;
  };
  heureReelle?: {
    arrivee?: {
      date?: string;
      adresseCorrecte?: boolean;
    };
  };
  tempsDeServiceReel?: {
    debut?: string;
    fin?: string;
    duree?: number;
  };
  tempsDeServiceEstime?: number;

  contact?: {
    personne?: string;
    telephone?: string;
    email?: string;
    infoImmeuble?: {
      etage?: string;
      ascenseur?: boolean;
      digicode1?: string;
      interphone?: boolean;
      codeInterphone?: string;
    };
  };
  localisation?: {
    adresse?: string;
    rue?: string;
    numero?: string;
    codePostal?: string;
    ville?: string;
    codePays?: string;
    geometrie?: [number, number];
  };
  instructions?: string;

  dimensions?: {
    volume?: number;
    bac?: number;
    poids?: number;
  };
  articles?: {
    nom?: string;
    statut?: string;
    codeBarre?: string;
    type?: string;
    dimensions?: {
      poids?: number;
    };
    log?: {
      date?: string;
      vers?: string;
    }[];
  }[];
  
  execution?: {
    sansContact?: boolean;
  };

  metaDonnees?: {
    notationLivreur?: number;
    commentaireLivreur?: string;
    immeuble?: string;
  };

  // Permet d'autres propriétés pour la flexibilité
  [key: string]: any;
}

// Nouvelle interface épurée pour les tournées
export interface Tournee {
  id: string;
  date?: string;
  dimensions?: {
    poids?: number;
    bac?: number;
    volume?: number;
  };
  endLocation?: string;
  endTime?: string;
  labelsAndSkills?: any[];
  metadata?: {
    codePostalMaitre?: string;
    TempsDepassementPlanifie?: number;
    TempSURG_Chargement?: string;
    TempsFRAIS_Chargement?: string;
    Immatriculation?: string;
    TempsFRAIS_Fin?: string;
  };
  name?: string;
  orderCount?: number;
  realInfo?: {
    hasPrepared?: string;
    hasStarted?: string;
    hasFinished?: string | null;
    preparationTime?: number;
    hasLasted?: number | null;
  };
  reloads?: any[];
  senders?: {
    name?: string;
    count?: number;
  }[];
  startLocation?: string;
  startTime?: string;
  status?: string;
  stops?: {
    coordinates?: [number, number];
    taskId?: string;
    progress?: string;
    status?: string;
    sequence?: number;
    stopSequence?: number;
    travelDistance?: number;
    arriveTime?: string;
    departTime?: string;
    travelTime?: number;
    serviceTime?: number;
    waitTime?: number;
    violationTime?: number;
    closureDate?: string | null;
  }[];
  totalDistance?: number;
  totalOrderServiceTime?: number;
  totalTime?: number;
  totalTravelTime?: number;
  totalViolationTime?: number;
  totalWaitTime?: number;
  updated?: string;
  validated?: boolean;
  driver?: {
    externalId?: string;
    firstName?: string;
    lastName?: string;
  };
  delay?: {
    time?: number;
    when?: string;
  };
  orderDone?: number;
  vehicle?: {
    name?: string;
    dimensions?: {
      poids?: number;
      bac?: number;
      volume?: number;
    };
    accelerationTime?: number;
    maxOrders?: number;
    maxDistance?: number;
    maxDuration?: number;
    fixedCost?: number;
    costPerUnitTime?: number;
    costPerUnitDistance?: number;
    type?: string;
    reloading?: {
      enabled?: boolean;
      time?: number;
    };
    breaks?: boolean;
    labels?: any[];
  };
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

