import { useState } from 'react';
import { documentsApi } from '@/api/v2/documents';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para exportar HTML para PDF usando o novo serviço de Browser Rendering do Cloudflare.
 */
export function useExportPdf() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const exportPdf = async (html: string, filename: string, title?: string) => {
    setIsGenerating(true);
    try {
      // Usar a rota /api/documents/print que implementamos
      // Nota: A função 'request' padrão pode precisar de ajuste para retornar Blob.
      // Caso contrário, usamos fetch direto aqui para maior controle do binário.
      const blob = await documentsApi.print({ html, filename, title });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'PDF Gerado',
        description: 'O documento foi baixado com sucesso.',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na geração',
        description: 'Não foi possível gerar o PDF no momento.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { exportPdf, isGenerating };
}
