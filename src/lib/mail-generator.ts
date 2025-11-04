
import type { QualityData } from "@/components/app/quality-dashboard";
import type { AlertData } from "@/components/app/alert-recurrence-table";
import type { CategorizedComment } from "@/hooks/use-pending-comments";
import type { ProcessedNpsVerbatim, Tache } from "@/lib/types";

// --- Helper Functions ---

function formatValue(value: number | null | undefined, unit: string = '', decimals: number = 1): string {
    if (value === null || value === undefined) return "N/A";
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
    return `${formatted}${unit}`;
}

const COLORS = {
    PRIMARY: '#4338CA', // Indigo 700
    DESTRUCTIVE: '#BE123C', // Rose 700
    SUCCESS: '#16A34A', // Green 600
    WARNING: '#D97706', // Amber 600
    CRITICAL_BG: '#FEF2F2', // Red 50

    TEXT_PRIMARY: '#1F2937',
    TEXT_SECONDARY: '#4B5563',
    TEXT_LIGHT: '#9CA3AF',
    
    BACKGROUND_BODY: '#F9FAFB',
    BACKGROUND_CARD: '#FFFFFF',
    BORDER: '#E5E7EB',
};

// --- Color Logic ---
const getRatingColor = (v: number | null | undefined) => v === null || v === undefined ? COLORS.DESTRUCTIVE : v >= 4.8 ? COLORS.SUCCESS : v >= 4.5 ? COLORS.WARNING : COLORS.DESTRUCTIVE;
const getNpsColor = (v: number | null | undefined) => v === null || v === undefined ? COLORS.DESTRUCTIVE : v >= 50 ? COLORS.SUCCESS : v >= 0 ? COLORS.WARNING : COLORS.DESTRUCTIVE;
const getPunctualityColor = (v: number | null | undefined) => v === null || v === undefined ? COLORS.DESTRUCTIVE : v >= 95 ? COLORS.SUCCESS : v >= 90 ? COLORS.WARNING : COLORS.DESTRUCTIVE;
const getForcedMetricColor = (v: number | null | undefined) => v === null || v === undefined ? COLORS.DESTRUCTIVE : v <= 5 ? COLORS.SUCCESS : v <= 10 ? COLORS.WARNING : COLORS.DESTRUCTIVE;

const FONT_FAMILY = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';`;

// --- Reusable HTML Components ---

function createAvatar(name: string): string {
    if (!name) return '';
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorPalette = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];
    const color = colorPalette[Math.abs(hash) % colorPalette.length];

    return `
      <div style="display: inline-block; vertical-align: middle; width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; color: white; text-align: center; line-height: 32px; font-size: 14px; font-weight: 600; margin-right: 12px; ${FONT_FAMILY}">
        ${initials}
      </div>`;
}


function createCard(content: string, title?: string, icon?: string, options: {bgColor?: string, borderColor?: string} = {}): string {
    const bgColor = options.bgColor || COLORS.BACKGROUND_CARD;
    const borderColor = options.borderColor || COLORS.BORDER;
    const iconHtml = icon ? `<span style="font-size: 20px; margin-right: 12px; vertical-align: middle;">${icon}</span>` : '';
    const titleHtml = title ? `<h3 style="display: inline-block; vertical-align: middle; font-size: 18px; font-weight: 600; color: ${COLORS.TEXT_PRIMARY}; margin: 0 0 16px 0; ${FONT_FAMILY}">${iconHtml}${title}</h3>` : '';
    
    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td bgcolor="${bgColor}" style="border: 1px solid ${borderColor}; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px 0 rgba(0,0,0,0.05);">
            <div style="padding: 24px;">
              ${titleHtml}${content}
            </div>
          </td>
        </tr>
      </table>
      <div style="height: 24px;"></div>`;
}

function createKpiGrid(kpis: { label: string; value: string; color: string }[]): string {
    let cells = kpis.map(kpi => `
        <td align="left" style="padding: 0 8px; width: 14%; vertical-align: top;">
          <div style="padding-bottom: 12px;">
              <p style="font-size: 12px; color: ${COLORS.TEXT_SECONDARY}; text-transform: uppercase; margin: 0 0 4px 0; ${FONT_FAMILY}">${kpi.label}</p>
              <p style="font-size: 24px; font-weight: 700; color: ${kpi.color}; margin: 0; ${FONT_FAMILY}">${kpi.value}</p>
          </div>
        </td>`).join('');
    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${cells}</tr></table>`;
}

function createCategoryTable(title: string, data: { name: string; count: number; percentage: number }[], total: number): string {
    if (data.length === 0) return `<div style="${FONT_FAMILY} color: ${COLORS.TEXT_SECONDARY};">Aucune donnée pour ${title.toLowerCase()}.</div>`;
    let rows = data.map(item => `
        <tr>
            <td style="padding: 10px 0; font-size: 14px; color: ${COLORS.TEXT_SECONDARY}; ${FONT_FAMILY} border-bottom: 1px solid ${COLORS.BORDER};">${item.name}</td>
            <td style="padding: 10px 0; width: 120px; text-align: right; border-bottom: 1px solid ${COLORS.BORDER};">
                <div style="height: 8px; background-color: ${COLORS.BORDER}; border-radius: 4px; overflow: hidden; display: inline-block; width: 80px; vertical-align: middle;">
                    <div style="height: 100%; width: ${item.percentage}%; background-color: ${COLORS.PRIMARY};"></div>
                </div>
            </td>
            <td style="padding: 10px 0 10px 12px; font-size: 14px; font-weight: 600; color: ${COLORS.TEXT_PRIMARY}; text-align: right; ${FONT_FAMILY} border-bottom: 1px solid ${COLORS.BORDER};">${item.count} (${item.percentage.toFixed(1)}%)</td>
        </tr>`).join('');
    return `
        <h4 style="font-size: 16px; font-weight: 600; color: ${COLORS.TEXT_PRIMARY}; margin: 24px 0 12px 0; ${FONT_FAMILY}">${title} (${total})</h4>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">${rows}</tbody></table>`;
}

function createCriticalAlertsSection(comments: CategorizedComment[], verbatims: ProcessedNpsVerbatim[]): string {
    const CRITICAL_CATEGORIES = ["rupture de la chaine de froid", "attitude livreur"];
    const filterCritical = (item: CategorizedComment | ProcessedNpsVerbatim) => {
        const categories = Array.isArray(item.category) ? item.category : [item.category];
        return categories.some(cat => cat && CRITICAL_CATEGORIES.includes(cat.toLowerCase()));
    };

    const criticalItems = [
        ...comments.filter(filterCritical).map(c => ({ type: 'Commentaire', text: c.comment, driver: c.driverName, taskId: c.taskId })),
        ...verbatims.filter(filterCritical).map(v => ({ type: 'Verbatim', text: v.verbatim, driver: v.driver, taskId: v.taskId }))
    ];

    if (criticalItems.length === 0) return '';

    let content = criticalItems.map(item => `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #FECACA;">
            <p style="margin: 0; ${FONT_FAMILY}"><strong style="color: ${COLORS.DESTRUCTIVE};">${item.type}:</strong> "${item.text}"</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.TEXT_SECONDARY}; ${FONT_FAMILY}">Livreur: ${item.driver || 'N/A'} | Tâche: ${item.taskId}</p>
        </div>`).join('');
    
    return createCard(content, "Alertes Critiques", '⚠️', {bgColor: COLORS.CRITICAL_BG, borderColor: COLORS.DESTRUCTIVE});
}

function createManagerialSummaryCard(depotTasks: Tache[], depotAlerts?: AlertData): string {
    // Find Top Driver (most 5-star ratings) from all tasks in the depot
    const fiveStarRatings = depotTasks.filter(t => t.notationLivreur === 5 && t.nomCompletChauffeur);
    const fiveStarCounts: Record<string, number> = {};
    fiveStarRatings.forEach(t => {
        fiveStarCounts[t.nomCompletChauffeur!] = (fiveStarCounts[t.nomCompletChauffeur!] || 0) + 1;
    });
    const topDriverEntry = Object.entries(fiveStarCounts).sort((a, b) => b[1] - a[1])[0];
    const topDriver = topDriverEntry ? { name: topDriverEntry[0], count: topDriverEntry[1] } : null;

    // Find Driver to Watch (most alerts)
    const driversWithAlerts = depotAlerts?.carriers.flatMap(c => c.drivers).filter(d => d.alertCount > 0) || [];
    const driverToWatch = driversWithAlerts.sort((a, b) => b.alertCount - a.alertCount)[0];
    
    if (!topDriver && !driverToWatch) return '';

    let topDriverHtml = `<p style="color: ${COLORS.TEXT_SECONDARY}; margin: 0; ${FONT_FAMILY}">Aucun livreur avec 5 étoiles sur la période.</p>`;
    if (topDriver) {
        topDriverHtml = `
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.TEXT_PRIMARY}; ${FONT_FAMILY}">${topDriver.name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.SUCCESS}; ${FONT_FAMILY}">${topDriver.count} note(s) 5 étoiles</p>`;
    }

    let driverToWatchHtml = `<p style="color: ${COLORS.TEXT_SECONDARY}; margin: 0; ${FONT_FAMILY}">Aucun livreur avec des notes alertantes.</p>`;
    if (driverToWatch) {
        driverToWatchHtml = `
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.TEXT_PRIMARY}; ${FONT_FAMILY}">${driverToWatch.name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${COLORS.DESTRUCTIVE}; ${FONT_FAMILY}">${driverToWatch.alertCount} alerte(s) sur ${driverToWatch.totalRatings} notes</p>`;
    }

    const content = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="50%" style="vertical-align: top; padding-right: 12px;">
            <p style="font-size: 12px; font-weight: 600; color: ${COLORS.TEXT_SECONDARY}; margin: 0 0 8px 0; ${FONT_FAMILY}">⭐ TOP LIVREUR</p>
            ${topDriverHtml}
          </td>
          <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid ${COLORS.BORDER};">
            <p style="font-size: 12px; font-weight: 600; color: ${COLORS.TEXT_SECONDARY}; margin: 0 0 8px 0; ${FONT_FAMILY}">⚠️ LIVREUR À SUIVRE</p>
            ${driverToWatchHtml}
          </td>
        </tr>
      </table>`;
    return createCard(content, "Synthèse Managériale", '🎯');
}


// --- Main Email Generation Function ---
export function generateQualityEmailBody(
    qualityData: QualityData,
    alertData: AlertData[],
    allComments: CategorizedComment[],
    processedVerbatims: ProcessedNpsVerbatim[],
    dateRange: { from: Date, to: Date },
    allTasks: Tache[]
): string {
    const formattedDateRange = `${new Date(dateRange.from).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} au ${new Date(dateRange.to).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    const kpiDefs = [
      { key: 'averageRating', label: 'Note Moy.', unit: '', decimals: 2, colorFn: getRatingColor },
      { key: 'npsScore', label: 'NPS', unit: '', decimals: 1, colorFn: getNpsColor },
      { key: 'punctualityRate', label: 'Ponctualité', unit: '%', decimals: 1, colorFn: getPunctualityColor },
      { key: 'scanbacRate', label: 'SCANBAC', unit: '%', decimals: 1, colorFn: getPunctualityColor },
      { key: 'forcedAddressRate', label: 'Forçage Adr.', unit: '%', decimals: 1, colorFn: getForcedMetricColor },
      { key: 'forcedContactlessRate', label: 'Forçage Cmd', unit: '%', decimals: 1, colorFn: getForcedMetricColor },
      { key: 'lateOver1hRate', label: 'Retard > 1h', unit: '%', decimals: 1, colorFn: getForcedMetricColor },
    ] as const;

    const buildKpis = (data: any) => kpiDefs.map(kpi => ({
      label: kpi.label,
      value: formatValue(data[kpi.key], kpi.unit, kpi.decimals),
      color: kpi.colorFn(data[kpi.key])
    }));

    const globalKpis = createKpiGrid(buildKpis(qualityData.summary));
    const globalAlertsSection = createCriticalAlertsSection(allComments, processedVerbatims);
    
    const getCategoryData = (items: (CategorizedComment | ProcessedNpsVerbatim)[]) => {
      const categoryMap: Record<string, number> = {};
      items.forEach(item => {
        const categories = Array.isArray(item.category) ? item.category : [item.category];
        categories.forEach(cat => { if(cat) categoryMap[cat] = (categoryMap[cat] || 0) + 1; });
      });
      return Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, percentage: items.length > 0 ? (count / items.length) * 100 : 0 }));
    };

    const globalCommentsCategoryData = getCategoryData(allComments);
    const globalVerbatimsCategoryData = getCategoryData(processedVerbatims);

    const globalAnalysisContent = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 16px;">${createCategoryTable("Commentaires Négatifs", globalCommentsCategoryData, allComments.length)}</td>
              <td style="width: 50%; vertical-align: top; padding-left: 16px;">${createCategoryTable("Verbatims Détracteurs", globalVerbatimsCategoryData, processedVerbatims.length)}</td>
          </tr>
      </table>`;

    const globalSummarySection = `
        ${createCard(globalKpis, 'Indicateurs Clés', '📊')}
        ${globalAlertsSection}
        ${createCard(globalAnalysisContent, 'Analyse des Retours Clients', '📋')}`;

    let depotSections = '';
    const alertDataMap = new Map(alertData.map(depot => [depot.name, depot]));

    for (const depot of qualityData.details) {
        const depotKpis = createKpiGrid(buildKpis(depot));
        
        const depotTasks = allTasks.filter(t => t.nomHub && depot.carriers.some(c => c.drivers.some(d => d.name === t.nomCompletChauffeur)));
        const depotComments = allComments.filter(c => c.nomHub && depot.carriers.some(c => c.drivers.some(d => d.name === c.driverName)));
        const depotVerbatims = processedVerbatims.filter(v => v.depot === depot.name);
        const depotAlerts = alertDataMap.get(depot.name);

        const managerialSummarySection = createManagerialSummaryCard(depotTasks, depotAlerts);
        const depotAlertsSection = createCriticalAlertsSection(depotComments, depotVerbatims);
        
        let recurrenceRows = '';
        if (depotAlerts) {
            const driversWithAlerts = depotAlerts.carriers.flatMap(c => c.drivers).filter(d => d.alertCount > 0).sort((a, b) => b.alertCount - a.alertCount);
            if (driversWithAlerts.length > 0) {
                 driversWithAlerts.forEach(driver => {
                    const categories = Object.entries(driver.commentCategories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => `${count}x ${cat}`).join(', ');
                    recurrenceRows += `
                        <tr>
                            <td style="padding: 12px 8px; border-bottom: 1px solid ${COLORS.BORDER}; vertical-align: middle;">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td>${createAvatar(driver.name)}</td><td>
                                    <p style="font-size: 14px; font-weight: 600; color: ${COLORS.TEXT_PRIMARY}; margin: 0; ${FONT_FAMILY}">${driver.name}</p>
                                    <p style="font-size: 12px; color: ${COLORS.TEXT_SECONDARY}; margin: 2px 0 0 0; ${FONT_FAMILY}">${depotAlerts.carriers.find(c => c.drivers.some(d => d.name === driver.name))?.name || ''}</p>
                                </td></tr></table>
                            </td>
                            <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: ${getRatingColor(driver.averageRating)}; border-bottom: 1px solid ${COLORS.BORDER}; font-size: 14px; vertical-align: middle;">${formatValue(driver.averageRating, '', 2)}</td>
                            <td style="padding: 12px 8px; text-align: center; font-weight: 700; color: ${COLORS.DESTRUCTIVE}; border-bottom: 1px solid ${COLORS.BORDER}; font-size: 14px; vertical-align: middle;">${driver.alertCount} / ${driver.totalRatings}</td>
                            <td style="padding: 12px 8px; border-bottom: 1px solid ${COLORS.BORDER}; font-size: 12px; color: ${COLORS.TEXT_SECONDARY}; vertical-align: middle;">${categories || 'N/A'}</td>
                        </tr>`;
                });
            }
        }
        if (recurrenceRows === '') {
            recurrenceRows = `<tr><td colspan="4" style="padding: 24px; text-align: center; color: ${COLORS.TEXT_SECONDARY}; ${FONT_FAMILY}">Aucune récurrence de mauvaise note pour ce dépôt.</td></tr>`;
        }

        const recurrenceTableHeaders = ['Livreur', 'Note Moy.', 'Alertes / Total', 'Catégories Associées'].map(label => 
            `<th style="padding: 10px 8px; text-align: left; background-color: #F9FAFB; ${FONT_FAMILY} font-size: 12px; color: ${COLORS.TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${label}</th>`
        ).join('').replace(/text-align: left/g, 'text-align: center').replace('text-align: center', 'text-align: left');

        const recurrenceTable = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;"><thead><tr>${recurrenceTableHeaders}</tr></thead><tbody>${recurrenceRows}</tbody></table>`;
        
        depotSections += `
          <hr style="border: none; border-top: 2px solid ${COLORS.BORDER}; margin: 40px 0;">
          <h2 style="font-size: 24px; font-weight: 700; color: ${COLORS.PRIMARY}; margin: 0 0 24px 0; ${FONT_FAMILY}">
              Analyse Dépôt : ${depot.name.toUpperCase()}
          </h2>
          ${createCard(depotKpis, 'Indicateurs Clés du Dépôt', '📊')}
          ${managerialSummarySection}
          ${depotAlertsSection}
          ${createCard(recurrenceTable, 'Suivi des Livreurs (Notes < 4)', '👥')}
        `;
    }

    const htmlBody = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Rapport Qualité</title>
        <style> body { margin: 0; padding: 0; word-spacing: normal; background-color: ${COLORS.BACKGROUND_BODY}; } </style>
      </head>
      <body style="background-color: ${COLORS.BACKGROUND_BODY};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="850" style="border-collapse: collapse; max-width: 850px;">
                <tr>
                  <td align="center" style="padding: 20px 0 40px 0;">
                    <h1 style="font-size: 32px; font-weight: 800; color: ${COLORS.TEXT_PRIMARY}; margin: 0; ${FONT_FAMILY}">Rapport Qualité Hebdomadaire</h1>
                    <p style="font-size: 16px; color: ${COLORS.TEXT_SECONDARY}; margin: 8px 0 0 0; ${FONT_FAMILY}">${formattedDateRange}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2 style="font-size: 24px; font-weight: 700; color: ${COLORS.PRIMARY}; margin: 0 0 24px 0; ${FONT_FAMILY}">Synthèse Globale</h2>
                    ${globalSummarySection}
                    ${depotSections}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <p style="text-align: center; color: ${COLORS.TEXT_LIGHT}; font-size: 12px; ${FONT_FAMILY}">Généré par ID 360</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    return htmlBody;
}
