# Spécification de la Structure des Données

Ce document définit la structure de données finale pour les entités "Tâche" (Task), "Tournée" (Round) et "Article" (Item) après transformation des données brutes de l'API Urbantz.

## 1. Fichier Tournées (64 colonnes)
Liste des champs de données pour l'entité Round (Tournée).

### Identification Tournée
- **ID Interne**: `id` ou `_id` (Texte) - Identifiant unique de la tournée. Exemple: "68fca1af8334a870b5d5563c"
- **ID**: `id` ou `_id` (Texte) - Identifiant unique (doublon). Exemple: "68fca1af8334a870b5d5563c"
- **Nom**: `name` (Texte) - Nom lisible ou code de la tournée. Exemple: "150"
- **Statut**: `status` (Texte) - Statut de la tournée (ex: CREATED, VALIDATED, ONGOING, COMPLETED). Exemple: "COMPLETED"
- **Activité**: `activity` (Texte) - Type d'activité pour l'entité (ex: classic, express). Exemple: "classic"
- **Date**: `date` (Date/Heure) - Date à laquelle la tournée doit être exécutée. Exemple: "2025-10-26T00:00:00.000Z"
- **Hub (ID)**: `hub` (Texte) - L'identifiant du hub (dépôt). Exemple: "64788b0a4f88d4949665f381"
- **Nom du Hub**: `nomHub` (Texte) - Nom lisible du dépôt (Note: Présent dans votre JSON, pas dans le schéma API). Exemple: "Rungis Dimanche Zone1"

### Infos Chauffeur & Véhicule
- **Associé (Nom)**: `associatedName` (Texte) - Le nom de la plateforme associée. Exemple: "ID Logistics"
- **email chauffeur**: `driver.externalId` (Texte) - L'identifiant externe d'un utilisateur (souvent l'email). Exemple: "Alexandre@idlog.com"
- **Prénom Chauffeur**: `driver.firstName` (Texte) - Le prénom de l'utilisateur. Exemple: "Alexandre"
- **Nom Chauffeur**: `driver.lastName` (Texte) - Le nom de famille de l'utilisateur. Exemple: "Karim 7"
- **Immatriculation**: `metadata.Immatriculation` (Texte) - (Métadonnée) Plaque d'immatriculation du véhicule. Exemple: "bx079xg"
- **Nom Véhicule**: `vehicle.name` (Texte) - Nom du type de véhicule. Exemple: "Camion Vitry auto"
- **Energie**: `metadata.Energie` (Texte) - (Métadonnée) Type de carburant du véhicule. Exemple: "Oui"

### Totaux de la Tournée
- **Bacs SURG**: (Calculé) (Nombre) - N'est pas dans l'API Tournée. Doit être calculé.
- **Bacs FRAIS**: (Calculé) (Nombre) - N'est pas dans l'API Tournée. Doit être calculé.
- **Bacs SEC**: (Calculé) (Nombre) - N'est pas dans l'API Tournée. Doit être calculé.
- **Bacs POISSON**: (Calculé) (Nombre) - N'est pas dans l'API Tournée. Doit être calculé.
- **Bacs BOUCHERIE**: (Calculé) (Nombre) - N'est pas dans l'API Tournée. Doit être calculé.
- **Total SEC + FRAIS**: (Calculé) (Nombre) - N'est pas dans l'API Tournée. Doit être calculé.
- **nombre de bacs**: `dimensions.bac` (Nombre) - Valeur dimensionnelle pour "bac". Exemple: 85
- **poids tournée**: `dimensions.poids` (Nombre) - Valeur dimensionnelle pour "poids". Exemple: 1020.39
- **Poids Réel**: `dimensions.poids` (Nombre) - Doublon de poids tournée. Exemple: 1020.39
- **volume tournée**: `dimensions.volume` (Nombre) - Valeur dimensionnelle pour "volume". Exemple: 3552.68
- **Nb Commandes**: `orderCount` (Nombre) - Le nombre de commandes (arrêts) assignées à cette tournée. Exemple: 18
- **Commandes Terminées**: `orderDone` (Nombre) - Le nombre de commandes terminées (livrées ou non). Exemple: 18

### Horaires & Lieux
- **Lieu de Départ**: `startLocation` (Texte) - Point de départ (généralement "hub"). Exemple: "hub"
- **Heure de Départ**: `startTime` (Date/Heure) - L'heure à laquelle la tournée doit commencer. Exemple: "2025-10-26T06:55:00.000Z"
- **Lieu de Fin**: `endLocation` (Texte) - Point de fin (généralement "hub"). Exemple: "hub"
- **Heure de Fin**: `endTime` (Date/Heure) - L'heure à laquelle la tournée est censée être terminée. Exemple: "2025-10-26T12:25:57.757Z"
- **heure de fin réelle**: `realInfo.hasFinished` (Date/Heure) - Le moment où le chauffeur a terminé la tournée. Exemple: "2025-10-26T12:27:08.531Z"
- **Démarrée (Réel)**: `realInfo.hasStarted` (Date/Heure) - Le moment où le chauffeur a commencé la tournée. Exemple: "2025-10-26T06:29:31.031Z"
- **Préparée (Réel)**: `realInfo.hasPrepared` (Date/Heure) - Le moment où le chauffeur (ou dispatcheur) a préparé la tournée. Exemple: "2025-10-26T05:53:21.211Z"
- **Temps Préparation (Réel)**: `realInfo.preparationTime` (Nombre) - Le temps (en ms) que le chauffeur ou dispatcheur a pris pour préparer la tournée. Exemple: 2169820

### Métriques & Coûts
- **Durée (Réel)**: `realInfo.hasLasted` (Nombre) - Le temps (en ms) que le chauffeur a pris pour exécuter la tournée. Exemple: 21457500
- **Temps Total**: `totalTime` (Nombre) - La durée totale de la tournée (en secondes). Exemple: 19857.75
- **Temps Trajet Total**: `totalTravelTime` (Nombre) - Le temps de trajet total pour la tournée (en secondes). Exemple: 10197.75
- **Temps Service Cmd Total**: `totalOrderServiceTime` (Nombre) - Le temps de service planifié total pour toutes les commandes (en secondes). Exemple: 9660
- **Temps Pause Total**: `totalBreakServiceTime` (Nombre) - Le temps de service total passé à toutes les pauses (en secondes). Exemple: 0
- **Temps Attente Total**: `totalWaitTime` (Nombre) - Le temps d'attente total à tous les arrêts (commandes, hubs, pauses) (en secondes). Exemple: 0
- **Temps de Retard**: `delay.time` (Nombre) - De combien de temps la tournée est retardée (en millisecondes). Exemple: 0
- **Date du Retard**: `delay.when` (Date/Heure) - La date de la dernière mise à jour (du retard). Exemple: "2025-10-26T12:26:07.516Z"
- **Temps Violation Total**: `totalViolationTime` (Nombre) - Le temps total de violation à toutes les commandes et pauses (en secondes). Exemple: 0
- **Distance Totale**: `totalDistance` (Nombre) - La distance totale en mètres pour la tournée. Exemple: 45308.90
- **Coût Total**: `totalCost` (Nombre) - Le coût d'exploitation total de la tournée. Exemple: 10000050.82
- **Coût par Temps**: `vehicle.costPerUnitTime` (Nombre) - Le coût du véhicule par heure. Exemple: 1

### Données Techniques & Véhicule
- **Flux**: `flux` (Texte) - L'identifiant de l'optimisation utilisée pour créer la tournée. Exemple: "5c6e788b839b92144f5de1e1"
- **TempSURG_Chargement**: `metadata.TempSURG_Chargement` (Texte) - (Métadonnée) Température Surgelé au chargement. Exemple: "-26"
- **TempsFRAIS_Chargement**: `metadata.TempsFRAIS_Chargement` (Texte) - (Métadonnée) Température Frais au chargement. Exemple: "0"
- **TempsFRAIS_Fin**: `metadata.TempsFRAIS_Fin` (Texte) - (Métadonnée) Température Frais à la fin. Exemple: "0"
- **TempsSURG_Fin**: `metadata.TempsSURG_Fin` (Texte) - (Métadonnée) Température Surgelé à la fin. Exemple: "-26"
- **codePostalMaitre**: `metadata.codePostalMaitre` (Texte) - (Métadonnée) Code postal principal de la zone. Exemple: "75020"
- **Arrêts**: `stops` (Objet/JSON) - Données brutes de tous les arrêts. Exemple: "[{...}, {...}]"
- **Temps Accélération Véhicule**: `vehicle.accelerationTime` (Nombre) - Le temps d'accélération du véhicule (pour l'optimisation). Exemple: 120
- **Pauses Véhicule**: `vehicle.breaks` (Booléen) - Si les pauses sont autorisées pour le conducteur de ce véhicule. Exemple: false
- **capacité bacs**: `vehicle.dimensions.bac` (Nombre) - Capacité max du véhicule (bacs). Exemple: 105
- **capacité poids**: `vehicle.dimensions.poids` (Nombre) - Capacité max du véhicule (kg). Exemple: 1100
- **Dim. Véhicule (Volume)**: `vehicle.dimensions.volume` (Nombre) - Capacité max du véhicule (volume). Exemple: 1000000
- **Distance Max Véhicule**: `vehicle.maxDistance` (Nombre) - La distance maximale d'un trajet pour ce véhicule (km). Exemple: 1050
- **Durée Max Véhicule**: `vehicle.maxDuration` (Nombre) - La durée maximale d'un trajet pour ce véhicule (minutes). Exemple: 420
- **Commandes Max Véhicule**: `vehicle.maxOrders` (Nombre) - Le nombre de commandes que le véhicule peut contenir. Exemple: 20
- **Mis à jour le**: `updated` (Date/Heure) - Horodatage de la dernière modification. Exemple: "2025-10-26T12:27:08.531Z"
- **Validé**: `validated` (Booléen) - Si la tournée est validée ou non. Exemple: true


## 2. Fichier Tâches (91 colonnes)
Liste des champs de données pour l'entité Task (Tâche/Arrêt).

### Identification
- **ID Tâche**: `taskId` (Texte) - Votre propre identifiant de tâche (ex: ERP, CMS). Exemple: "619118027"
- **ID Interne**: `taskReference` (Texte) - Un identifiant de tâche secondaire pour mapper les données. Exemple: "019f7d77-e652-4636-aff9-..."
- **Référence Tâche**: `taskReference` (Texte) - Doublon de ID Interne. Exemple: "019f7d77-e652-4636-aff9-..."
- **ID**: `_id` (Texte) - ID interne de la tâche (à utiliser pour les appels API). Exemple: "68fcd8e22b1b25ce2fbd6f9a"
- **Commande**: `metadata.numeroCommande` (Texte) - (Métadonnée) Numéro de commande client. Exemple: "WEB-12345"
- **Client (ID)**: `client` (Texte) - L'identifiant de l'expéditeur (sender). Exemple: "CARREFOUR LAD"

### Contenu de la Tâche
- **Bacs SURG**: (Calculé) (Nombre) - N'est pas dans l'API. Calculé à partir de items.type. Exemple: 1
- **Bacs FRAIS**: (Calculé) (Nombre) - N'est pas dans l'API. Calculé à partir de items.type. Exemple: 1
- **Bacs SEC**: (Calculé) (Nombre) - N'est pas dans l'API. Calculé à partir de items.type. Exemple: 7
- **Bacs POISSON**: (Calculé) (Nombre) - N'est pas dans l'API. Calculé à partir de items.type. Exemple: 0
- **Bacs BOUCHERIE**: (Calculé) (Nombre) - N'est pas dans l'API. Calculé à partir de items.type. Exemple: 0
- **Total SEC + FRAIS**: (Calculé) (Nombre) - Somme des bacs SEC et FRAIS. Exemple: 8
- **nombre de bacs**: `dimensions.bac` (Nombre) - Nombre total d'unités (bacs, colis). Exemple: 4
- **Nombre de Bacs**: `metadata.nbreBacs` (Nombre) - (Métadonnée) Nombre de bacs. Exemple: 4
- **poids en kg**: `dimensions.poids` (Nombre) - Poids total de la tâche en kg. Exemple: 160
- **volume en cm3**: `dimensions.volume` (Nombre) - Volume total de la tâche. Exemple: 4

### Planification
- **Date**: `date` (Date/Heure) - Date de la tournée (obsolète, utiliser timeWindow). Exemple: "2025-11-02T00:00:00.000Z"
- **Date Initiale Livraison**: `metadata.Date_Initiale_Livraison` (Texte) - (Métadonnée) Date de livraison planifiée. Exemple: "2025-10-26"
- **Début Créneau Initial**: `timeWindow.start` (Date/Heure) - Le début du créneau horaire. Exemple: "2025-11-02T07:30:00.000Z"
- **Fin Créneau Initial**: `timeWindow.stop` (Date/Heure) - La fin du créneau horaire. Exemple: "2025-11-02T09:30:00.000Z"
- **Début Fenêtre**: `timeWindow.start` (Date/Heure) - Doublon de Début Créneau Initial. Exemple: "2025-11-02T07:30:00.000Z"
- **Fin Fenêtre**: `timeWindow.stop` (Date/Heure) - Doublon de Fin Créneau Initial. Exemple: "2025-11-02T09:30:00.000Z"
- **Marge Fenêtre Horaire**: `timeWindowMargin` (Nombre) - Marge en minutes jugée acceptable pour le créneau. Exemple: 0
- **Heure Arrivée (Estimée)**: `arriveTime` (Date/Heure) - L'heure d'arrivée estimée au lieu de livraison. Exemple: "2025-11-02T06:56:22.069Z"
- **Temps de service estimé**: `serviceTime` (Nombre) - Temps estimé (en minutes) requis pour terminer la tâche. Exemple: 10

### Adresse & Instructions
- **Adresse**: `location.address` (Texte) - Chaîne d'adresse formatée complète. Exemple: "Avenue Jules Grec 431 06600..."
- **Numéro**: `location.number` (Texte) - Numéro dans la rue. Exemple: "431"
- **Rue**: `location.street` (Texte) - Nom de la rue. Exemple: "Avenue Jules Grec"
- **Bâtiment**: `location.building` (Texte) - Nom du bâtiment ou de la propriété. Exemple: "D2"
- **Bâtiment (Méta)**: `metadata.building` (Texte) - (Métadonnée) Information sur le bâtiment. Exemple: "D2"
- **Étage**: `contact.buildingInfo.floor` (Nombre) - Numéro d'étage. Exemple: 3
- **Digicode 1**: `contact.buildingInfo.digicode1` (Texte) - Digicode. Exemple: "15A63"
- **Avec Ascenseur**: `contact.buildingInfo.hasElevator` (Booléen) - Indique si le bâtiment a un ascenseur. Exemple: true
- **Avec Interphone**: `contact.buildingInfo.hasInterphone` (Booléen) - Indique si le bâtiment a un interphone. Exemple: true
- **Code Interphone**: `contact.buildingInfo.interphoneCode` (Texte) - Code de l'interphone. Exemple: "En panne"
- **Ville**: `location.city` (Texte) - Nom de la ville. Exemple: "Antibes"
- **Code Postal**: `location.zip` (Texte) - Code postal. Exemple: "06600"
- **Pays**: `location.countryCode` (Texte) - Le code ISO 3166-1 alpha-3 du pays. Exemple: "FRA"
- **Instructions**: `instructions` (Texte) - Informations supplémentaires pour le chauffeur. Exemple: "Appeler au 0679882747"

### Contact Client
- **Personne Contact**: `contact.person` (Texte) - Nom et prénom du contact. Exemple: "MME Margaux Saccoccio"
- **Compte Contact**: `contact.account` (Texte) - Numéro de compte du contact. Exemple: "15868723"
- **Email Contact**: `contact.email` (Texte) - Adresse email du contact. Exemple: "marg.sacc@orange.fr"
- **Téléphone Contact**: `contact.phone` (Texte) - Numéro de téléphone du contact. Exemple: "33679882747"
- **Notif. Email**: `notificationSettings.email` (Booléen) - Notification par email activée. Exemple: true
- **Notif. SMS**: `notificationSettings.sms` (Booléen) - Notification par SMS activée. Exemple: true

### Réalisation & Statuts
- **Statut**: `status` (Texte) - Détails granulaires de ce qui se passe (ex: DELIVERED). Exemple: "DELIVERED"
- **Heure d'arrivée réelle**: `actualTime.arrive.when` (Date/Heure) - Horodatage de l'arrivée réelle du livreur. Exemple: "2025-10-26T07:28:19.347Z"
- **Date de Clôture**: `closureDate` (Date/Heure) - Date et heure de complétion de la tâche. Exemple: "2025-11-02T08:37:15.181Z"
- **sur place forcé**: `actualTime.arrive.forced` (Booléen) - Indique si le chauffeur a forcé l'arrivée. Exemple: false
- **sur place validé**: `actualTime.arrive.isCorrectAddress` (Booléen) - Indique si le chauffeur était à une autre adresse mais a validé. Exemple: true
- **Temps de Retard**: `delay.time` (via Tournée) (Nombre) - (Info de la Tournée) Temps de retard (ms). Exemple: 0
- **Date du Retard**: `delay.when` (via Tournée) (Date/Heure) - (Info de la Tournée) Horodatage du calcul de retard. Exemple: "2025-10-26T08:32:00.592Z"
- **Tentatives**: `attempts` (Nombre) - Le nombre de tentatives de livraison effectuées. Exemple: 1
- **Terminé Par**: `completedBy` (Texte) - Outil utilisé pour clôturer la tâche (ex: mobile). Exemple: "mobile"

### Temps de Service Réel
- **temps de service réel**: `realServiceTime.serviceTime` (Nombre) - Durée (en secondes) calculée par Urbantz. Exemple: 181.001
- **Début Temps Service**: `realServiceTime.startTime` (Date/Heure) - Début de l'action de livraison. Exemple: "2025-11-02T08:36:00.087Z"
- **Fin Temps Service**: `realServiceTime.endTime` (Date/Heure) - Fin de l'action de livraison. Exemple: "2025-11-02T08:39:01.088Z"
- **Confiance Temps Service**: `realServiceTime.confidence` (Texte) - Fiabilité du calcul du temps de service (HIGH/LOW). Exemple: "HIGH"
- **Version Temps Service**: `realServiceTime.version` (Nombre) - Version de l'algorithme de calcul. Exemple: 2
- **Horodatages Minuteur**: `execution.timer.timestamps` (Objet/JSON) - Données de minuteurs. Exemple: []

### Preuves & Échecs
- **Sans contact (Forcé)**: `execution.contactless.forced` (Booléen) - Indique si le code PIN a été sauté. Exemple: false
- **Raison Sans Contact**: `execution.contactless.reason` (Texte) - La raison pour laquelle le code PIN a été sauté. Exemple: "N/A"
- **Raison Échec**: `execution.failedReason.reason` (Texte) - Raison (officielle) de l'échec de la tâche. Exemple: "N/A"
- **Raison Échec (Perso)**: `execution.failedReason.custom` (Texte) - Raison (personnalisée) de l'échec de la tâche. Exemple: (Vide)
- **Nom Signature**: `execution.signature.name` (Texte) - Nom de la personne qui a signé. Exemple: "MME Jennifer Cornu"
- **Photo Succès**: `execution.successPicture` (Texte) - URL de la photo prise comme preuve de succès. Exemple: "9943d017-86b3-4fcd-8d81-..."
- **Latitude Position**: `execution.position.latitude` (Nombre) - Latitude GPS à la clôture. Exemple: 43.5973
- **Longitude Position**: `execution.position.longitude` (Nombre) - Longitude GPS à la clôture. Exemple: 7.1195

### Infos Tournée & Chauffeur
- **Nom Tournée**: `roundName` (Texte) - Nom de la tournée où la tâche est assignée. Exemple: "R01"
- **Séquence**: `sequence` (Nombre) - Séquence de la tâche dans la tournée. Exemple: 4
- **Associé (Nom)**: `associatedName` (Texte) - Le nom de la plateforme associée. Exemple: "ID Logistics"
- **ID Externe Chauffeur**: `driver.externalId` (Texte) - Identifiant externe (email) du livreur. Exemple: "alexandremantibes@..."
- **Prénom Chauffeur**: `driver.firstName` (Texte) - Prénom du livreur. Exemple: "Alexandre"
- **Nom Chauffeur**: `driver.lastName` (Texte) - Nom du livreur. Exemple: "Market Antibes"
- **Hub (ID)**: `hub` (Texte) - L'identifiant du hub (dépôt). Exemple: "5cf0d7036760b37187ed8070"
- **Hub (Nom)**: `hubName` (Texte) - Nom du dépôt (plateforme) de départ. Exemple: "Carrefour Market Antibes 7827"
- **Plateforme (Nom)**: `platformName` (Texte) - Le nom de la plateforme. Exemple: "Carrefour LAD Caisse"

### Métadonnées & Système
- **Type**: `type` (Texte) - Le type de tâche (delivery ou pickup). Exemple: "delivery"
- **Flux**: `flux` (Texte) - L'identifiant de l'optimisation utilisée. Exemple: "5c6e788b839b92144f5de1e1"
- **Progression**: `progress` (Texte) - Étape de haut niveau de la tâche (ex: ANNOUNCED, COMPLETED). Exemple: "COMPLETED"
- **Tâches même arrêt**: `realServiceTime.tasksDeliveredInSameStop` (Nombre) - Nombre de tâches complétées sans bouger. Exemple: 1
- **Catégories**: `categories` (Objet/JSON) - Catégories assignées aux tâches. Exemple: []
- **Code PE**: `metadata.codePe` (Texte) - (Métadonnée) Code Point d'Entrée. Exemple: "1434"
- **Notation Livreur**: `metadata.notationLivreur` (Nombre) - (Métadonnée) Note donnée par le client. Exemple: 5
- **Service (Méta)**: `metadata.service` (Texte) - (Métadonnée) Type de service. Exemple: "METI"
- **Code Entrepôt**: `metadata.warehouseCode` (Texte) - (Métadonnée) Code de l'entrepôt. Exemple: "VDF"
- **Méta Commentaire Livreur**: `metadata.commentaireLivreur` (Texte) - (Métadonnée) Commentaire du client sur le livreur. Exemple: (Vide)
- **Infos Suivi Transp.**: `externalCarrier.trackingInfo` (Objet/JSON) - Informations de tracking. Exemple: {}
- **Désassoc. Transp. Rejetée**: `externalCarrier.unassociationRejected` (Booléen) - Champ technique. Exemple: false
- **Mis à jour le**: `updated` (Date/Heure) - Horodatage de la dernière modification. Exemple: "2025-10-26T08:56:39.263Z"
- **Créé le**: `when` (Date/Heure) - Quand la tâche a été créée. Exemple: "2025-10-25T14:04:18.764Z"


## 3. Fichier Bacs (20 colonnes)
Liste des champs de données pour l'entité Item (Bac/Article).

### Identification & Liens
- **ID Tâche**: (Lien) (Nombre) - Clé de liaison : Identifie la tâche (livraison) à laquelle ce bac appartient. Exemple: 621723118
- **Code-barres**: `barcode` (Texte) - Le code-barres de l'article. Exemple: "C009504991367824"
- **ID de la Tournée**: (Lien) (Texte) - Clé de liaison : Identifie la tournée à laquelle ce bac appartient. Exemple: "68fdcd936309d5ede86068db"
- **Nom de la Tournée**: (Lien) (Texte) - Nom de la tournée (redondant). Exemple: "R01"

### Détails du Bac
- **Nom**: `name` (Texte) - Nom de l'article. Exemple: "Bac 1"
- **Type**: `type` (Texte) - Type d'article défini dans la config plateforme. Exemple: "SEC"
- **Statut**: `status` (Texte) - Statut individuel de l'article (ex: DELIVERED, PENDING). Exemple: "DELIVERED"
- **Quantité**: `quantity` (Nombre) - Quantité d'unités de cet article. Exemple: 1
- **Quantité Traitée**: `processedQuantity` (Nombre) - Quantité d'unités traitées de cet article. Exemple: 1
- **Dimensions**: `dimensions` (Objet/JSON) - Poids et volume de l'article. Exemple: {"bac": 1, "weight": 40, ...}
- **Encodage Code-barres**: `barcodeEncoding` (Texte) - Encodage du code-barres (ex: CODE128). Exemple: "CODE128"
- **Endommagé**: `damaged` (Objet/JSON) - Indique si l'article est endommagé. Exemple: {"confirmed": false, ...}

### Champs Techniques & Vides
- **Log**: `log` (Objet/JSON) - Log de la transition de statut de l'article. Exemple: [{"when": "...", "to": "..."}, ...]
- **Référence**: `reference` (Vide) - Référence externe de l'article.
- **Client**: (N/A) (Vide) - (Champ vide - Non présent dans le schéma Item).
- **Étiquettes**: `labels` (Objet/JSON) - Étiquettes requises. Exemple: []
- **Compétences**: `skills` (Objet/JSON) - Compétences requises. Exemple: []
- **Métadonnées**: `metadata` (Objet/JSON) - Métadonnées de l'article. Exemple: {}
- **Description**: `description` (Texte) - Description de l'article.
- **Groupe**: `group` (Texte) - Code-barres du groupe dans lequel l'article est placé.
