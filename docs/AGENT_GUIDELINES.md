# Directives pour l'Agent de Développement

Ce document sert de rappel des règles critiques à suivre lors du développement de cette application.

## 1. Utilisation des Identifiants de Tâche (`taskId` vs `id`)

**C'est une règle impérative.**

-   **`taskId`** : C'est l'identifiant **métier** de la tâche. Il provient de l'API Urbantz et est celui que l'utilisateur final reconnaît. Il doit être utilisé dans **toutes les interfaces utilisateur, les filtres, et comme clé principale visible** pour représenter une tâche.

-   **`id`** (ou `_id`): C'est l'identifiant **technique** interne utilisé par Firestore comme clé de document. Son utilisation doit être strictement limitée aux opérations de base de données où un identifiant de document unique est requis. **Ne jamais l'afficher à l'utilisateur comme identifiant de tâche principal.**

**Règle d'or : Quand il s'agit d'une tâche, toujours penser et utiliser `taskId` en premier.**
