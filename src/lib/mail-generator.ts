
import type { QualityData } from "@/components/app/quality-dashboard";
import type { AlertData } from "@/components/app/alert-recurrence-table";
import type { CategorizedComment } from "@/hooks/use-pending-comments";
import type { ProcessedNpsVerbatim } from "@/lib/types";

// --- Helper Functions ---

function formatValue(value: number | null | undefined, unit: string = '', decimals: number = 1): string {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(decimals)}${unit}`;
}

const COLORS = {
    GREEN: '#16A34A',
    YELLOW: '#F59E0B',
    RED: '#DC2626',
    GRAY_TEXT: '#4A5568',
    BLUE_TITLE: '#2D3748',
    BORDER: '#E2E8F0',
    BACKGROUND: '#F7FAFC',
    WHITE: '#FFFFFF',
};

function getRatingColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return COLORS.RED;
    if (value >= 4.8) return COLORS.GREEN;
    if (value >= 4.5) return COLORS.YELLOW;
    return COLORS.RED;
}

function getNpsColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return COLORS.RED;
    if (value >= 65) return COLORS.GREEN;
    if (value >= 30) return COLORS.YELLOW;
    return COLORS.RED;
}

function getPunctualityColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return COLORS.RED;
    if (value >= 95) return COLORS.GREEN;
    if (value >= 90) return COLORS.YELLOW;
    return COLORS.RED;
}

function getForcedMetricColor(value: number | null | undefined): string {
    if (value === null || value === undefined) return COLORS.RED;
    if (value <= 5) return COLORS.GREEN;
    if (value <= 10) return COLORS.YELLOW;
    return COLORS.RED;
}

// --- HTML Generation ---

const FONT_FAMILY = `font-family: -apple-system, 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';`;

function createCard(content: string, title?: string): string {
    const titleHtml = title ? `<h3 style="font-size: 16px; font-weight: 600; color: ${COLORS.BLUE_TITLE}; margin: 0 0 15px 0; ${FONT_FAMILY}">${title}</h3>` : '';
    return `
        <div style="background-color: ${COLORS.WHITE}; border: 1px solid ${COLORS.BORDER}; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            ${titleHtml}
            ${content}
        </div>
    `;
}

function createKpiGrid(kpis: { label: string; value: string; color: string }[]): string {
    let cells = '';
    kpis.forEach(kpi => {
        cells += `
            <td style="padding: 10px; text-align: center; width: 14%;">
                <div style="font-size: 12px; color: ${COLORS.GRAY_TEXT}; text-transform: uppercase; margin-bottom: 5px; ${FONT_FAMILY}">${kpi.label}</div>
                <div style="font-size: 20px; font-weight: bold; color: ${kpi.color}; ${FONT_FAMILY}">${kpi.value}</div>
            </td>
        `;
    });
    return `<table style="width: 100%; border-collapse: collapse;"><tr>${cells}</tr></table>`;
}

function createCategoryTable(title: string, data: { name: string; count: number; percentage: number }[], total: number): string {
    if (data.length === 0) return `<div style="${FONT_FAMILY} color: ${COLORS.GRAY_TEXT};">Aucune donnée pour les ${title.toLowerCase()}.</div>`;

    let rows = '';
    data.forEach(item => {
        rows += `
            <tr>
                <td style="padding: 8px 0; font-size: 13px; color: ${COLORS.GRAY_TEXT}; ${FONT_FAMILY}">${item.name}</td>
                <td style="padding: 8px 0; font-size: 13px; text-align: right; color: ${COLORS.GRAY_TEXT}; ${FONT_FAMILY}">${item.count}</td>
                <td style="padding: 8px 0; width: 100px; text-align: right;">
                    <div style="position: relative; height: 8px; background-color: #E2E8F0; border-radius: 4px; overflow: hidden;">
                        <div style="position: absolute; height: 100%; width: ${item.percentage}%; background-color: #4299E1;"></div>
                    </div>
                </td>
                <td style="padding: 8px 0 8px 10px; font-size: 13px; font-weight: 600; color: ${COLORS.BLUE_TITLE}; text-align: right; ${FONT_FAMILY}">${item.percentage.toFixed(1)}%</td>
            </tr>
        `;
    });

    return `
        <h4 style="font-size: 14px; font-weight: 600; color: ${COLORS.BLUE_TITLE}; margin: 20px 0 10px 0; ${FONT_FAMILY}">${title} (${total})</h4>
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
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
        const depotKpis = createKpiGrid([
            { label: 'Note Moy.', value: formatValue(depot.averageRating, '', 2), color: getRatingColor(depot.averageRating) },
            { label: 'NPS', value: formatValue(depot.npsScore, '', 1), color: getNpsColor(depot.npsScore) },
            { label: 'Ponctualité', value: formatValue(depot.punctualityRate, '%', 1), color: getPunctualityColor(depot.punctualityRate) },
            { label: 'SCANBAC', value: formatValue(depot.scanbacRate, '%', 1), color: getPunctualityColor(depot.scanbacRate) },
            { label: 'Forçage Adr.', value: formatValue(depot.forcedAddressRate, '%', 1), color: getForcedMetricColor(depot.forcedAddressRate) },
            { label: 'Forçage Cmd', value: formatValue(depot.forcedContactlessRate, '%', 1), color: getForcedMetricColor(depot.forcedContactlessRate) },
            { label: 'Retard > 1h', value: formatValue(depot.lateOver1hRate, '%', 1), color: getForcedMetricColor(depot.lateOver1hRate) }
        ]);

        // --- Carrier KPIs ---
        let carrierKpisSections = '';
        if(depot.carriers.length > 1) { // Only show carrier breakdown if there's more than one
             carrierKpisSections = `<h4 style="font-size: 14px; font-weight: 600; color: ${COLORS.BLUE_TITLE}; margin: 20px 0 10px 0; ${FONT_FAMILY}">Indicateurs par Transporteur</h4>`;
             depot.carriers.forEach(carrier => {
                 const carrierKpis = createKpiGrid([
                    { label: 'Note Moy.', value: formatValue(carrier.averageRating, '', 2), color: getRatingColor(carrier.averageRating) },
                    { label: 'NPS', value: formatValue(carrier.npsScore, '', 1), color: getNpsColor(carrier.npsScore) },
                    { label: 'Ponctualité', value: formatValue(carrier.punctualityRate, '%', 1), color: getPunctualityColor(carrier.punctualityRate) },
                    { label: 'SCANBAC', value: formatValue(carrier.scanbacRate, '%', 1), color: getPunctualityColor(carrier.scanbacRate) },
                    { label: 'Forçage Adr.', value: formatValue(carrier.forcedAddressRate, '%', 1), color: getForcedMetricColor(carrier.forcedAddressRate) },
                    { label: 'Forçage Cmd', value: formatValue(carrier.forcedContactlessRate, '%', 1), color: getForcedMetricColor(carrier.forcedContactlessRate) },
                    { label: 'Retard > 1h', value: formatValue(carrier.lateOver1hRate, '%', 1), color: getForcedMetricColor(carrier.lateOver1hRate) }
                ]);
                carrierKpisSections += `
                    <div style="margin-bottom: 15px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #fcfdff;">
                        <p style="font-size: 14px; font-weight: 600; color: #4A5568; margin: 0 0 10px 0; ${FONT_FAMILY}">${carrier.name}</p>
                        ${carrierKpis}
                    </div>
                `;
             });
        }


        // --- Categories ---
        const depotComments = allComments.filter(c => depot.carriers.some(carrier => carrier.drivers.some(driver => driver.name === c.driverName)));
        const commentsByCategory: Record<string, number> = {};
        depotComments.forEach(c => { commentsByCategory[c.category] = (commentsByCategory[c.category] || 0) + 1; });
        const commentsCategoryData = Object.entries(commentsByCategory).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({
            name, count, percentage: depotComments.length > 0 ? (count / depotComments.length) * 100 : 0
        }));

        const depotVerbatims = processedVerbatims.filter(v => v.depot === depot.name);
        const verbatimsByCategory: Record<string, number> = {};
        depotVerbatims.forEach(v => { verbatimsByCategory[v.category] = (verbatimsByCategory[v.category] || 0) + 1; });
        const verbatimsCategoryData = Object.entries(verbatimsByCategory).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({
            name, count, percentage: depotVerbatims.length > 0 ? (count / depotVerbatims.length) * 100 : 0
        }));

        const analysisContent = `
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                        ${createCategoryTable("Commentaires Négatifs", commentsCategoryData, depotComments.length)}
                    </td>
                    <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                        ${createCategoryTable("Verbatims Détracteurs", verbatimsCategoryData, depotVerbatims.length)}
                    </td>
                </tr>
            </table>
        `;

        // --- Recurrence Table ---
        const currentDepotAlerts = depotAlerts.get(depot.name);
        let recurrenceRows = '';
        if (currentDepotAlerts) {
            currentDepotAlerts.carriers.flatMap(c => c.drivers).forEach(driver => {
                if (driver.alertCount > 0) {
                    const driverStats = depot.carriers.flatMap(c => c.drivers).find(d => d.name === driver.name);
                    const categories = Object.entries(driver.commentCategories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => `${count}x ${cat}`).join(', ');
                    recurrenceRows += `
                        <tr>
                            <td style="padding: 12px 5px; border-bottom: 1px solid ${COLORS.BORDER}; ${FONT_FAMILY} font-size: 13px;"><strong>${driver.name}</strong><br><span style="color: ${COLORS.GRAY_TEXT}; font-size: 12px;">${currentDepotAlerts.carriers.find(c => c.drivers.some(d => d.name === driver.name))?.name || ''}</span></td>
                            <td style="padding: 12px 5px; border-bottom: 1px solid ${COLORS.BORDER}; ${FONT_FAMILY} font-size: 13px; text-align: center; color: ${getRatingColor(driver.averageRating)}; font-weight: 600;">${formatValue(driver.averageRating, '', 2)}</td>
                            <td style="padding: 12px 5px; border-bottom: 1px solid ${COLORS.BORDER}; ${FONT_FAMILY} font-size: 13px; text-align: center; color: ${getNpsColor(driverStats?.npsScore)}; font-weight: 600;">${formatValue(driverStats?.npsScore, '', 1)}</td>
                            <td style="padding: 12px 5px; border-bottom: 1px solid ${COLORS.BORDER}; ${FONT_FAMILY} font-size: 13px; text-align: center; color: ${getPunctualityColor(driverStats?.punctualityRate)}; font-weight: 600;">${formatValue(driverStats?.punctualityRate, '%', 1)}</td>
                            <td style="padding: 12px 5px; border-bottom: 1px solid ${COLORS.BORDER}; ${FONT_FAMILY} font-size: 13px; text-align: center; font-weight: bold; color: #C53030;">${driver.alertCount}/${driver.totalRatings}</td>
                            <td style="padding: 12px 5px; border-bottom: 1px solid ${COLORS.BORDER}; ${FONT_FAMILY} font-size: 12px; color: ${COLORS.GRAY_TEXT};">${categories}</td>
                        </tr>
                    `;
                }
            });
        }
        if (recurrenceRows === '') {
            recurrenceRows = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: ${COLORS.GRAY_TEXT}; ${FONT_FAMILY}">Aucune récurrence de mauvaise note pour ce dépôt.</td></tr>`;
        }
        
        const recurrenceTable = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr>
                        <th style="padding: 8px 5px; text-align: left; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 11px; color: #4A5568; text-transform: uppercase;">Livreur</th>
                        <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 11px; color: #4A5568; text-transform: uppercase;">Note Moy.</th>
                        <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 11px; color: #4A5568; text-transform: uppercase;">NPS</th>
                        <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 11px; color: #4A5568; text-transform: uppercase;">Ponctualité</th>
                        <th style="padding: 8px 5px; text-align: center; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 11px; color: #4A5568; text-transform: uppercase;">Alertes / Total</th>
                        <th style="padding: 8px 5px; text-align: left; background-color: #F7FAFC; font-family: Arial, sans-serif; font-size: 11px; color: #4A5568; text-transform: uppercase;">Catégories Associées</th>
                    </tr>
                </thead>
                <tbody>${recurrenceRows}</tbody>
            </table>
        `;
        
        depotSections += `
            <h2 style="font-size: 22px; font-weight: 700; color: ${COLORS.BLUE_TITLE}; margin: 40px 0 15px 0; border-bottom: 2px solid ${COLORS.BORDER}; padding-bottom: 10px; ${FONT_FAMILY}">
                Dépôt: ${depot.name.toUpperCase()}
            </h2>
            ${createCard(depotKpis, 'Indicateurs Clés du Dépôt')}
            ${carrierKpisSections ? createCard(carrierKpisSections) : ''}
            ${createCard(analysisContent, 'Analyse des Retours Clients')}
            ${createCard(recurrenceTable, 'Récurrence des Mauvaises Notes (Note < 4)')}
        `;
    }

    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Rapport Qualité</title>
        </head>
        <body style="background-color: ${COLORS.BACKGROUND}; margin: 0; padding: 20px; ${FONT_FAMILY}">
            <div style="max-width: 850px; margin: auto; background-color: transparent;">
                <h1 style="font-size: 28px; font-weight: 800; color: ${COLORS.BLUE_TITLE}; margin: 0; ${FONT_FAMILY}">Rapport Qualité</h1>
                <p style="font-size: 14px; color: ${COLORS.GRAY_TEXT}; margin: 5px 0 30px 0; ${FONT_FAMILY}">Période du ${formattedDateRange}</p>
                ${depotSections}
                <p style="text-align: center; color: #A0AEC0; font-size: 12px; margin-top: 30px; ${FONT_FAMILY}">Généré par ID-pilote</p>
            </div>
        </body>
        </html>
    `;

    return htmlBody;
}
