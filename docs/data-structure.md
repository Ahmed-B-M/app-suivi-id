# Spécification de la Structure des Données

Ce document définit la structure de données finale pour les entités "Tâche" (Task), "Tournée" (Round) et "Bac" (Item) après transformation des données brutes de l'API Urbantz.

## Tournées (Rounds)

| Nom de la Colonne | Champ JSON Correspondant | Description | Type de Donnée | Exemple |
| --- | --- | --- | --- | --- |
| **Identification** | | | | |
| ID Interne | `id` ou `_id` | Identifiant unique de la tournée. | Texte | "68fca1af8334a870b5d5563c" |
| ID | `id` ou `_id` | Identifiant unique (doublon). | Texte | "68fca1af8334a870b5d5563c" |
| Nom | `name` | Nom lisible ou code de la tournée. | Texte | "150" |
| Statut | `status` | Statut de la tournée. | Texte | "COMPLETED" |
| Activité | `activity` | Type d'activité (ex: classic). | Texte | "classic" |
| Date | `date` | Date de la tournée. | Date/Heure | "2025-10-26T00:00:00.000Z" |
| Hub (ID) | `hub` | Identifiant unique du dépôt (plateforme). | Texte | "64788b0a4f88d4949665f381" |
| Nom du Hub | `nomHub` | Nom lisible du dépôt (plateforme). | Texte | "Rungis Dimanche Zone1" |
| **Infos Chauffeur & Véhicule** | | | | |
| Associé (Nom) | `associatedName` | Nom du partenaire logistique. | Texte | "ID Logistics" |
| email chauffeur | `driver.externalId` | Identifiant (email) du chauffeur assigné. | Texte | "Alexandre@idlog.com" |
| Prénom Chauffeur | `driver.firstName` | Prénom du chauffeur. | Texte | "Alexandre" |
| Nom Chauffeur | `driver.lastName` | Nom du chauffeur. | Texte | "Karim 7" |
| Immatriculation | `metadata.Immatriculation` | Plaque d'immatriculation du véhicule. | Texte | "bx079xg" |
| Nom Véhicule | `vehicle.name` | Nom ou identifiant du véhicule. | Texte | "Camion Vitry auto" |
| Energie | `metadata.Energie` | Type de carburant du véhicule. | Texte | "Oui" |
| **Totaux de la Tournée** | | | | |
| Bacs SURG | (Calculé) | N'est pas dans le JSON. Doit être calculé. | Nombre | |
| Bacs FRAIS | (Calculé) | N'est pas dans le JSON. Doit être calculé. | Nombre | |
| Bacs SEC | (Calculé) | N'est pas dans le JSON. Doit être calculé. | Nombre | |
| Bacs POISSON | (Calculé) | N'est pas dans le JSON. Doit être calculé. | Nombre | |
| Bacs BOUCHERIE | (Calculé) | N'est pas dans le JSON. Doit être calculé. | Nombre | |
| Total SEC + FRAIS | (Calculé) | N'est pas dans le JSON. Doit être calculé. | Nombre | |
| nombre de bacs | `dimensions.bac` | Nombre total de bacs/colis planifiés. | Nombre | 85 |
| poids tournée | `dimensions.poids` | Poids total planifié (kg). | Nombre | 1020.39 |
| Poids Réel | `dimensions.poids` | Doublon de poids tournée. | Nombre | 1020.39 |
| volume tournée | `dimensions.volume` | Volume total planifié. | Nombre | 3552.68 |
| Nb Commandes | `orderCount` | Nombre total de tâches (commandes). | Nombre | 18 |
| Commandes Terminées | `orderDone` | Nombre de tâches (commandes) terminées. | Nombre | 18 |
| **Horaires & Lieux** | | | | |
| Lieu de Départ | `startLocation` | Point de départ (généralement "hub"). | Texte | "hub" |
| Heure de Départ | `startTime` | Heure de départ planifiée. | Date/Heure | "2025-10-26T06:55:00.000Z" |
| Lieu de Fin | `endLocation` | Point de fin (généralement "hub"). | Texte | "hub" |
| Heure de Fin | `endTime` | Heure de retour planifiée. | Date/Heure | "2025-10-26T12:25:57.757Z" |
| heure de fin réelle | `realInfo.hasFinished` | Horodatage du retour réel au dépôt. | Date/Heure | "2025-10-26T12:27:08.531Z" |
| Démarrée (Réel) | `realInfo.hasStarted` | Horodatage du départ réel du dépôt. | Date/Heure | "2025-10-26T06:29:31.031Z" |
| Préparée (Réel) | `realInfo.hasPrepared` | Horodatage de fin de préparation. | Date/Heure | "2025-10-26T05:53:21.211Z" |
| Temps Préparation (Réel) | `realInfo.preparationTime` | Durée de la préparation (ms). | Nombre | 2169820 |
| **Métriques & Coûts** | | | | |
| Durée (Réel) | `realInfo.hasLasted` | Durée totale réelle (ms). | Nombre | 21457500 |
| Temps Total | `totalTime` | Temps total planifié (secondes). | Nombre | 19857.75 |
| Temps Trajet Total | `totalTravelTime` | Temps de trajet total planifié (s). | Nombre | 10197.75 |
| Temps Service Cmd Total | `totalOrderServiceTime` | Temps de service total planifié (s). | Nombre | 9660 |
| Temps Pause Total | `totalBreakServiceTime` | Temps de pause total planifié (s). | Nombre | 0 |
| Temps Attente Total | `totalWaitTime` | Temps d'attente total planifié (s). | Nombre | 0 |
| Temps de Retard | `delay.time` | Temps de retard actuel ou final (ms). | Nombre | 0 |
| Date du Retard | `delay.when` | Horodatage du dernier calcul de retard. | Date/Heure | "2025-10-26T12:26:07.516Z" |
| Temps Violation Total | `totalViolationTime` | Temps passé hors contraintes (s). | Nombre | 0 |
| Distance Totale | `totalDistance` | Distance totale planifiée (mètres). | Nombre | 45308.90 |
| Coût Total | `totalCost` | Coût total planifié de la tournée. | Nombre | 10000050.82 |
| Coût par Temps | `vehicle.costPerUnitTime` | Coût par unité de temps (par minute). | Nombre | 1 |
| **Données Techniques & Véhicule** | | | | |
| Flux | `flux` | Flux logistique (identifiant). | Texte | "5c6e788b839b92144f5de1e1" |
| TempSURG_Chargement | `metadata.TempSURG_Chargement` | Température Surgelé au chargement. | Texte | "-26" |
| TempsFRAIS_Chargement | `metadata.TempsFRAIS_Chargement` | Température Frais au chargement. | Texte | "0" |
| TempsFRAIS_Fin | `metadata.TempsFRAIS_Fin` | Température Frais à la fin. | Texte | "0" |
| TempsSURG_Fin | `metadata.TempsSURG_Fin` | Température Surgelé à la fin. | Texte | "-26" |
| codePostalMaitre | `metadata.codePostalMaitre` | Code postal principal de la zone. | Texte | "75020" |
| Arrêts | `stops` | Données brutes de tous les arrêts (JSON). | Objet/JSON | `[{"..."}, {"..."}]` |
| Temps Accélération Véhicule | `vehicle.accelerationTime` | Paramètre véhicule (secondes). | Nombre | 120 |
| Pauses Véhicule | `vehicle.breaks` | Pauses activées pour ce véhicule. | Booléen | false |
| capacité bacs | `vehicle.dimensions.bac` | Capacité max du véhicule (bacs). | Nombre | 105 |
| capacité poids | `vehicle.dimensions.poids` | Capacité max du véhicule (kg). | Nombre | 1100 |
| Dim. Véhicule (Volume) | `vehicle.dimensions.volume` | Capacité max du véhicule (volume). | Nombre | 1000000 |
| Distance Max Véhicule | `vehicle.maxDistance` | Contrainte distance max (km). | Nombre | 1050 |
| Durée Max Véhicule | `vehicle.maxDuration` | Contrainte durée max (minutes). | Nombre | 420 |
| Commandes Max Véhicule | `vehicle.maxOrders` | Contrainte nombre max de commandes. | Nombre | 20 |
| Mis à jour le | `updated` | Horodatage de la dernière modification. | Date/Heure | "2025-10-26T12:27:08.531Z" |
| Validé | `validated` | Tournée validée manuellement. | Booléen | true |

## Tâches (Tasks)

| Nom de la Colonne | Champ JSON Correspondant | Description | Type de Donnée | Exemple |
| --- | --- | --- | --- | --- |
| **Identification** | | | | |
| ID Tâche | `tacheId` | Identifiant unique de la tâche (livraison). | Texte | "619118027" |
| ID Interne | `tacheId` (probable) | Identifiant interne. | Texte | "619118027" |
| Référence Tâche | `taskReference` | Référence de la tâche (différente de ID). | Texte | "54ac021a-d544-4b3d-acfd-..." |
| ID | `_id` | Identifiant de la base de données. | Texte | "68fcd8e22b1b25ce2fbd6f9a" |
| Commande | `metaDonnees.numeroCommande` | Numéro de commande client. | Texte | "WEB-12345" |
| Client (ID) | `client` | Le client ou le donneur d'ordre. | Texte | "CARREFOUR LAD" |
| **Contenu de la Tâche** | | | | |
| Bacs SURG | (Calculé depuis articles) | Nombre total de bacs "SURG". | Nombre | 1 |
| Bacs FRAIS | (Calculé depuis articles) | Nombre total de bacs "FRAIS". | Nombre | 1 |
| Bacs SEC | (Calculé depuis articles) | Nombre total de bacs "SEC". | Nombre | 7 |
| Bacs POISSON | (Calculé depuis articles) | Nombre total de bacs "POISSON". | Nombre | 0 |
| Bacs BOUCHERIE | (Calculé depuis articles) | Nombre total de bacs "BOUCHERIE". | Nombre | 0 |
| Total SEC + FRAIS | (Calculé) | Somme des bacs SEC et FRAIS. | Nombre | 8 |
| nombre de bacs | `dimensions.bac` | Nombre total d'unités (bacs, colis). | Nombre | 4 |
| Nombre de Bacs | `metaDonnees.nbreBacs` | Nombre de bacs (info métadonnée). | Nombre | 4 |
| poids en kg | `dimensions.poids` | Poids total de la tâche en kg. | Nombre | 160 |
| volume en cm3 | `dimensions.volume` | Volume total de la tâche. | Nombre | 4 |
| **Planification** | | | | |
| Date | `date` | Date de la tournée associée. | Date/Heure | "2025-11-02T00:00:00.000Z" |
| Date Initiale Livraison | `metaDonnees.Date_Initiale_Livraison` | Date de livraison planifiée (métadonnée). | Texte | "2025-10-26" |
| Début Créneau Initial | `creneauHoraire.debut` | Début du créneau promis au client. | Date/Heure | "2025-11-02T07:30:00.000Z" |
| Fin Créneau Initial | `creneauHoraire.fin` | Fin du créneau promis au client. | Date/Heure | "2025-11-02T09:30:00.000Z" |
| Début Fenêtre | `creneauHoraire.debut` | Doublon de Début Créneau Initial. | Date/Heure | "2025-11-02T07:30:00.000Z" |
| Fin Fenêtre | `creneauHoraire.fin` | Doublon de Fin Créneau Initial. | Date/Heure | "2025-11-02T09:30:00.000Z" |
| Marge Fenêtre Horaire | `timeWindowMargin` | Marge de flexibilité (en minutes). | Nombre | 0 |
| Heure Arrivée (Estimée) | `stops.arriveTime` (Fichier Tournées) | Source: Fichier Tournées. Arrivée estimée. | Date/Heure | "2025-11-02T06:56:22.069Z" |
| Temps de service estimé | `tempsDeServiceEstime` | Temps estimé (en minutes) pour la livraison. | Nombre | 10 |
| **Adresse & Instructions** | | | | |
| Adresse | `localisation.adresse` | Adresse complète de la livraison. | Texte | "Avenue Jules Grec 431 06600..." |
| Numéro | `localisation.numero` | Numéro dans la rue. | Texte | "431" |
| Rue | `localisation.rue` | Nom de la rue. | Texte | "Avenue Jules Grec" |
| Bâtiment | `metaDonnees.immeuble` | Information sur le bâtiment (métadonnée). | Texte | "D2" |
| Bâtiment (Méta) | `metaDonnees.immeuble` | Doublon de Bâtiment. | Texte | "D2" |
| Étage | `contact.infoImmeuble.etage` | Étage de la livraison. | Nombre | 3 |
| Digicode 1 | `contact.infoImmeuble.digicode1` | Code d'accès (porte principale). | Texte | "15A63" |
| Avec Ascenseur | `contact.infoImmeuble.ascenseur` | Présence d'un ascenseur. | Booléen | true |
| Avec Interphone | `contact.infoImmeuble.interphone` | Présence d'un interphone. | Booléen | true |
| Code Interphone | `contact.infoImmeuble.codeInterphone` | Code ou nom pour l'interphone. | Texte | "En panne" |
| Ville | `localisation.ville` | Ville de la livraison. | Texte | "Antibes" |
| Code Postal | `localisation.codePostal` | Code postal de la livraison. | Texte | "06600" |
| Pays | `localisation.codePays` | Code pays (format ISO). | Texte | "FRA" |
| Instructions | `instructions` | Instructions spécifiques de livraison. | Texte | "Appeler au 0679882747" |
| **Contact Client** | | | | |
| Personne Contact | `contact.personne` | Nom complet du contact client. | Texte | "MME Margaux Saccoccio" |
| Compte Contact | `contact.compte` | Identifiant du compte client. | Texte | "15868723" |
| Email Contact | `contact.email` | Adresse email du client. | Texte | "marg.sacc@orange.fr" |
| Téléphone Contact | `contact.telephone` | Numéro de téléphone du client. | Texte | "33679882747" |
| Notif. Email | `notificationSettings.email` | Notification par email activée. | Booléen | true |
| Notif. SMS | `notificationSettings.sms` | Notification par SMS activée. | Booléen | true |
| **Réalisation & Statuts** | | | | |
| Statut | `status` | Statut final de la tâche. | Texte | "DELIVERED" |
| Heure d'arrivée réelle | `actualTime.arrive.when` | Horodatage de l'arrivée réelle du livreur. | Date/Heure | "2025-10-26T07:28:19.347Z" |
| Date de Clôture | `dateCloture` | Horodatage de la validation de la tâche. | Date/Heure | "2025-11-02T08:37:15.181Z" |
| sur place forcé | `actualTime.arrive.forced` | Arrivée forcée par le livreur. | Booléen | false |
| sur place validé | `actualTime.arrive.isCorrectAddress` | Arrivée validée à la bonne adresse. | Booléen | true |
| Temps de Retard | `delay.time` | Temps de retard (info de la tournée). | Nombre | 0 |
| Date du Retard | `delay.when` | Horodatage du calcul de retard (tournée). | Date/Heure | "2025-10-26T08:32:00.592Z" |
| Tentatives | `tentatives` | Nombre de tentatives de livraison. | Nombre | 1 |
| Terminé Par | `completePar` | Outil utilisé pour clôturer la tâche. | Texte | "mobile" |
| **Temps de Service Réel** | | | | |
| temps de service réel | `realServiceTime.serviceTime` | Durée réelle passée chez le client (s). | Nombre | 181.001 |
| Début Temps Service | `realServiceTime.startTime` | Début de l'action de livraison. | Date/Heure | "2025-11-02T08:36:00.087Z" |
| Fin Temps Service | `realServiceTime.endTime` | Fin de l'action de livraison. | Date/Heure | "2025-11-02T08:39:01.088Z" |
| Confiance Temps Service | `realServiceTime.confidence` | Fiabilité du calcul du temps de service. | Texte | "HIGH" |
| Version Temps Service | `realServiceTime.version` | Version de l'algorithme de calcul. | Nombre | 2 |
| Horodatages Minuteur | `execution.timer.timestamps` | Données de minuteurs (JSON). | Objet/JSON | [] |
| **Preuves & Échecs** | | | | |
| Sans contact (Forcé) | `execution.contactless.forced` | Livraison sans contact forcée. | Booléen | false |
| Raison Sans Contact | `execution.contactless.reason` | Raison si sans contact (si applicable). | Texte | "N/A" |
| Raison Échec | `execution.failedReason.reason` | Raison officielle en cas d'échec. | Texte | "N/A" |
| Raison Échec (Perso) | `execution.failedReason.custom` | Raison personnalisée d'échec. | Texte | |
| Nom Signature | `execution.signature.name` | Nom associé à la signature. | Texte | "MME Jennifer Cornu" |
| Photo Succès | `execution.successPicture` | ID de la photo preuve de livraison. | Texte | "9943d017-86b3-4fcd-8d81-..." |
| Latitude Position | `execution.position.latitude` | Latitude GPS à la clôture. | Nombre | 43.5973 |
| Longitude Position | `execution.position.longitude` | Longitude GPS à la clôture. | Nombre | 7.1195 |
| **Infos Tournée & Chauffeur** | | | | |
| Nom Tournée | `nomTournee` | Nom ou identifiant de la tournée. | Texte | "R01" |
| Séquence | `sequence` | Ordre de la tâche dans la tournée. | Nombre | 4 |
| Associé (Nom) | `nomAssocie` | Partenaire logistique. | Texte | "ID Logistics" |
| ID Externe Chauffeur | `livreur.idExterne` | Identifiant (email) du livreur. | Texte | "alexandremantibes@..." |
| Prénom Chauffeur | `livreur.prenom` | Prénom du livreur. | Texte | "Alexandre" |
| Nom Chauffeur | `livreur.nom` | Nom du livreur. | Texte | "Market Antibes" |
| Hub (Nom) | `nomHub` | Nom du dépôt (plateforme) de départ. | Texte | "Carrefour Market Antibes 7827" |
| Plateforme (Nom) | `nomPlateforme` | Nom de la plateforme ou du service. | Texte | "Carrefour LAD Caisse" |
| **Métadonnées & Système** | | | | |
| Type | `type` | Type de tâche. | Texte | "delivery" |
| Flux | `flux` | Flux logistique (identifiant). | Texte | "5c6e788b839b92144f5de1e1" |
| Progression | `progression` | État d'avancement. | Texte | "COMPLETED" |
| Tâches même arrêt | `realServiceTime.tasksDeliveredInSameStop` | Tâches multiples à la même adresse. | Booléen | false |
| Catégories | `categories` | Catégorisation des tâches (JSON). | Objet/JSON | `[]` |
| Code PE | `metaDonnees.codePe` | Code Point d'Entrée (métadonnée). | Texte | "1434" |
| Notation Livreur | `metaDonnees.notationLivreur` | Note donnée par le client. | Nombre | 5 |
| Service (Méta) | `metaDonnees.service` | Type de service (métadonnée). | Texte | "METI" |
| Code Entrepôt | `metaDonnees.warehouseCode` | Code de l'entrepôt (métadonnée). | Texte | "VDF" |
| Méta Commentaire Livreur | `metaDonnees.commentaireLivreur` | Commentaire du client sur le livreur. | Texte | |
| Infos Suivi Transp. | `externalCarrier.trackingInfo` | Informations de tracking (JSON). | Objet/JSON | {} |
| Désassoc. Transp. Rejetée | `externalCarrier.unassociationRejected` | Champ technique. | Booléen | false |
| Mis à jour le | `dateMiseAJour` | Horodatage de la dernière modification. | Date/Heure | "2025-10-26T08:56:39.263Z" |
| Créé le | `dateCreation` | Horodatage de la création de la tâche. | Date/Heure | "2025-10-25T14:04:18.764Z" |

## Bacs (Items)

| Nom de la Colonne | Champ JSON Correspondant (probable) | Description | Type de Donnée | Exemple |
| --- | --- | --- | --- | --- |
| **Identification & Liens** | | | | |
| ID Tâche | (Lien) | Clé de liaison : Identifie la tâche (livraison). | Nombre | 621723118 |
| Code-barres | `codeBarre` | Clé principale : L'identifiant unique du bac. | Texte | "C009504991367824" |
| ID de la Tournée | (Lien) | Clé de liaison : Identifie la tournée. | Texte | "68fdcd936309d5ede86068db" |
| Nom de la Tournée | (Lien) | Nom de la tournée (redondant). | Texte | "R01" |
| **Détails du Bac** | | | | |
| Nom | `nom` | Nom lisible du bac. | Texte | "Bac 1" |
| Type | `type` | Catégorie du bac. | Texte | "SEC" |
| Statut | `statut` | Statut individuel du bac. | Texte | "DELIVERED" |
| Quantité | `dimensions.bac` | Quantité (généralement 1). | Nombre | 1 |
| Quantité Traitée | (Interne) | Quantité réellement scannée. | Nombre | 1 |
| Dimensions | `dimensions` | Poids et volume du bac (JSON). | Objet/JSON | `{"bac": 1, "weight": 40, ...}` |
