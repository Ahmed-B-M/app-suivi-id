
import type { QualityData } from "@/components/app/quality-dashboard";
import type { AlertData } from "@/components/app/alert-recurrence-table";
import type { CategorizedComment } from "@/hooks/use-pending-comments";
import type { ProcessedNpsVerbatim } from "@/lib/types";

// --- Helper Functions ---

function formatValue(value: number | null | undefined, unit: string = '', decimals: number = 1): string {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(decimals)}${unit}`;
}

function getRatingColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return '#F87171'; // red-400
    if (value >= 4.8) return '#16A34A'; // green-600
    if (value >= 4.5) return '#F59E0B'; // amber-500
    return '#F87171'; // red-400
}

function getNpsColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return '#F87171'; // red-400
    if (value >= 65) return '#16A34A'; // green-600
    if (value >= 30) return '#F59E0B'; // amber-500
    return '#F87171'; // red-400
}

function getPunctualityColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return '#F87171'; // red-400
    if (value >= 95) return '#16A34A'; // green-600
    if (value >= 90) return '#F59E0B'; // amber-500
    return '#F87171'; // red-400
}

function getForcedMetricColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return '#F87171'; // red-400
    if (value <= 5) return '#16A34A'; // green-600
    if (value <= 10) return '#F59E0B'; // amber-500
    return '#F87171'; // red-400
}


// --- HTML Generation ---

function createHtmlHeader(title: string, subtitle: string): string {
    return `
        <h1 style="color: #30475E; font-family: Arial, sans-serif; font-size: 24px;">${title}</h1>
        <p style="color: #4A5568; font-family: Arial, sans-serif; font-size: 14px;">${subtitle}</p>
    `;
}

function createSectionTitle(title: string): string {
    return `<h2 style="color: #30475E; font-family: Arial, sans-serif; border-bottom: 2px solid #F0F0F0; padding-bottom: 5px; margin-top: 25px;">${title}</h2>`;
}

function createKpiTable(data: { label: string; value: string; color: string }[]): string {
    let rows = '';
    data.forEach(item => {
        rows += `
            <tr>
                <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px;">${item.label}</td>
                <td style="padding: 8px 0; font-family: Arial, sans-serif; font-size: 14px; text-align: right; font-weight: bold; color: ${item.color};">${item.value}</td>
            </tr>
        `;
    });
    return `<table style="width: 50%; border-collapse: collapse;">${rows}</table>`;
}

function createCategoryTable(title: string, data: { name: string; count: number; percentage: number }[]): string {
    if (data.length === 0) return `<p style="font-family: Arial, sans-serif; color: #718096;">${title}: Aucune donnée.</p>`;
    
    let rows = '';
    data.forEach(item => {
        rows += `
            <tr>
                <td style="padding: 6px 4px; font-family: Arial, sans-serif; font-size: 13px;">${item.name}</td>
                <td style="padding: 6px 4px; font-family: Arial, sans-serif; font-size: 13px; text-align: right;">${item.count}</td>
                <td style="padding: 6px 4px; font-family: Arial, sans-serif; font-size: 13px; text-align: right; font-weight: bold;">${item.percentage.toFixed(1)}%</td>
            </tr>
        `;
    });

    return `
        <h3 style="font-family: Arial, sans-serif; font-weight: 600; color: #4A5568;">${title}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr>
                    <th style="padding: 8px 4px; text-align: left; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Catégorie</th>
                    <th style="padding: 8px 4px; text-align: right; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Nombre</th>
                    <th style="padding: 8px 4px; text-align: right; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Pourcentage</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// --- Main Email Generation Function ---

export function generateQualityEmailBody(
    qualityData: QualityData,
    alertData: AlertData[],
    allComments: CategorizedComment[],
    processedVerbatims: ProcessedNpsVerbatim[],
    dateRange: { from: Date, to: Date }
): string {
    const formattedDateRange = `${new Date(dateRange.from).toLocaleDateString('fr-FR')} au ${new Date(dateRange.to).toLocaleDateString('fr-FR')}`;

    let depotSections = '';
    const depotAlerts = new Map(alertData.map(depot => [depot.name, depot]));

    for (const depot of qualityData.details) {
        // --- Depot KPIs ---
        const depotKpis = createKpiTable([
            { label: 'Note Moyenne', value: formatValue(depot.averageRating, '', 2), color: getRatingColor(depot.averageRating) },
            { label: 'Score NPS', value: formatValue(depot.npsScore, '', 1), color: getNpsColor(depot.npsScore) },
            { label: 'Ponctualité', value: formatValue(depot.punctualityRate, '%', 1), color: getPunctualityColor(depot.punctualityRate) },
            { label: 'SCANBAC', value: formatValue(depot.scanbacRate, '%', 1), color: getPunctualityColor(depot.scanbacRate) },
            { label: 'Forçage Adresse', value: formatValue(depot.forcedAddressRate, '%', 1), color: getForcedMetricColor(depot.forcedAddressRate) },
            { label: 'Forçage Sans Contact', value: formatValue(depot.forcedContactlessRate, '%', 1), color: getForcedMetricColor(depot.forcedContactlessRate) },
            { label: 'Retard > 1h', value: formatValue(depot.lateOver1hRate, '%', 1), color: getForcedMetricColor(depot.lateOver1hRate) }
        ]);

        // --- Categories ---
        const depotComments = allComments.filter(c => depot.carriers.some(carrier => carrier.drivers.some(driver => driver.name === c.driverName)));
        const commentsByCategory: Record<string, number> = {};
        depotComments.forEach(c => {
            commentsByCategory[c.category] = (commentsByCategory[c.category] || 0) + 1;
        });
        const commentsCategoryData = Object.entries(commentsByCategory).sort((a,b) => b[1] - a[1]).map(([name, count]) => ({
            name, count, percentage: depotComments.length > 0 ? (count / depotComments.length) * 100 : 0
        }));

        const depotVerbatims = processedVerbatims.filter(v => v.depot === depot.name);
        const verbatimsByCategory: Record<string, number> = {};
        depotVerbatims.forEach(v => {
            verbatimsByCategory[v.category] = (verbatimsByCategory[v.category] || 0) + 1;
        });
        const verbatimsCategoryData = Object.entries(verbatimsByCategory).sort((a,b) => b[1] - a[1]).map(([name, count]) => ({
            name, count, percentage: depotVerbatims.length > 0 ? (count / depotVerbatims.length) * 100 : 0
        }));

        // --- Recurrence Table ---
        const currentDepotAlerts = depotAlerts.get(depot.name);
        let recurrenceRows = '';
        if (currentDepotAlerts) {
            for (const carrier of currentDepotAlerts.carriers) {
                 for (const driver of carrier.drivers) {
                     if (driver.alertCount > 0) {
                        const driverStats = depot.carriers.flatMap(c => c.drivers).find(d => d.name === driver.name);
                        const categories = Object.entries(driver.commentCategories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => `${count}x ${cat}`).join(', ');
                        recurrenceRows += `
                            <tr>
                                <td style="padding: 10px 5px; border-bottom: 1px solid #E2E8F0; font-family: Arial, sans-serif; font-size: 13px;">
                                    <strong>${driver.name}</strong><br><span style="color: #718096;">${carrier.name}</span>
                                </td>
                                <td style="padding: 10px 5px; border-bottom: 1px solid #E2E8F0; font-family: Arial, sans-serif; font-size: 13px; text-align: center;">${formatValue(driver.averageRating, '', 2)}</td>
                                <td style="padding: 10px 5px; border-bottom: 1px solid #E2E8F0; font-family: Arial, sans-serif; font-size: 13px; text-align: center;">${formatValue(driverStats?.npsScore, '', 1)}</td>
                                <td style="padding: 10px 5px; border-bottom: 1px solid #E2E8F0; font-family: Arial, sans-serif; font-size: 13px; text-align: center;">${formatValue(driverStats?.punctualityRate, '%', 1)}</td>
                                <td style="padding: 10px 5px; border-bottom: 1px solid #E2E8F0; font-family: Arial, sans-serif; font-size: 13px; text-align: center; color: #C53030; font-weight: bold;">${driver.alertCount} / ${driver.totalRatings}</td>
                                <td style="padding: 10px 5px; border-bottom: 1px solid #E2E8F0; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">${categories}</td>
                            </tr>
                        `;
                     }
                 }
            }
        }
         if (recurrenceRows === '') {
            recurrenceRows = `<tr><td colspan="6" style="padding: 15px; text-align: center; color: #718096; font-family: Arial, sans-serif;">Aucune récurrence de mauvaise note pour ce dépôt.</td></tr>`;
        }

        depotSections += `
            <div style="background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <h2 style="color: #2D3748; font-family: Arial, sans-serif; font-size: 20px; margin: 0 0 20px 0;">Dépôt: ${depot.name.toUpperCase()}</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 48%; vertical-align: top; padding-right: 20px;">
                             <h3 style="font-family: Arial, sans-serif; font-weight: 600; color: #4A5568;">Indicateurs Clés</h3>
                             ${depotKpis}
                        </td>
                        <td style="width: 52%; vertical-align: top;">
                            ${createCategoryTable(`Commentaires Négatifs (${depotComments.length})`, commentsCategoryData)}
                            <br/>
                            ${createCategoryTable(`Verbatims Détracteurs (${depotVerbatims.length})`, verbatimsCategoryData)}
                        </td>
                    </tr>
                </table>

                <h3 style="font-family: Arial, sans-serif; font-weight: 600; color: #4A5568; margin-top: 25px;">Récurrence des Mauvaises Notes (Note &lt; 4)</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                         <tr>
                            <th style="padding: 8px 5px; text-align: left; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Livreur</th>
                            <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Note Moy.</th>
                            <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">NPS</th>
                            <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Ponctualité</th>
                            <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Alertes / Total</th>
                            <th style="padding: 8px 5px; text-align: left; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 12px; color: #4A5568;">Catégories associées</th>
                        </tr>
                    </thead>
                    <tbody>${recurrenceRows}</tbody>
                </table>
            </div>
        `;
    }

    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Rapport Qualité</title>
        </head>
        <body style="background-color: #F7FAFC; margin: 0; padding: 20px;">
            <div style="max-width: 800px; margin: auto; background-color: transparent;">
                ${createHtmlHeader('Rapport Qualité', `Période du ${formattedDateRange}`)}
                ${depotSections}
                 <p style="text-align: center; color: #A0AEC0; font-size: 12px; font-family: Arial, sans-serif;">Généré par ID-pilote</p>
            </div>
        </body>
        </html>
    `;

    return htmlBody;
}
