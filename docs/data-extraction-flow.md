
# Fonctionnement de l'Extraction des Données Urbantz

Ce document explique en détail le processus utilisé par l'application pour extraire, filtrer et afficher les données depuis l'API Urbantz.

## Le Schéma Global (Vue d'ensemble)

L'architecture est conçue pour être sécurisée et efficace. Elle sépare clairement les responsabilités entre le client (votre navigateur) et le serveur. Voici les grandes étapes du processus :

1.  **Interface Utilisateur (Client)** : L'utilisateur remplit un formulaire avec sa clé API et ses critères de recherche (dates, statuts, etc.).
2.  **Appel Sécurisé (Action Serveur)** : Au lieu d'appeler l'API Urbantz directement depuis le navigateur (ce qui exposerait la clé API), le formulaire déclenche une **Action Serveur Next.js**. C'est une fonction qui s'exécute uniquement sur le serveur.
3.  **Interrogation de l'API (Serveur)** : Le serveur reçoit les critères, construit la requête et appelle l'API Urbantz en utilisant la clé API en toute sécurité.
4.  **Gestion de la Pagination (Serveur)** : L'API Urbantz ne renvoie pas toutes les données en une seule fois. Elle les pagine. Le serveur doit donc effectuer plusieurs appels successifs pour récupérer toutes les pages de données.
5.  **Filtrage des Données (Serveur)** : Une fois toutes les données brutes récupérées, le serveur les filtre selon les critères qui n'ont pas pu être appliqués directement au niveau de l'API.
6.  **Retour au Client** : Le serveur renvoie le résultat final (données filtrées et logs) au client, qui met à jour l'interface.

---

## Le Cœur de la Logique : Le Fichier `src/app/actions.ts`

Toute la logique métier se trouve dans ce fichier. Il contient les fonctions qui s'exécutent côté serveur.

### Étape 1 : Les Identifiants, Clés et Endpoints

Avant toute chose, il faut comprendre les éléments de base de la communication avec l'API.

-   **Clé d'API (`x-api-key`)**
    -   **Quoi ?** C'est un code secret (une longue chaîne de caractères) que vous fournissez dans le formulaire.
    -   **Pourquoi ?** Elle sert à vous authentifier auprès de l'API Urbantz. C'est comme un mot de passe qui prouve que vous avez le droit de demander des données. Elle est envoyée dans l'en-tête (`header`) de chaque requête pour des raisons de sécurité.
-   **Endpoints (Les Liens de l'API)**
    -   **Quoi ?** Ce sont les URL spécifiques que l'application appelle pour obtenir des types de données différents.
    -   **`https://api.urbantz.com/v2/task`** : Utilisé pour récupérer toutes les données liées aux **tâches**.
    -   **`https://api.urbantz.com/v2/round`** : Utilisé pour récupérer toutes les données liées aux **tournées**.

### Étape 2 : L'Action Principale (`runExportAction` ou `runRoundExportAction`)

-   Ces fonctions sont les points d'entrée déclenchés par les formulaires.
-   Elles valident d'abord les données reçues (dates, clé API, etc.) grâce à la librairie **Zod**.
-   Elles initialisent un tableau `logs` pour enregistrer et afficher chaque étape du processus.
-   Elles préparent les paramètres de requête pour l'API en utilisant `URLSearchParams`.

**Exemple de logique de date :**
Pour les tâches, l'API exige de filtrer jour par jour. L'application doit donc boucler sur chaque jour de la période sélectionnée et effectuer un appel API pour chaque journée.

```javascript
// Boucle sur chaque jour de la période sélectionnée
const dateCursor = new Date(from);
while (dateCursor <= to) {
    const dateString = dateCursor.toISOString().split("T")[0];
    //...
    const paramsForDay = new URLSearchParams(baseParams);
    paramsForDay.append("date", dateString);

    const tasksForDay = await fetchTasks(apiKey, paramsForDay, logs);
    allTasks.push(...tasksForDay);

    dateCursor.setDate(dateCursor.getDate() + 1);
}
```

### Étape 3 : La Fonction Générique `fetchGeneric` (Le Moteur de Pagination)

Pour éviter de répéter le code pour les tâches (`task`) et les tournées (`round`), une fonction générique a été créée. C'est elle qui gère la complexité de l'interrogation de l'API.

#### Gestion de la Pagination

-   L'API Urbantz limite le nombre de résultats par appel. Nous définissons une taille de page (`pageSize = 500`).
-   Une boucle `while (hasMoreData)` est utilisée. Elle continue de tourner tant que l'API renvoie des données.
-   À chaque itération, elle incrémente le numéro de la page (`page++`) et l'ajoute aux paramètres de l'URL (`url.searchParams.append("page", page.toString())`).
-   La boucle s'arrête lorsque l'API renvoie un tableau vide, signifiant qu'il n'y a plus de données à récupérer.

```javascript
while (hasMoreData) {
    // ... Construit l'URL avec les paramètres de page
    url.searchParams.append("page", page.toString());
    url.searchParams.append("pageSize", pageSize.toString());

    // ... Fait l'appel fetch
    const items = await response.json();

    if (items.length > 0) {
        allItems.push(...items); // Ajoute les données au tableau principal
        page++; // Passe à la page suivante
    } else {
        hasMoreData = false; // Arrête la boucle
    }
}
```

#### Authentification

La clé API est transmise de manière sécurisée dans l'en-tête (`header`) de la requête `fetch`, jamais dans l'URL.

```javascript
const response = await fetch(url.toString(), {
    headers: {
        "x-api-key": apiKey, // La clé est ici
    },
});
```

### Étape 4 : Les Deux Niveaux de Filtrage

C'est un point crucial pour comprendre comment l'application optimise les requêtes.

#### Niveau 1 : Filtrage Côté API (Le plus efficace)

-   Pour les filtres que l'API Urbantz comprend, l'application les ajoute directement dans les paramètres de l'URL (`URLSearchParams`). L'API ne renvoie alors que les données correspondantes. C'est la méthode la plus rapide et la plus recommandée.
-   **Exemples de filtres API utilisés dans l'application :**
    -   `date` : Pour récupérer les éléments d'un jour spécifique.
    -   `progress` : C'est le nom du paramètre API pour filtrer les **tâches** par leur statut (`COMPLETED`, `ONGOING`, etc.).
    -   `taskId` : Pour récupérer une tâche par son identifiant unique.
    -   `round` : Pour récupérer les tâches appartenant à un ID de tournée spécifique.
    -   `unplanned` : Un booléen (`true`/`false`) pour ne récupérer que les tâches non planifiées.

```javascript
// Ajoute le filtre de statut si il est présent
if (status && status !== "all") baseParams.append("progress", status);
```

#### Niveau 2 : Filtrage Côté Application (Quand l'API ne peut pas le faire)

-   Parfois, l'API ne propose pas de filtre pour un certain champ. C'est le cas pour le **statut des tournées (`Round`)**.
-   Dans ce cas, l'application est obligée de :
    1.  Récupérer **toutes** les tournées pour la période donnée (en filtrant uniquement par `date`).
    2.  Une fois toutes les données reçues, utiliser la méthode `.filter()` de JavaScript sur le tableau de données pour ne garder que les éléments qui correspondent au critère de statut.

C'est ce qui se passe dans `runRoundExportAction` :

```javascript
// Après avoir récupéré toutes les tournées (allRounds)...
let filteredRounds = allRounds;
if (status && status !== "all") {
  logs.push(`\n🔄 Filtrage des tournées par statut: ${status}`);
  // On filtre le tableau en mémoire sur le serveur
  filteredRounds = allRounds.filter((round) => round.status === status);
}
```
Cette méthode est moins performante car elle demande plus de données que nécessaire à l'API, mais elle est indispensable quand l'API n'offre pas le filtre requis.

---

## Annexe : Signification des Données de l'API

Voici une description des principaux champs de données que vous pouvez attendre de l'API, basée sur la configuration et l'utilisation dans votre application. **Note :** l'API peut renvoyer bien plus de champs. La méthode la plus fiable pour tous les voir est d'utiliser la vue détaillée dans l'application.

### Entité `Task` (Tâche)

| Champ             | Signification                                                                                             | Type de Donnée |
| ----------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| `id`              | L'identifiant unique et technique de la tâche.                                                            | `string`       |
| `taskId`          | Un autre identifiant pour la tâche, souvent plus lisible ou utilisé dans les interfaces.                  | `string`       |
| `hubId`           | L'identifiant du centre (hub) auquel la tâche est rattachée.                                              | `string`       |
| `createdAt`       | Date et heure de création de la tâche.                                                                    | `date-time`    |
| `updatedAt`       | Date et heure de la dernière modification de la tâche. **Important pour la synchronisation.**             | `date-time`    |
| `plannedArrival`  | Heure d'arrivée prévue pour l'exécution de la tâche.                                                      | `date-time`    |
| `description`     | Une description textuelle de ce qui doit être fait.                                                       | `string`       |
| `status` / `progress` | Le statut actuel de la tâche (ex: `COMPLETED`, `ONGOING`, `ASSIGNED`). Le nom du champ peut varier.     | `string`       |
| `priority`        | Le niveau de priorité de la tâche.                                                                        | `number`       |
| `customerId`      | L'identifiant du client associé à cette tâche.                                                            | `string`       |
| `tags`            | Une liste d'étiquettes ou de mots-clés associés à la tâche.                                               | `array`        |
| `unplanned`       | Un indicateur (vrai/faux) précisant si la tâche est planifiée ou non.                                     | `boolean`      |
| `round`           | Un objet ou un identifiant liant la tâche à une tournée (`Round`).                                         | `object/string`|

### Entité `Round` (Tournée)

| Champ    | Signification                                                                               | Type de Donnée |
| -------- | ------------------------------------------------------------------------------------------- | -------------- |
| `id`     | L'identifiant unique et technique de la tournée.                                            | `string`       |
| `name`   | Le nom donné à la tournée pour l'identifier facilement.                                     | `string`       |
| `status` | Le statut actuel de la tournée (ex: `COMPLETED`, `ONGOING`, `VALIDATED`, `PUBLISHED`).       | `string`       |
| `date`   | La date à laquelle la tournée est prévue ou a eu lieu.                                        | `date-time`    |
| `tasks`  | Une liste des identifiants de tâches (`Task`) incluses dans cette tournée.                      | `array`        |
| `vehicle`| Des informations sur le véhicule assigné à la tournée.                                        | `object`       |
| `driver` | Des informations sur le chauffeur assigné.                                                    | `object`       |
