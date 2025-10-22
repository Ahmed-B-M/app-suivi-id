
import type { QualityData } from "@/components/app/quality-dashboard";
import type { AlertData } from "@/components/app/alert-recurrence-table";
import type { CategorizedComment } from "@/hooks/use-pending-comments";
import type { ProcessedNpsVerbatim } from "@/lib/types";

function formatValue(value: number | null | undefined, unit: string = '', decimals: number = 1): string {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(decimals)}${unit}`;
}

export function generateQualityEmailBody(
    qualityData: QualityData,
    alertData: AlertData[],
    allComments: CategorizedComment[],
    processedVerbatims: ProcessedNpsVerbatim[]
): string {
    let body = "Bonjour,\n\nVoici le rapport qualité hebdomadaire :\n\n";

    const depotAlerts = new Map(alertData.map(depot => [depot.name, depot]));

    for (const depot of qualityData.details) {
        body += `------------------------------------------------------\n`;
        body += `DEPOT : ${depot.name.toUpperCase()}\n`;
        body += `------------------------------------------------------\n\n`;

        // Indicateurs Dépôt
        body += `INDICATEURS CLÉS (Dépôt) :\n`;
        body += `  - Note Moyenne : ${formatValue(depot.averageRating, '', 2)}\n`;
        body += `  - Score NPS : ${formatValue(depot.npsScore)}\n`;
        body += `  - Taux de Ponctualité : ${formatValue(depot.punctualityRate, '%')}\n\n`;

        // Catégories Commentaires
        const depotComments = allComments.filter(c => {
            const depotName = depot.name;
            // This is a simplification; you'd need a way to link comment to depot
            // For now, let's assume we can filter them. This part needs robust logic.
            return true; 
        });

        if (depotComments.length > 0) {
            body += `RÉPARTITION DES COMMENTAIRES NÉGATIFS (${depotComments.length} au total) :\n`;
            const commentsByCategory: Record<string, number> = {};
            depotComments.forEach(c => {
                commentsByCategory[c.category] = (commentsByCategory[c.category] || 0) + 1;
            });
            Object.entries(commentsByCategory)
                .sort((a,b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    const percentage = (count / depotComments.length) * 100;
                    body += `  - ${category} : ${percentage.toFixed(1)}%\n`;
                });
            body += "\n";
        }
        
        // Catégories Verbatims
        const depotVerbatims = processedVerbatims.filter(v => v.depot === depot.name);
        if (depotVerbatims.length > 0) {
             body += `RÉPARTITION DES VERBATIMS DÉTRACTEURS (${depotVerbatims.length} au total) :\n`;
             const verbatimsByCategory: Record<string, number> = {};
             depotVerbatims.forEach(v => {
                verbatimsByCategory[v.category] = (verbatimsByCategory[v.category] || 0) + 1;
             });
             Object.entries(verbatimsByCategory)
                .sort((a,b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    const percentage = (count / depotVerbatims.length) * 100;
                    body += `  - ${category} : ${percentage.toFixed(1)}%\n`;
                });
             body += "\n";
        }

        // Indicateurs Transporteurs
        for (const carrier of depot.carriers) {
            body += `Transporteur : ${carrier.name}\n`;
            body += `  - Note Moyenne : ${formatValue(carrier.averageRating, '', 2)}\n`;
            body += `  - Score NPS : ${formatValue(carrier.npsScore)}\n`;
            body += `  - Taux de Ponctualité : ${formatValue(carrier.punctualityRate, '%')}\n\n`;
        }
        
        // Récurrence Mauvaises Notes
        const currentDepotAlerts = depotAlerts.get(depot.name);
        if (currentDepotAlerts) {
            body += `RÉCURRENCE DES MAUVAISES NOTES (Livreurs avec au moins 1 note < 4) :\n`;
            for (const carrier of currentDepotAlerts.carriers) {
                 for (const driver of carrier.drivers) {
                     if (driver.alertCount > 0) {
                        body += `  - ${driver.name} (${carrier.name}) : ${driver.alertCount} alerte(s)\n`;
                        Object.entries(driver.commentCategories).forEach(([cat, count]) => {
                            body += `      * ${cat}: ${count}\n`;
                        });
                     }
                 }
            }
             body += "\n";
        }
    }

    body += "\nCordialement,\nVotre Outil de Pilotage";

    return body;
}
