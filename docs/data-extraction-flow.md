
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

### 1. Les Actions Principales (`runExportAction` et `runRoundExportAction`)

-   Ce sont les points d'entrée déclenchés par les formulaires.
-   Elles valident d'abord les données reçues du formulaire à l'aide de Zod (`exportFormSchema`).
-   Elles initialisent un tableau `logs` pour enregistrer chaque étape du processus.
-   Elles préparent les paramètres de requête pour l'API.

**Exemple de logique de date :**
Pour les tâches, l'API ne permet pas toujours de filtrer sur une plage de dates. L'application doit donc boucler sur chaque jour de la période sélectionnée et effectuer un appel API pour chaque journée.

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

### 2. La Fonction Générique : `fetchGeneric`

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

### 3. Les Deux Niveaux de Filtrage

C'est un point crucial pour comprendre comment l'application optimise les requêtes.

#### Niveau 1 : Filtrage Côté API (Le plus efficace)

-   Pour les filtres que l'API Urbantz comprend (ex: `progress`, `taskId`, `round`, `date`), l'application les ajoute directement dans les paramètres de l'URL (`URLSearchParams`).
-   L'API ne renvoie alors que les données correspondantes. C'est la méthode la plus rapide et la plus économique en termes de transfert de données.

```javascript
// Ajoute le filtre de statut si il est présent
if (status && status !== "all") baseParams.append("progress", status);
```

#### Niveau 2 : Filtrage Côté Application (Quand l'API ne peut pas le faire)

-   Parfois, l'API ne propose pas de filtre pour un certain champ (par exemple, le statut d'une tournée).
-   Dans ce cas, l'application est obligée de :
    1.  Récupérer **toutes** les données pour la période donnée.
    2.  Utiliser la méthode `.filter()` de JavaScript sur le tableau de données pour ne garder que les éléments qui correspondent au critère.

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

Cette méthode est moins efficace car elle nécessite de télécharger plus de données que nécessaire, mais elle est indispensable lorsque l'API a des limitations.

---

En résumé, l'application est un orchestrateur intelligent qui dialogue avec l'API Urbantz. Elle utilise des Actions Serveur pour la sécurité, gère la pagination pour la complétude des données, et combine le filtrage côté API et côté application pour la précision, tout en informant l'utilisateur de chaque étape grâce à un système de logs.
