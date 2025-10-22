
import type { QualityData } from "@/components/app/quality-dashboard";
import type { AlertData } from "@/components/app/alert-recurrence-table";
import type { CategorizedComment } from "@/hooks/use-pending-comments";
import type { ProcessedNpsVerbatim } from "@/lib/types";

function formatValue(value: number | null | undefined, unit: string = '', decimals: number = 1): string {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(decimals)}${unit}`;
}

const LINE_SEPARATOR = "\n" + "-".repeat(70) + "\n";

export function generateQualityEmailBody(
    qualityData: QualityData,
    alertData: AlertData[],
    allComments: CategorizedComment[],
    processedVerbatims: ProcessedNpsVerbatim[],
    dateRange: { from: Date, to: Date }
): string {

    const formattedDateRange = `${new Date(dateRange.from).toLocaleDateString('fr-FR')} au ${new Date(dateRange.to).toLocaleDateString('fr-FR')}`;
    let body = `Bonjour,\n\nVoici le rapport qualité pour la période du ${formattedDateRange} :\n`;

    const depotAlerts = new Map(alertData.map(depot => [depot.name, depot]));

    for (const depot of qualityData.details) {
        body += LINE_SEPARATOR;
        body += `DEPOT : ${depot.name.toUpperCase()}\n`;
        body += LINE_SEPARATOR;

        // Indicateurs Dépôt
        body += "\nI. INDICATEURS CLÉS (Dépôt)\n";
        body += `  - Note Moyenne          : ${formatValue(depot.averageRating, '', 2)}\n`;
        body += `  - Score NPS             : ${formatValue(depot.npsScore)}\n`;
        body += `  - Ponctualité           : ${formatValue(depot.punctualityRate, '%')}\n`;
        body += `  - Taux de SCANBAC       : ${formatValue(depot.scanbacRate, '%')}\n`;
        body += `  - Taux Sur Place Forcé  : ${formatValue(depot.forcedAddressRate, '%')}\n`;
        body += `  - Taux Cmd. Forcées     : ${formatValue(depot.forcedContactlessRate, '%')}\n`;
        body += `  - Taux Retard > 1h      : ${formatValue(depot.lateOver1hRate, '%')}\n\n`;
        
        // Catégories Commentaires
        const depotComments = allComments.filter(c => {
             const depotName = depot.carriers.flatMap(c => c.drivers).find(d => d.name === c.driverName) 
                ? depot.name
                : null;
            return depotName === depot.name;
        });

        if (depotComments.length > 0) {
            body += `II. RÉPARTITION DES COMMENTAIRES NÉGATIFS (${depotComments.length} au total)\n`;
            const commentsByCategory: Record<string, number> = {};
            depotComments.forEach(c => {
                commentsByCategory[c.category] = (commentsByCategory[c.category] || 0) + 1;
            });
            Object.entries(commentsByCategory)
                .sort((a,b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    const percentage = (count / depotComments.length) * 100;
                    body += `  - ${category.padEnd(25, ' ')}: ${count} (${percentage.toFixed(1)}%)\n`;
                });
            body += "\n";
        }


        // Catégories Verbatims
        const depotVerbatims = processedVerbatims.filter(v => v.depot === depot.name);
        if (depotVerbatims.length > 0) {
             body += `III. RÉPARTITION DES VERBATIMS DÉTRACTEURS (${depotVerbatims.length} au total)\n`;
             const verbatimsByCategory: Record<string, number> = {};
             depotVerbatims.forEach(v => {
                verbatimsByCategory[v.category] = (verbatimsByCategory[v.category] || 0) + 1;
             });
             Object.entries(verbatimsByCategory)
                .sort((a,b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    const percentage = (count / depotVerbatims.length) * 100;
                    body += `  - ${category.padEnd(25, ' ')}: ${count} (${percentage.toFixed(1)}%)\n`;
                });
             body += "\n";
        }

        // Indicateurs Transporteurs
        body += `IV. PERFORMANCE PAR TRANSPORTEUR\n`;
        for (const carrier of depot.carriers) {
            body += `  Transporteur : ${carrier.name}\n`;
            body += `    - Indicateurs      : Note Moy. ${formatValue(carrier.averageRating, '', 2)}, NPS ${formatValue(carrier.npsScore)}, Ponctualité ${formatValue(carrier.punctualityRate, '%')}\n`;
            body += `    - SCANBAC/Forçages : SCANBAC ${formatValue(carrier.scanbacRate, '%')}, Adr. Forcé ${formatValue(carrier.forcedAddressRate, '%')}, Cmd. Forcée ${formatValue(carrier.forcedContactlessRate, '%')}\n\n`;
        }
        
        // Récurrence Mauvaises Notes
        const currentDepotAlerts = depotAlerts.get(depot.name);
        if (currentDepotAlerts && currentDepotAlerts.carriers.some(c => c.drivers.some(d => d.alertCount > 0))) {
            body += `V. RÉCURRENCE DES MAUVAISES NOTES (Livreurs avec au moins 1 note < 4)\n\n`;
            
            for (const carrier of currentDepotAlerts.carriers) {
                 for (const driver of carrier.drivers) {
                     if (driver.alertCount > 0) {
                        const driverStats = depot.carriers.flatMap(c => c.drivers).find(d => d.name === driver.name);
                        body += `  * LIVREUR : ${driver.name} (${carrier.name}) - ${driver.alertCount} mauvaise(s) note(s) sur ${driver.totalRatings} au total\n`;
                        body += `    - Performance  : Note Moy. ${formatValue(driver.averageRating, '', 2)}, NPS ${formatValue(driverStats?.npsScore)}, Ponctualité ${formatValue(driverStats?.punctualityRate, '%')}\n`;
                        const categories = Object.entries(driver.commentCategories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => `${count}x ${cat}`).join(', ');
                        body += `    - Catégories   : ${categories}\n\n`;
                     }
                 }
            }
        }
    }

    body += "\nCordialement,\nVotre Outil de Pilotage";

    return body;
}
