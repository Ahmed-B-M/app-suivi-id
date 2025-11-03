# Spécification de la Structure des Données

Ce document définit la structure de données finale pour les entités "Tâche" (Task) et "Tournée" (Round) après transformation des données brutes de l'API Urbantz.

## Tournées (Rounds)

| Nom de la Colonne | Champ JSON Correspondant | Description | Type de Donnée | Exemple |
| --- | --- | --- | --- | --- |
| **Identification Tournée** | | | | |
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
| ID Tâche | `taskId` | Votre propre identifiant de tâche (ex: ERP, CMS). | Texte | "619118027" |
| ID Interne | `taskReference` | Un identifiant de tâche secondaire pour mapper les données. | Texte | "019f7d77-e652-4636-aff9-..." |
| Référence Tâche | `taskReference` | Doublon de ID Interne. | Texte | "019f7d77-e652-4636-aff9-..." |
| ID | `_id` | ID interne de la tâche (à utiliser pour les appels API). | Texte | "68fcd8e22b1b25ce2fbd6f9a" |
| Commande | `metadata.numeroCommande` | (Métadonnée) Numéro de commande client. | Texte | "WEB-12345" |
| Client (ID) | `client` | L'identifiant de l'expéditeur (sender). | Texte | "CARREFOUR LAD" |
| **Contenu de la Tâche** | | | | |
| Bacs SURG | (Calculé) | N'est pas dans l'API. Calculé à partir de items.type. | Nombre | 1 |
| Bacs FRAIS | (Calculé) | N'est pas dans l'API. Calculé à partir de items.type. | Nombre | 1 |
| Bacs SEC | (Calculé) | N'est pas dans l'API. Calculé à partir de items.type. | Nombre | 7 |
| Bacs POISSON | (Calculé) | N'est pas dans l'API. Calculé à partir de items.type. | Nombre | 0 |
| Bacs BOUCHERIE | (Calculé) | N'est pas dans l'API. Calculé à partir de items.type. | Nombre | 0 |
| Total SEC + FRAIS | (Calculé) | N'est pas dans l'API. Calculé. | Nombre | 8 |
| nombre de bacs | `dimensions.bac` | Nombre total d'unités (bacs, colis). | Nombre | 4 |
| Nombre de Bacs | `metadata.nbreBacs` | (Métadonnée) Nombre de bacs. | Nombre | 4 |
| poids en kg | `dimensions.poids` | Poids total de la tâche en kg. | Nombre | 160 |
| volume en cm3 | `dimensions.volume` | Volume total de la tâche. | Nombre | 4 |
| **Planification** | | | | |
| Date | `date` | Date de la tournée (obsolète, utiliser timeWindow). | Date/Heure | "2025-11-02T00:00:00.000Z" |
| Date Initiale Livraison | `metadata.Date_Initiale_Livraison` | (Métadonnée) Date de livraison planifiée. | Texte | "2025-10-26" |
| Début Créneau Initial | `timeWindow.start` | Le début du créneau horaire. | Date/Heure | "2025-11-02T07:30:00.000Z" |
| Fin Créneau Initial | `timeWindow.stop` | La fin du créneau horaire. | Date/Heure | "2025-11-02T09:30:00.000Z" |
| Début Fenêtre | `timeWindow.start` | Doublon de Début Créneau Initial. | Date/Heure | "2025-11-02T07:30:00.000Z" |
| Fin Fenêtre | `timeWindow.stop` | Doublon de Fin Créneau Initial. | Date/Heure | "2025-11-02T09:30:00.000Z" |
| Marge Fenêtre Horaire | `timeWindowMargin` | Marge en minutes jugée acceptable pour le créneau. | Nombre | 0 |
| Heure Arrivée (Estimée) | `arriveTime` | L'heure d'arrivée estimée au lieu de livraison. | Date/Heure | "2025-11-02T06:56:22.069Z" |
| Temps de service estimé | `serviceTime` | Temps estimé (en minutes) requis pour terminer la tâche. | Nombre | 10 |
| **Adresse & Instructions** | | | | |
| Adresse | `location.address` | Chaîne d'adresse formatée complète. | Texte | "Avenue Jules Grec 431 06600..." |
| Numéro | `location.number` | Numéro dans la rue. | Texte | "431" |
| Rue | `location.street` | Nom de la rue. | Texte | "Avenue Jules Grec" |
| Bâtiment | `location.building` | Nom du bâtiment ou de la propriété. | Texte | "D2" |
| Bâtiment (Méta) | `metadata.building` | (Métadonnée) Information sur le bâtiment. | Texte | "D2" |
| Étage | `contact.buildingInfo.floor` | Numéro d'étage. | Nombre | 3 |
| Digicode 1 | `contact.buildingInfo.digicode1` | Digicode. | Texte | "15A63" |
| Avec Ascenseur | `contact.buildingInfo.hasElevator` | Indique si le bâtiment a un ascenseur. | Booléen | true |
| Avec Interphone | `contact.buildingInfo.hasInterphone` | Indique si le bâtiment a un interphone. | Booléen | true |
| Code Interphone | `contact.buildingInfo.interphoneCode` | Code de l'interphone. | Texte | "En panne" |
| Ville | `location.city` | Nom de la ville. | Texte | "Antibes" |
| Code Postal | `location.zip` | Code postal. | Texte | "06600" |
| Pays | `location.countryCode` | Le code ISO 3166-1 alpha-3 du pays. | Texte | "FRA" |
| Instructions | `instructions` | Informations supplémentaires pour le chauffeur. | Texte | "Appeler au 0679882747" |
| **Contact Client** | | | | |
| Personne Contact | `contact.person` | Nom et prénom du contact. | Texte | "MME Margaux Saccoccio" |
| Compte Contact | `contact.account` | Numéro de compte du contact. | Texte | "15868723" |
| Email Contact | `contact.email` | Adresse email du contact. | Texte | "marg.sacc@orange.fr" |
| Téléphone Contact | `contact.phone` | Numéro de téléphone du contact. | Texte | "33679882747" |
| Notif. Email | `notificationSettings.email` | Notification par email activée. | Booléen | true |
| Notif. SMS | `notificationSettings.sms` | Notification par SMS activée. | Booléen | true |
| **Réalisation & Statuts** | | | | |
| Statut | `status` | Détails granulaires de ce qui se passe (ex: DELIVERED). | Texte | "DELIVERED" |
| Heure d'arrivée réelle | `actualTime.arrive.when` | Horodatage de l'arrivée réelle du livreur. | Date/Heure | "2025-10-26T07:28:19.347Z" |
| Date de Clôture | `closureDate` | Date et heure de complétion de la tâche. | Date/Heure | "2025-11-02T08:37:15.181Z" |
| sur place forcé | `actualTime.arrive.forced` | Indique si le chauffeur a forcé l'arrivée. | Booléen | false |
| sur place validé | `actualTime.arrive.isCorrectAddress` | Indique si le chauffeur était à une autre adresse mais a validé. | Booléen | true |
| Temps de Retard | `delay.time` (via Tournée) | (Info de la Tournée) Temps de retard (ms). | Nombre | 0 |
| Date du Retard | `delay.when` (via Tournée) | (Info de la Tournée) Horodatage du calcul de retard. | Date/Heure | "2025-10-26T08:32:00.592Z" |
| Tentatives | `attempts` | Le nombre de tentatives de livraison effectuées. | Nombre | 1 |
| Terminé Par | `completedBy` | Outil utilisé pour clôturer la tâche (ex: mobile). | Texte | "mobile" |
| **Temps de Service Réel** | | | | |
| temps de service réel | `realServiceTime.serviceTime` | Durée (en secondes) calculée par Urbantz. | Nombre | 181.001 |
| Début Temps Service | `realServiceTime.startTime` | Début de l'action de livraison. | Date/Heure | "2025-11-02T08:36:00.087Z" |
| Fin Temps Service | `realServiceTime.endTime` | Fin de l'action de livraison. | Date/Heure | "2025-11-02T08:39:01.088Z" |
| Confiance Temps Service | `realServiceTime.confidence` | Fiabilité du calcul du temps de service (HIGH/LOW). | Texte | "HIGH" |
| Version Temps Service | `realServiceTime.version` | Version de l'algorithme de calcul. | Nombre | 2 |
| Horodatages Minuteur | `execution.timer.timestamps` | Données de minuteurs (JSON). | Objet/JSON | [] |
| **Preuves & Échecs** | | | | |
| Sans contact (Forcé) | `execution.contactless.forced` | Indique si le code PIN a été sauté. | Booléen | false |
| Raison Sans Contact | `execution.contactless.reason` | La raison pour laquelle le code PIN a été sauté. | Texte | "N/A" |
| Raison Échec | `execution.failedReason.reason` | Raison (officielle) de l'échec de la tâche. | Texte | "N/A" |
| Raison Échec (Perso) | `execution.failedReason.custom` | Raison (personnalisée) de l'échec de la tâche. | Texte | |
| Nom Signature | `execution.signature.name` | Nom de la personne qui a signé. | Texte | "MME Jennifer Cornu" |
| Photo Succès | `execution.successPicture` | URL de la photo prise comme preuve de succès. | Texte | "9943d017-86b3-4fcd-8d81-..." |
| Latitude Position | `execution.position.latitude` | Latitude GPS à la clôture. | Nombre | 43.5973 |
| Longitude Position | `execution.position.longitude` | Longitude GPS à la clôture. | Nombre | 7.1195 |
| **Infos Tournée & Chauffeur** | | | | |
| Nom Tournée | `roundName` | Nom de la tournée où la tâche est assignée. | Texte | "R01" |
| Séquence | `sequence` | Séquence de la tâche dans la tournée. | Nombre | 4 |
| Associé (Nom) | `associatedName` | Le nom de la plateforme associée. | Texte | "ID Logistics" |
| ID Externe Chauffeur | `driver.externalId` | Identifiant externe (email) du livreur. | Texte | "alexandremantibes@..." |
| Prénom Chauffeur | `driver.firstName` | Prénom du livreur. | Texte | "Alexandre" |
| Nom Chauffeur | `driver.lastName` | Nom du livreur. | Texte | "Market Antibes" |
| Hub (ID) | `hub` | L'identifiant du hub (dépôt). | Texte | "5cf0d7036760b37187ed8070" |
| Hub (Nom) | `hubName` | Nom du dépôt (plateforme) de départ. | Texte | "Carrefour Market Antibes 7827" |
| Plateforme (Nom) | `platformName` | Le nom de la plateforme. | Texte | "Carrefour LAD Caisse" |
| **Métadonnées & Système** | | | | |
| Type | `type` | Le type de tâche (delivery ou pickup). | Texte | "delivery" |
| Flux | `flux` | L'identifiant de l'optimisation utilisée. | Texte | "5c6e788b839b92144f5de1e1" |
| Progression | `progress` | Étape de haut niveau de la tâche (ex: ANNOUNCED, COMPLETED). | Texte | "COMPLETED" |
| Tâches même arrêt | `realServiceTime.tasksDeliveredInSameStop` | Nombre de tâches complétées sans bouger. | Nombre | 1 |
| Catégories | `categories` | Catégories assignées aux tâches (JSON). | Objet/JSON | `[]` |
| Code PE | `metadata.codePe` | (Métadonnée) Code Point d'Entrée. | Texte | "1434" |
| Notation Livreur | `metadata.notationLivreur` | (Métadonnée) Note donnée par le client. | Nombre | 5 |
| Service (Méta) | `metadata.service` | (Métadonnée) Type de service. | Texte | "METI" |
| Code Entrepôt | `metadata.warehouseCode` | (Métadonnée) Code de l'entrepôt. | Texte | "VDF" |
| Méta Commentaire Livreur | `metadata.commentaireLivreur` | (Métadonnée) Commentaire du client sur le livreur. | Texte | |
| Infos Suivi Transp. | `externalCarrier.trackingInfo` | Informations de tracking (JSON). | Objet/JSON | {} |
| Désassoc. Transp. Rejetée | `externalCarrier.unassociationRejected` | Champ technique. | Booléen | false |
| Mis à jour le | `updated` | Horodatage de la dernière modification. | Date/Heure | "2025-10-26T08:56:39.263Z" |
| Créé le | `when` | Quand la tâche a été créée. | Date/Heure | "2025-10-25T14:04:18.764Z" |

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
