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


// Représentation de base de l'objet Tournée
export interface Round {
  id: string;
  _id: string; // some items use _id
  name: string;
  status: string;
  date: string;
  // Add other round properties as needed
  [key: string]: any;
}
