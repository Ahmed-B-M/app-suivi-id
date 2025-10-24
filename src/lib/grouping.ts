

import type { Tache, Tournee } from "@/lib/types";

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
  if (hubName.toLowerCase().startsWith('f') || hubName.toLowerCase().startsWith('carrefour')) {
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
  if (hubName.toLowerCase().startsWith('f') || hubName.toLowerCase().startsWith('carrefour')) {
    return 'Magasin';
  }

  return hubName.split(" ")[0] || "Autre";
}


/**
 * Determines the carrier name from a driver's name or a round object.
 * @param driverNameOrRound - The full name of the driver or a Tournee object.
 * @returns The name of the carrier.
 */
export function getCarrierFromDriver(driverNameOrRound: string | Tournee | undefined | null): string {
    let driverName: string | undefined | null = null;

    // Check for carrierOverride first
    if (driverNameOrRound && typeof driverNameOrRound === 'object' && 'carrierOverride' in driverNameOrRound && driverNameOrRound.carrierOverride) {
        return driverNameOrRound.carrierOverride;
    }

    if (typeof driverNameOrRound === 'string') {
        driverName = driverNameOrRound;
    } else if (driverNameOrRound && typeof driverNameOrRound === 'object' && 'driver' in driverNameOrRound) {
        driverName = `${driverNameOrRound.driver?.firstName || ''} ${driverNameOrRound.driver?.lastName || ''}`.trim();
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
    const driver = (driverNameOrRound && typeof driverNameOrRound === 'object' && 'driver' in driverNameOrRound) ? driverNameOrRound.driver : null;
    const lastName = driver?.lastName;
    if (lastName) {
      const separatorIndex = lastName.indexOf('-');
      if (separatorIndex !== -1 && separatorIndex < lastName.length - 1) {
        return lastName.substring(separatorIndex + 1).trim();
      }
    }

    return "Inconnu";
}

export function getDriverFullName(item: Tache | Tournee): string | undefined {
    if ('livreur' in item && item.livreur) {
        return `${item.livreur.prenom || ''} ${item.livreur.nom || ''}`.trim();
    }
    if ('driver' in item && item.driver) {
        return `${item.driver.firstName || ''} ${item.driver.lastName || ''}`.trim();
    }
    return undefined;
}
