
import { Transaction } from "@/services/financialService";
import { format } from "date-fns";

export const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const generateTransactionsCSV = (transactions: Transaction[]): string => {
    // Header
    const headers = ['ID', 'Data', 'Descrição', 'Tipo', 'Valor', 'Status', 'Paciente', 'Origem'];
    const rows = transactions.map(t => {
        const date = t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy HH:mm:ss') : '';
        const patientName = (t.metadata as any)?.patient_name || '';
        const source = (t.metadata as any)?.source || '';

        // Escape special characters and wrap in quotes
        const safeDesc = `"${(t.descricao || '').replace(/"/g, '""')}"`;
        const safePatient = `"${patientName.replace(/"/g, '""')}"`;

        return [
            t.id,
            date,
            safeDesc,
            t.tipo,
            t.valor.toFixed(2).replace('.', ','),
            t.status,
            safePatient,
            source
        ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
};
