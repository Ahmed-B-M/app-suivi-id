
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

/**
 * Determines the depot name from a hub name based on predefined rules.
 * @param hubName - The name of the hub.
 * @returns The name of the depot.
 */
export function getDepotFromHub(hubName: string | undefined | null): string {
  if (!hubName) {
    return "Magasins";
  }

  for (const rule of DEPOT_RULES) {
    for (const prefix of rule.prefixes) {
      if (hubName.toLowerCase().startsWith(prefix.toLowerCase())) {
        return rule.name;
      }
    }
  }

  return hubName.split(" ")[0] || "Magasins";
}


/**
 * Determines the carrier name from a driver's name based on predefined rules.
 * @param driverName - The full name of the driver.
 * @returns The name of the carrier.
 */
export function getCarrierFromDriver(driverName: string | undefined | null): string {
    if (!driverName) {
        return "Inconnu";
    }

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
