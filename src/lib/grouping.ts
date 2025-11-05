
import type { Tache, Tournee } from "@/lib/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CarrierRule, DepotRule } from "@/lib/types";

export const DEPOTS_LIST = ["Aix", "Castries", "Rungis", "Antibes", "VLG", "Vitry"];


/**
 * Determines the category of a hub ('entrepot' or 'magasin') based on dynamic rules.
 * @param hubName - The name of the hub.
 * @param depotRules - An array of DepotRule objects from Firestore.
 * @returns 'entrepot' or 'magasin'.
 */
export function getHubCategory(hubName: string | undefined | null, depotRules: DepotRule[] = []): 'entrepot' | 'magasin' {
  if (!hubName) {
    return "magasin"; // Default case
  }
  
  const lowerHubName = hubName.toLowerCase();
  
  const activeRules = depotRules.filter(rule => rule.isActive);

  for (const rule of activeRules) {
    if (rule.prefixes.some(prefix => lowerHubName.startsWith(prefix.toLowerCase()))) {
      return rule.type;
    }
  }

  // Default fallback if no rule matches
  return "magasin";
}


/**
 * Extracts the grouped depot name from a hub name based on dynamic rules.
 * If the hub is classified as a 'magasin' by the rules, it returns "Magasin".
 * @param hubName - The name of the hub.
 * @param depotRules - An array of DepotRule objects from Firestore.
 * @returns The name of the depot (e.g., "Aix", "Vitry") or "Magasin".
 */
export function getDepotFromHub(hubName: string | undefined | null, depotRules: DepotRule[] = []): string {
    if (!hubName) {
        return "Magasin"; // Default case
    }

    const lowerHubName = hubName.toLowerCase();
    const activeRules = depotRules.filter(rule => rule.isActive);

    const matchingRule = activeRules.find(rule => 
        rule.prefixes.some(prefix => lowerHubName.startsWith(prefix.toLowerCase()))
    );

    if (matchingRule) {
        return matchingRule.type === 'entrepot' ? matchingRule.depotName : "Magasin";
    }

    // If no rule matches, it's considered a store by default.
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

    const normalizedDriverName = driverName.toLowerCase().replace(/\s/g, '');
    
    // Sort rules by priority (lower number is higher priority)
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    // 2. Apply dynamic rules
    for (const rule of sortedRules) {
        if (!rule.isActive) continue;

        const normalizedRuleValue = rule.value.toLowerCase().replace(/\s/g, '');
        
        if (rule.type === 'suffix' && normalizedDriverName.endsWith(normalizedRuleValue)) {
            return rule.carrier;
        }
        if (rule.type === 'prefix' && normalizedDriverName.startsWith(normalizedRuleValue)) {
            return rule.carrier;
        }
        if (rule.type === 'contains' && normalizedDriverName.includes(normalizedRuleValue)) {
            return rule.carrier;
        }
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
