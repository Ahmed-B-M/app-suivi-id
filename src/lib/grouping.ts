
import type { Tache, Tournee } from "@/lib/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CarrierRule } from "@/lib/types";

export interface Depot {
  name: string;
  hubs: string[];
}

// Règle métier : Les noms de dépôts et les préfixes correspondants
export const DEPOT_RULES: { name: string; prefixes: string[] }[] = [
  { name: "Aix", prefixes: ["Aix"] },
  { name: "Castries", prefixes: ["Cast"] },
  { name: "Rungis", prefixes: ["Rung"] },
  { name: "Antibes", prefixes: ["Solo"] },
  { name: "VLG", prefixes: ["Villeneuve", "Vill"] },
  { name: "Vitry", prefixes: ["Vitr"] },
];

export const DEPOTS_LIST = DEPOT_RULES.map(rule => rule.name);

// Règle métier : Les préfixes qui identifient un hub comme étant un magasin
const STORE_PREFIXES = ['f', 'carrefour', 'lex'];


/**
 * Détermine la catégorie d'un hub ('entrepot' ou 'magasin') en se basant sur les règles métier.
 * @param hubName - Le nom du hub.
 * @returns 'entrepot' ou 'magasin'.
 */
export function getHubCategory(hubName: string | undefined | null): 'entrepot' | 'magasin' {
  if (!hubName) {
    return "magasin";
  }
  
  const lowerHubName = hubName.toLowerCase();
  
  // Si le nom du hub correspond à une règle de dépôt, c'est un entrepôt.
  for (const rule of DEPOT_RULES) {
    if (rule.prefixes.some(prefix => lowerHubName.startsWith(prefix.toLowerCase()))) {
      return "entrepot";
    }
  }

  // Si le nom du hub correspond à une règle de magasin, c'est un magasin.
  if (STORE_PREFIXES.some(prefix => lowerHubName.startsWith(prefix))) {
    return 'magasin';
  }

  // Règle par défaut : si aucune règle de dépôt ne correspond, c'est un magasin.
  return "magasin";
}


/**
 * Extrait le nom du dépôt groupé à partir d'un nom de hub.
 * Si le hub est un magasin, il renvoie "Magasin".
 * @param hubName - Le nom du hub.
 * @returns Le nom du dépôt (ex: "Aix", "Vitry") ou "Magasin".
 */
export function getDepotFromHub(hubName: string | undefined | null): string {
  if (!hubName) {
    return "Magasin"; // Cas par défaut
  }

  const lowerHubName = hubName.toLowerCase();

  for (const rule of DEPOT_RULES) {
    if (rule.prefixes.some(prefix => lowerHubName.startsWith(prefix.toLowerCase()))) {
      return rule.name;
    }
  }

  // Si aucune règle de regroupement de dépôt ne correspond, il s'agit d'un magasin.
  return "Magasin";
}


/**
 * Determines the carrier name from a driver's name or a round object, based on dynamic rules.
 * @param driverNameOrRound - The full name of the driver or a Tache/Tournee object.
 * @param rules - An array of CarrierRule objects from Firestore.
 * @returns The name of the carrier.
 */
export function getCarrierFromDriver(
    driverNameOrRound: string | Tache | Tournee | undefined | null,
    rules: CarrierRule[] = []
): string {
    // 1. Check for a manual override on the round first
    if (driverNameOrRound && typeof driverNameOrRound === 'object' && 'carrierOverride' in driverNameOrRound && driverNameOrRound.carrierOverride) {
        return driverNameOrRound.carrierOverride;
    }

    const driverName = getDriverFullName(driverNameOrRound);
    
    if (!driverName || driverName === "Inconnu") {
        return "Inconnu";
    }

    const lowerCaseName = driverName.toLowerCase();
    
    // Sort rules by priority (lower number is higher priority)
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    // 2. Apply dynamic rules
    for (const rule of sortedRules) {
        if (!rule.isActive) continue;

        const ruleValue = rule.value.toLowerCase();
        
        if (rule.type === 'suffix' && lowerCaseName.endsWith(ruleValue)) {
            return rule.carrier;
        }
        if (rule.type === 'prefix' && lowerCaseName.startsWith(ruleValue)) {
            return rule.carrier;
        }
        if (rule.type === 'contains' && lowerCaseName.includes(ruleValue)) {
            return rule.carrier;
        }
    }

    // 3. Fallback to old logic if no rules match (optional, can be removed)
    if (lowerCaseName.includes("id log")) return "ID LOG";
    if (lowerCaseName.startsWith("stt")) {
        const parts = driverName.split(" ");
        return parts.length > 1 ? parts[1] : "STT";
    }

    return "Inconnu";
}

export function getDriverFullName(item: string | Tache | Tournee | undefined | null): string {
    if (!item) return "Inconnu";

    // If it's just a string, return it.
    if (typeof item === 'string') {
        return item;
    }

    // This handles the structure from Tache or Tournee where driver info is nested
    const driverObject = 'driver' in item ? item.driver : 'livreur' in item ? item.livreur : undefined;
    if (driverObject) {
         const firstName = driverObject.prenom || driverObject.firstName;
         const lastName = driverObject.nom || driverObject.lastName;
         return [firstName, lastName].filter(Boolean).join(' ').trim() || "Inconnu";
    }
    
    // Fallback for flat structure if driver/livreur objects aren't present
    if ('prenomChauffeur' in item || 'nomChauffeur' in item) {
       return [item.prenomChauffeur, item.nomChauffeur].filter(Boolean).join(' ').trim() || "Inconnu";
    }

    return "Inconnu";
}


export function groupTasksByDay(tasks: Tache[]) {
  if (!tasks) return {};
  return tasks.reduce((acc, task) => {
    const date = task.date ? format(new Date(task.date as string), 'PPP', { locale: fr }) : 'Sans Date';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Tache[]>);
}

export function groupTasksByMonth(tasks: Tache[]) {
    if (!tasks) return {};
    return tasks.reduce((acc, task) => {
        const date = task.date ? format(new Date(task.date as string), 'LLLL yyyy', { locale: fr }) : 'Sans Date';
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(task);
        return acc;
    }, {} as Record<string, Tache[]>);
}
