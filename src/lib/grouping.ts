
import type { Tache, Tournee } from "@/lib/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface Depot {
  name: string;
  hubs: string[];
}

export const DEPOT_RULES: { name: string; prefixes: string[] }[] = [
  { name: "Aix", prefixes: ["Aix"] },
  { name: "Castries", prefixes: ["Cast"] },
  { name: "Rungis", prefixes: ["Rung"] },
  { name: "Antibes", prefixes: ["Solo"] },
  { name: "VLG", prefixes: ["Villeneuve", "Vill"] },
  { name: "Vitry", prefixes: ["Vitr"] },
];

export const DEPOTS_LIST = DEPOT_RULES.map(rule => rule.name);

/**
 * Determines if a hub is a main depot.
 * @param hubName - The name of the hub.
 * @returns True if the hub is a depot, false otherwise.
 */
function isDepot(hubName: string): boolean {
    if (!hubName) return false;
    return DEPOT_RULES.some(rule => 
        rule.prefixes.some(prefix => 
            hubName.toLowerCase().startsWith(prefix.toLowerCase())
        )
    );
}

/**
 * Determines the category ('entrepot' or 'magasin') of a hub.
 * @param hubName - The name of the hub.
 * @returns 'entrepot' or 'magasin'.
 */
export function getHubCategory(hubName: string | undefined | null): 'entrepot' | 'magasin' {
  if (!hubName) {
    return "magasin";
  }
  
  if (isDepot(hubName)) {
    return "entrepot";
  }

  // Specific rules for stores
  if (hubName.toLowerCase().startsWith('f') || hubName.toLowerCase().startsWith('carrefour') || hubName.toLowerCase().startsWith('lex')) {
    return 'magasin';
  }

  // By default, if it's not a depot, it's a store
  return "magasin";
}


/**
 * Determines the depot name from a hub name based on predefined rules.
 * @param hubName - The name of the hub.
 * @returns The name of the depot or a classification.
 */
export function getDepotFromHub(hubName: string | undefined | null): string {
  if (!hubName) {
    return "Magasin";
  }

  for (const rule of DEPOT_RULES) {
    for (const prefix of rule.prefixes) {
      if (hubName.toLowerCase().startsWith(prefix.toLowerCase())) {
        return rule.name;
      }
    }
  }

  // Specific rules for stores
  if (hubName.toLowerCase().startsWith('f') || hubName.toLowerCase().startsWith('carrefour') || hubName.toLowerCase().startsWith('lex')) {
    return 'Magasin';
  }

  return hubName.split(" ")[0] || "Autre";
}


/**
 * Determines the carrier name from a driver's name or a round object.
 * @param driverNameOrRound - The full name of the driver or a Tournee object.
 * @returns The name of the carrier.
 */
export function getCarrierFromDriver(driverNameOrRound: string | Tache | Tournee | undefined | null): string {
    let driverName: string | undefined | null = null;

    // Check for carrierOverride first
    if (driverNameOrRound && typeof driverNameOrRound === 'object' && 'carrierOverride' in driverNameOrRound && driverNameOrRound.carrierOverride) {
        return driverNameOrRound.carrierOverride;
    }

    if (typeof driverNameOrRound === 'string') {
        driverName = driverNameOrRound;
    } else if (driverNameOrRound && typeof driverNameOrRound === 'object') {
       driverName = getDriverFullName(driverNameOrRound);
    }
    
    if (!driverName) {
        return "Inconnu";
    }

    // Use the logic from the existing getCarrierFromDriver function
    const lowerCaseName = driverName.toLowerCase();

    if (lowerCaseName.includes("id log")) {
        return "ID LOG";
    }

    if (lowerCaseName.startsWith("stt")) {
        const parts = driverName.split(" ");
        return parts.length > 1 ? parts[1] : "STT";
    }

    const lastChar = driverName.slice(-1);
    const firstChar = driverName.charAt(0);

    if (firstChar === '4' || lastChar === '4') return "YEL'IN";
    if (firstChar === '1' || lastChar === '1') return "TLN";
    if (firstChar === '9' || lastChar === '9') return "MH";
    
    if (lastChar === '3') return "BC one";
    if (lastChar === '0') return "DUB";
    if (lastChar === '8') return "GPC";
    if (lastChar === '7') return "GPL";
    if (lastChar === '6') return "RK";
    if (lastChar === '2') return "Express";
    if (lastChar === '5') return "MLG";


    // New logic based on suffix in lastName
    const driver = (driverNameOrRound && typeof driverNameOrRound === 'object' && 'driver' in driverNameOrRound) ? (driverNameOrRound as Tournee).driver : (driverNameOrRound as Tache).livreur;
    const lastName = driver?.nom || driver?.lastName;
    if (lastName) {
      const separatorIndex = lastName.indexOf('-');
      if (separatorIndex !== -1 && separatorIndex < lastName.length - 1) {
        return lastName.substring(separatorIndex + 1).trim();
      }
    }

    return "Inconnu";
}

export function getDriverFullName(item: Tache | Tournee | any): string | undefined {
    let firstName: string | undefined = '';
    let lastName: string | undefined = '';

    if (item) {
        if (item.driver) { // For Tournee
            firstName = item.driver.firstName;
            lastName = item.driver.lastName;
        } else if (item.livreur) { // For Tache
            firstName = item.livreur.prenom;
            lastName = item.livreur.nom;
        } else if (item.prenomChauffeur || item.nomChauffeur) { // Fallback for flat structure
            firstName = item.prenomChauffeur;
            lastName = item.nomChauffeur;
        }
    }

    if (firstName || lastName) {
        return `${firstName || ''} ${lastName || ''}`.trim();
    }

    return undefined;
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
