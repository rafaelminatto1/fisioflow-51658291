declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    head?: unknown[][];
    body?: unknown[][];
    startY?: number;
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    columnStyles?: Record<string, unknown>;
    margin?: Record<string, unknown>;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;

  export default autoTable;
}
