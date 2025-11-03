# Spécification de la Structure des Données

Ce document définit la structure de données finale pour les entités "Tâche" (Task) and "Tournée" (Round) après transformation des données brutes de l'API Urbantz.

## Tournées (Rounds)

| Nom de la Colonne        | Champ JSON Correspondant           | Description                                  | Type de Donnée | Exemple                        |
| ------------------------ | ---------------------------------- | -------------------------------------------- | -------------- | ------------------------------ |
| **Identification**       |                                    |                                              |                |                                |
| ID Interne               | `id`                               | Identifiant unique de la tournée.            | Texte          | "68fca1af8334a870b5d5563c"     |
| Nom                      | `nom`                             | Nom lisible ou code de la tournée.           | Texte          | "150"                          |
| Statut                   | `statut`                           | Statut de la tournée.                        | Texte          | "COMPLETED"                    |
| Activité                 | `activite`                         | Type d'activité (ex: classic).               | Texte          | "classic"                      |
| Date                     | `date`                             | Date de la tournée.                          | Date/Heure     | "2025-10-26T00:00:00.000Z"     |
| Hub (ID)                 | `hubId`                              | Identifiant unique du dépôt.                 | Texte          | "64788b0a4f88d4949665f381"     |
| Nom du Hub               | `nomHub`                           | Nom lisible du dépôt.                        | Texte          | "Rungis Dimanche Zone1"        |
| **Chauffeur & Véhicule** |                                    |                                              |                |                                |
| Associé (Nom)            | `associeNom`                   | Nom du partenaire logistique.                | Texte          | "ID Logistics"                 |
| email chauffeur          | `emailChauffeur`                | Identifiant (email) du chauffeur.            | Texte          | "Alexandre@idlog.com"          |
| Prénom Chauffeur         | `prenomChauffeur`                 | Prénom du chauffeur.                         | Texte          | "Alexandre"                    |
| Nom Chauffeur            | `nomChauffeur`                  | Nom du chauffeur.                            | Texte          | "Karim 7"                      |
| Immatriculation          | `immatriculation`         | Plaque d'immatriculation du véhicule.        | Texte          | "bx079xg"                      |
| Nom Véhicule             | `nomVehicule`                     | Nom ou identifiant du véhicule.              | Texte          | "Camion Vitry auto"            |
| Energie                  | `energie`                 | Type de carburant du véhicule.               | Texte          | "Oui"                          |
| **Totaux de la Tournée** |                                    |                                              |                |                                |
| Bacs SURG                | `bacsSurg` (Calculé)               | Nombre de bacs surgelés calculé.             | Nombre         |                                |
| Bacs FRAIS               | `bacsFrais` (Calculé)              | Nombre de bacs frais calculé.                | Nombre         |                                |
| Bacs SEC                 | `bacsSec` (Calculé)                | Nombre de bacs secs calculé.                 | Nombre         |                                |
| Bacs POISSON             | `bacsPoisson` (Calculé)            | Nombre de bacs poissonnerie calculé.         | Nombre         |                                |
| Bacs BOUCHERIE           | `bacsBoucherie` (Calculé)          | Nombre de bacs boucherie calculé.            | Nombre         |                                |
| Total SEC + FRAIS        | `totalSecFrais` (Calculé)          | Somme des bacs SEC et FRAIS.                 | Nombre         |                                |
| nombre de bacs           | `nombreDeBacs`                   | Nombre total de bacs/colis planifiés.        | Nombre         | 85                             |
| poids tournée            | `poidsTournee`                 | Poids total planifié (kg).                   | Nombre         | 1020.39                        |
| Poids Réel               | `poidsReel` (Calculé)              | Somme des poids de toutes les tâches de la tournée. | Nombre         | 1015.50                        |
| volume tournée           | `volumeTournee`                | Volume total planifié.                       | Nombre         | 3552.68                        |
| Nb Commandes             | `nbCommandes`                       | Nombre total de tâches (commandes).          | Nombre         | 18                             |
| Commandes Terminées      | `commandesTerminees`                        | Nombre de tâches (commandes) terminées.      | Nombre         | 18                             |
| **Horaires & Lieux**     |                                    |                                              |                |                                |
| Lieu de Départ           | `lieuDepart`                    | Point de départ.                             | Texte          | "hub"                          |
| Heure de Départ          | `heureDepart`                        | Heure de départ planifiée.                   | Date/Heure     | "2025-10-26T06:55:00.000Z"     |
| Lieu de Fin              | `lieuFin`                      | Point de fin.                                | Texte          | "hub"                          |
| Heure de Fin             | `heureFin`                          | Heure de retour planifiée.                   | Date/Heure     | "2025-10-26T12:25:57.757Z"     |
| heure de fin réelle      | `heureFinReelle`             | Horodatage du retour réel au dépôt.          | Date/Heure     | "2025-10-26T12:27:08.531Z"     |
| Démarrée (Réel)          | `demarreeReel`              | Horodatage du départ réel du dépôt.          | Date/Heure     | "2025-10-26T06:29:31.031Z"     |
| Préparée (Réel)          | `prepareeReel`             | Horodatage de fin de préparation.            | Date/Heure     | "2025-10-26T05:53:21.211Z"     |
| Temps Préparation (Réel) | `tempsPreparationReel`         | Durée de la préparation (ms).                | Nombre         | 2169820                        |
| **Métriques & Coûts**    |                                    |                                              |                |                                |
| Durée (Réel)             | `dureeReel`               | Durée totale réelle (ms).                    | Nombre         | 21457500                       |
| Temps Total              | `tempsTotal`                        | Temps total planifié (secondes).             | Nombre         | 19857.75                       |
| Temps Trajet Total       | `tempsTrajetTotal`                  | Temps de trajet total planifié (s).          | Nombre         | 10197.75                       |
| Temps Service Cmd Total  | `tempsServiceCmdTotal`            | Temps de service total planifié (s).         | Nombre         | 9660                           |
| Temps Pause Total        | `tempsPauseTotal`            | Temps de pause total planifié (s).           | Nombre         | 0                              |
| Temps Attente Total      | `tempsAttenteTotal`                    | Temps d'attente total planifié (s).          | Nombre         | 0                              |
| Temps de Retard          | `tempsDeRetard`                       | Temps de retard actuel ou final (ms).        | Nombre         | 0                              |
| Date du Retard           | `dateDuRetard`                       | Horodatage du dernier calcul de retard.      | Date/Heure     | "2025-10-26T12:26:07.516Z"     |
| Temps Violation Total    | `tempsViolationTotal`               | Temps passé hors contraintes (s).            | Nombre         | 0                              |
| Distance Totale          | `distanceTotale`                    | Distance totale planifiée (mètres).          | Nombre         | 45308.90                       |
| Coût Total               | `coutTotal`                        | Coût total planifié de la tournée.           | Nombre         | 10000050.82                    |
| Coût par Temps           | `coutParTemps`          | Coût par unité de temps (par minute).        | Nombre         | 1                              |
| **Données Techniques**   |                                    |                                              |                |                                |
| Flux                     | `flux`                             | Flux logistique (identifiant).               | Texte          | "5c6e788b839b92144f5de1e1"     |
| TempSURG_Chargement      | `tempSurgChargement`     | Température Surgelé au chargement.           | Texte          | "-26"                          |
| TempsFRAIS_Chargement    | `tempFraisChargement`   | Température Frais au chargement.             | Texte          | "0"                            |
| TempsFRAIS_Fin           | `tempFraisFin`          | Température Frais à la fin.                  | Texte          | "0"                            |
| TempsSURG_Fin            | `tempSurgFin`           | Température Surgelé à la fin.                | Texte          | "-26"                          |
| codePostalMaitre         | `codePostalMaitre`        | Code postal principal de la zone.            | Texte          | "75020"                        |
| Arrêts                   | `arrets`                            | Données brutes de tous les arrêts.           | Objet/JSON     | `[{...}]`                      |
| Temps Accélération       | `tempsAccelerationVehicule`         | Paramètre véhicule (secondes).               | Nombre         | 120                            |
| Pauses Véhicule          | `pausesVehicule`                   | Pauses activées pour ce véhicule.            | Booléen        | false                          |
| capacité bacs            | `capaciteBacs`           | Capacité max du véhicule (bacs).             | Nombre         | 105                            |
| capacité poids           | `capacitePoids`         | Capacité max du véhicule (kg).               | Nombre         | 1100                           |
| Dim. Véhicule (Volume)   | `dimVehiculeVolume`        | Capacité max du véhicule (volume).           | Nombre         | 1000000                        |
| Distance Max Véhicule    | `distanceMaxVehicule`              | Contrainte distance max (km).                | Nombre         | 1050                           |
| Durée Max Véhicule       | `dureeMaxVehicule`              | Contrainte durée max (minutes).              | Nombre         | 420                            |
| Commandes Max Véhicule   | `commandesMaxVehicule`                | Contrainte nombre max de commandes.          | Nombre         | 20                             |
| Mis à jour le            | `misAJourLe`                          | Horodatage de la dernière modification.      | Date/Heure     | "2025-10-26T12:27:08.531Z"     |
| Validé                   | `valide`                        | Tournée validée manuellement.                | Booléen        | true                           |

## Tâches (Tasks)

| Nom de la Colonne             | Champ JSON Correspondant                  | Description                                 | Type de Donnée | Exemple                             |
| ----------------------------- | ----------------------------------------- | ------------------------------------------- | -------------- | ----------------------------------- |
| **Identification**            |                                           |                                             |                |                                     |
| ID Tâche                      | `tacheId`                                 | Identifiant unique de la tâche.             | Texte          | "619118027"                         |
| Référence Tâche               | `referenceTache`                           | Référence de la tâche (différente de ID).   | Texte          | "54ac021a-..."                      |
| ID                            | `id` (équivalent à _id)                   | Identifiant de la base de données.          | Texte          | "68fcd8e22b1b25ce2fbd6f9a"          |
| Commande                      | `numeroCommande`              | Numéro de commande client.                  | Texte          | "WEB-12345"                         |
| Client (ID)                   | `client`                                  | Le client ou le donneur d'ordre.            | Texte          | "CARREFOUR LAD"                     |
| **Contenu de la Tâche**       |                                           |                                             |                |                                     |
| Bacs SURG                     | `bacsSurg` (Calculé)                      | Nombre total de bacs "SURG".                | Nombre         |                                     |
| Bacs FRAIS                    | `bacsFrais` (Calculé)                     | Nombre total de bacs "FRAIS".               | Nombre         |                                     |
| Bacs SEC                      | `bacsSec` (Calculé)                       | Nombre total de bacs "SEC".                 | Nombre         |                                     |
| Bacs POISSON                  | `bacsPoisson` (Calculé)                   | Nombre total de bacs "POISSON".             | Nombre         |                                     |
| Bacs BOUCHERIE                | `bacsBoucherie` (Calculé)                 | Nombre total de bacs "BOUCHERIE".           | Nombre         |                                     |
| Total SEC + FRAIS             | `totalSecFrais` (Calculé)                 | Somme des bacs SEC et FRAIS.                | Nombre         |                                     |
| nombre de bacs                | `nombreDeBacs`                          | Nombre total d'unités (bacs, colis).        | Nombre         | 4                                   |
| Nombre de Bacs (Méta)         | `nombreDeBacsMeta`                    | Nombre de bacs (info métadonnée).           | Nombre         | 4                                   |
| poids en kg                   | `poidsEnKg`                        | Poids total de la tâche en kg.              | Nombre         | 160                                 |
| volume en cm3                 | `volumeEnCm3`                       | Volume total de la tâche.                   | Nombre         | 4                                   |
| **Planification**             |                                           |                                             |                |                                     |
| Date                          | `date`                                    | Date de la tournée associée.                | Date/Heure     | "2025-11-02T00:00:00.000Z"          |
| Date Initiale Livraison       | `dateInitialeLivraison`     | Date de livraison planifiée (métadonnée).   | Texte          | "2025-10-26"                        |
| Début Créneau Initial         | `debutCreneauInitial`                    | Début du créneau promis au client.          | Date/Heure     | "2025-11-02T07:30:00.000Z"          |
| Fin Créneau Initial           | `finCreneauInitial`                      | Fin du créneau promis au client.            | Date/Heure     | "2025-11-02T09:30:00.000Z"          |
| Marge Fenêtre Horaire         | `margeFenetreHoraire`                        | Marge de flexibilité (en minutes).          | Nombre         | 0                                   |
| Heure Arrivée (Estimée)       | `heureArriveeEstimee` (via `stops`)       | Arrivée estimée depuis les données `stops`. | Date/Heure     | "2025-11-02T06:56:22.069Z"          |
| Temps de service estimé       | `tempsDeServiceEstime`                    | Temps estimé (en minutes) pour la livraison.| Nombre         | 10                                  |
| **Adresse & Instructions**    |                                           |                                             |                |                                     |
| Adresse                       | `adresse`                    | Adresse complète de la livraison.           | Texte          | "Avenue Jules Grec 431..."          |
| Numéro                        | `numero`                     | Numéro dans la rue.                         | Texte          | "431"                               |
| Rue                           | `rue`                        | Nom de la rue.                              | Texte          | "Avenue Jules Grec"                 |
| Bâtiment                      | `batiment`                    | Information sur le bâtiment.                | Texte          | "D2"                                |
| Étage                         | `etage`              | Étage de la livraison.                      | Nombre         | 3                                   |
| Digicode 1                    | `digicode1`          | Code d'accès (porte principale).            | Texte          | "15A63"                             |
| Avec Ascenseur                | `avecAscenseur`          | Présence d'un ascenseur.                    | Booléen        | true                                |
| Avec Interphone               | `avecInterphone`         | Présence d'un interphone.                   | Booléen        | true                                |
| Code Interphone               | `codeInterphone`     | Code ou nom pour l'interphone.              | Texte          | "En panne"                          |
| Ville                         | `ville`                      | Ville de la livraison.                      | Texte          | "Antibes"                           |
| Code Postal                   | `codePostal`                 | Code postal de la livraison.                | Texte          | "06600"                             |
| Pays                          | `pays`                       | Code pays (format ISO).                     | Texte          | "FRA"                               |
| Instructions                  | `instructions`                            | Instructions spécifiques de livraison.      | Texte          | "Appeler au 0679882747"             |
| **Contact Client**            |                                           |                                             |                |                                     |
| Personne Contact              | `personneContact`                        | Nom complet du contact client.              | Texte          | "MME Margaux Saccoccio"             |
| Compte Contact                | `compteContact`                          | Identifiant du compte client.               | Texte          | "15868723"                          |
| Email Contact                 | `emailContact`                           | Adresse email du client.                    | Texte          | "marg.sacc@orange.fr"               |
| Téléphone Contact             | `telephoneContact`                       | Numéro de téléphone du client.              | Texte          | "33679882747"                       |
| Notif. Email                  | `notifEmail`              | Notification par email activée.             | Booléen        | true                                |
| Notif. SMS                    | `notifSms`                | Notification par SMS activée.               | Booléen        | true                                |
| **Réalisation & Statuts**     |                                           |                                             |                |                                     |
| Statut                        | `status`                                  | Statut final de la tâche.                   | Texte          | "DELIVERED"                         |
| Heure d'arrivée réelle        | `heureArriveeReelle`                  | Horodatage de l'arrivée réelle.             | Date/Heure     | "2025-10-26T07:28:19.347Z"          |
| Date de Clôture               | `dateCloture`                             | Horodatage de la validation de la tâche.    | Date/Heure     | "2025-11-02T08:37:15.181Z"          |
| sur place forcé               | `surPlaceForce`                | Arrivée forcée par le livreur.              | Booléen        | false                               |
| sur place validé              | `surPlaceValide`      | Arrivée validée à la bonne adresse.         | Booléen        | true                                |
| Temps de Retard               | `tempsDeRetard`                              | Temps de retard (info de la tournée).       | Nombre         | 0                                   |
| Date du Retard                | `dateDuRetard`                       | Horodatage du calcul de retard (tournée).   | Date/Heure     | "2025-10-26T08:32:00.592Z"          |
| Tentatives                    | `tentatives`                              | Nombre de tentatives de livraison.          | Nombre         | 1                                   |
| Terminé Par                   | `terminePar`                             | Outil utilisé pour clôturer la tâche.       | Texte          | "mobile"                            |
| **Temps de Service Réel**     |                                           |                                             |                |                                     |
| temps de service réel         | `tempsDeServiceReel`             | Durée réelle passée chez le client (s).     | Nombre         | 181.001                             |
| Début Temps Service           | `debutTempsService`               | Début de l'action de livraison.             | Date/Heure     | "2025-11-02T08:36:00.087Z"          |
| Fin Temps Service             | `finTempsService`                 | Fin de l'action de livraison.               | Date/Heure     | "2025-11-02T08:39:01.088Z"          |
| Confiance Temps Service       | `confianceTempsService`              | Fiabilité du calcul du temps de service.    | Texte          | "HIGH"                              |
| Version Temps Service         | `versionTempsService`                 | Version de l'algorithme de calcul.          | Nombre         | 2                                   |
| Horodatages Minuteur          | `horodatagesMinuteur`              | Données de minuteurs (JSON).                | Objet/JSON     | `[]`                                |
| **Preuves & Échecs**          |                                           |                                             |                |                                     |
| Sans contact (Forcé)          | `sansContactForce`            | Livraison sans contact forcée.              | Booléen        | false                               |
| Raison Sans Contact           | `raisonSansContact`            | Raison si sans contact.                     | Texte          | "N/A"                               |
| Raison Échec                  | `raisonEchec`           | Raison officielle en cas d'échec.           | Texte          | "N/A"                               |
| Raison Échec (Perso)          | `raisonEchecCusto`           | Raison personnalisée d'échec.               | Texte          |                                     |
| Nom Signature                 | `nomSignature`                | Nom associé à la signature.                 | Texte          | "MME Jennifer Cornu"                |
| Photo Succès                  | `photoSucces`                | ID de la photo preuve de livraison.         | Texte          | "9943d017-..."                      |
| Latitude Position             | `latitudePosition`             | Latitude GPS à la clôture.                  | Nombre         | 43.5973                             |
| Longitude Position            | `longitudePosition`            | Longitude GPS à la clôture.                 | Nombre         | 7.1195                              |
| **Infos Tournée & Chauffeur** |                                           |                                             |                |                                     |
| Nom Tournée                   | `nomTournee`                              | Nom ou identifiant de la tournée.           | Texte          | "R01"                               |
| Séquence                      | `sequence`                                | Ordre de la tâche dans la tournée.          | Nombre         | 4                                   |
| Associé (Nom)                 | `nomAssocie`                              | Partenaire logistique.                      | Texte          | "ID Logistics"                      |
| ID Externe Chauffeur          | `idExterneChauffeur`                       | Identifiant (email) du livreur.             | Texte          | "alexandremantibes@..."             |
| Prénom Chauffeur              | `prenomChauffeur`                          | Prénom du livreur.                          | Texte          | "Alexandre"                         |
| Nom Chauffeur                 | `nomChauffeur`                             | Nom du livreur.                             | Texte          | "Market Antibes"                    |
| Hub (Nom)                     | `nomHub`                                  | Nom du dépôt de départ.                     | Texte          | "Carrefour Market Antibes 7827"     |
| Plateforme (Nom)              | `nomPlateforme`                           | Nom de la plateforme ou du service.         | Texte          | "Carrefour LAD Caisse"              |
| **Métadonnées & Système**     |                                           |                                             |                |                                     |
| Type                          | `type`                                    | Type de tâche.                              | Texte          | "delivery"                          |
| Flux                          | `flux`                                    | Flux logistique (identifiant).              | Texte          | "5c6e788b839b92144f5de1e1"          |
| Progression                   | `progression`                             | État d'avancement.                          | Texte          | "COMPLETED"                         |
| Tâches même arrêt             | `tachesMemeArret`| Tâches multiples à la même adresse.         | Booléen        | false                               |
| Catégories                    | `categories`                              | Catégorisation des tâches (JSON).           | Objet/JSON     | `[]`                                |
| Code PE                       | `codePe`                      | Code Point d'Entrée (métadonnée).           | Texte          | "1434"                              |
| Notation Livreur              | `notationLivreur`             | Note donnée par le client.                  | Nombre         | 5                                   |
| Service (Méta)                | `serviceMeta`                     | Type de service (métadonnée).               | Texte          | "METI"                              |
| Code Entrepôt                 | `codeEntrepôt`                | Code de l'entrepôt (métadonnée).            | Texte          | "VDF"                               |
| Méta Commentaire Livreur      | `commentaireLivreur`          | Commentaire du client sur le livreur.       | Texte          |                                     |
| Infos Suivi Transp.           | `infosSuiviTransp`            | Informations de tracking (JSON).            | Objet/JSON     | `{}`                                |
| Désassoc. Transp. Rejetée     | `desassocTranspRejetee`   | Champ technique.                            | Booléen        | false                               |
| Mis à jour le                 | `dateMiseAJour`                           | Horodatage de la dernière modification.     | Date/Heure     | "2025-10-26T08:56:39.263Z"          |
| Créé le                       | `dateCreation`                            | Horodatage de la création de la tâche.      | Date/Heure     | "2025-10-25T14:04:18.764Z"          |
