import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TestEvolutionData } from '@/types/evolution';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EvolutionTableProps {
  data: TestEvolutionData[];
  testName: string;
}

export const EvolutionTable: React.FC<EvolutionTableProps> = ({ data, testName }) => {
  const handleExport = () => {
    const headers = ['Data', 'Sessão', 'Valor', 'Unidade', 'Variação'];
    const rows = data.map((d) => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      d.session_number,
      d.value,
      d.unit || '-',
      d.variation ? `${d.variation > 0 ? '+' : ''}${d.variation}%` : '-',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evolucao_${testName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('CSV exportado com sucesso');
  };

  const getVariationBadge = (variation?: number) => {
    if (!variation) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (variation > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" />
          CSV
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Data</th>
              <th className="px-2 py-1.5 text-center font-medium">Sessão</th>
              <th className="px-2 py-1.5 text-right font-medium">Valor</th>
              <th className="px-2 py-1.5 text-center font-medium">Var.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, _i) => (
              <tr key={row.id} className="border-t hover:bg-muted/50">
                <td className="px-2 py-1.5">{format(new Date(row.date), 'dd/MM')}</td>
                <td className="px-2 py-1.5 text-center">#{row.session_number}</td>
                <td className="px-2 py-1.5 text-right font-medium">
                  {row.value} {row.unit}
                </td>
                <td className="px-2 py-1.5 text-center">{getVariationBadge(row.variation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
