# Directives pour l'Agent de Développement

Ce document sert de rappel des règles critiques à suivre lors du développement de cette application.

## 1. Contexte Métier Général

-   **Acteurs :**
    -   **ID Logistics** (nous) : L'entreprise qui effectue les livraisons.
    -   **Carrefour** : Le client donneur d'ordre.
    -   **STEF** : Le partenaire qui prépare les commandes.
-   **Outil :** Les livraisons sont gérées via l'API **Urbantz**.

## 2. Distinction Entrepôt vs. Magasin

C'est une règle fondamentale pour la structure des données et la logique de filtrage.

-   **Entrepôt (ou Dépôt)** :
    -   Représente un **lieu physique unique** (ex: Vitry, Aix, Rungis).
    -   Dans Urbantz, il est représenté par **plusieurs `nomHub`** qui partagent un préfixe commun (ex: "Vitry Matin", "Vitry AM").
    -   Le regroupement se fait via les règles de préfixes définies dans `src/lib/grouping.ts`.

-   **Magasin** :
    -   Représente un **lieu unique et indépendant**.
    -   Chaque `nomHub` est une entité distincte.
    -   Ils sont identifiés par des préfixes spécifiques (ex: "f...", "carrefour...", "lex...") pour les différencier des entrepôts.

**Règle d'or : Toujours appliquer cette distinction lors du filtrage, du regroupement et de l'affichage des données.**

## 3. Liaison Arrêt (Stop) et Tâche (Task)

**Ceci est une règle de jointure de données impérative.**

Lors de l'enrichissement des données, pour trouver l'arrêt (`stop`) correspondant à une tâche (`task`) au sein d'une tournée (`round`), la comparaison doit **obligatoirement** se faire entre les deux champs suivants :

-   `stop.taskId` (provenant de la liste des arrêts de la tournée)
-   `rawTask.taskId` (provenant de la liste des tâches)

**Ne JAMAIS utiliser l'identifiant de document (`rawTask.id` ou `rawTask._id`) pour cette jointure**, car il ne correspond pas à l'identifiant métier utilisé dans la structure des arrêts.

**Exemple de logique correcte :**
`round.stops.find(stop => stop.taskId === rawTask.taskId)`

## 4. Utilisation des Identifiants de Tâche (`taskId` vs `id`)

**C'est une règle impérative.**

-   **`taskId`** : C'est l'identifiant **métier** de la tâche. Il provient de l'API Urbantz et est celui que l'utilisateur final reconnaît. Il doit être utilisé dans **toutes les interfaces utilisateur, les filtres, et comme clé principale visible** pour représenter une tâche.

-   **`id`** (ou `_id`): C'est l'identifiant **technique** interne utilisé par Firestore comme clé de document. Son utilisation doit être strictement limitée aux opérations de base de données où un identifiant de document unique est requis. **Ne jamais l'afficher à l'utilisateur comme identifiant de tâche principal.**

**Règle d'or : Quand il s'agit d'une tâche, toujours penser et utiliser `taskId` en premier.**

## 5. Utilisation du Nom du Chauffeur (`nomCompletChauffeur`)

**Source de vérité unique.**

-   **`nomCompletChauffeur`** : Ce champ est la source de vérité pour le nom complet du chauffeur. Il est calculé une seule fois lors de la transformation des données via la fonction `getDriverFullName`.

-   **Toujours utiliser ce champ** pour afficher le nom du chauffeur dans les interfaces, effectuer des regroupements, ou appliquer des règles (comme la déduction du transporteur). Ne pas tenter de reconstruire le nom à partir des prénoms et noms séparés.

**Règle d'or : Pour toute information liée au nom du chauffeur, utiliser le champ `nomCompletChauffeur` présent dans les objets `Tache` et `Tournee`.**

## 6. Nom de champ correct pour le commentaire livreur

-   Le champ correct pour extraire le commentaire du client sur le livreur depuis l'API est `commentaireLivr` et non `commentaireLivreur`. Toujours utiliser `rawTask.metadata?.commentaireLivr` lors de la transformation des données.
