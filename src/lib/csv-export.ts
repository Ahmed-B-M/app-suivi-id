
import type { DetailedBillingInfo } from "@/components/app/billing-dashboard";
import { format } from 'date-fns';

function escapeCsvCell(cell: any): string {
    if (cell === null || cell === undefined) {
        return '';
    }
    const cellStr = String(cell);
    // If the cell contains a comma, a quote, or a newline, wrap it in double quotes.
    if (/[",\n\r]/.test(cellStr)) {
        // Within a quoted cell, any double quote must be escaped by another double quote.
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

export function exportToCsv(data: DetailedBillingInfo[], filename: string) {
    if (!data || data.length === 0) {
        console.warn("Pas de données à exporter.");
        return;
    }

    const headers = [
        "Date de la tournée",
        "Nom de la tournée",
        "ID de la tournée",
        "Transporteur",
        "Dépôt",
        "Entrepôt",
        "Type de règle de prix",
        "Cible de la règle de prix",
        "Prix appliqué",
        "Type de règle de coût",
        "Cible de la règle de coût",
        "Coût appliqué"
    ];

    const rows = data.map(item => [
        item.round.date ? format(new Date(item.round.date), 'yyyy-MM-dd') : '',
        item.round.name,
        item.round.id,
        item.carrier,
        item.depot,
        item.store || '',
        item.priceRule?.type || '',
        item.priceRule?.targetValue || '',
        item.price.toFixed(2),
        item.costRule?.type || '',
        item.costRule?.targetValue || '',
        item.cost.toFixed(2)
    ]);

    const csvContent = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
