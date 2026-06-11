import React, { useState } from "react";
import { FileText, Sparkles, Save, Loader2, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { iaStudioApi } from "@/api/v2";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { RelatorioPremiumPDF } from "@/pages/relatorios/RelatorioPremiumPDF";

interface PremiumReportGeneratorProps {
  patientId: string;
  patientName: string;
}

export const PremiumReportGenerator: React.FC<PremiumReportGeneratorProps> = ({
  patientId,
  patientName,
}) => {
  const [highlights, setHighlights] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<{ medico: string; paciente: string } | null>(null);

  const handleGenerate = async () => {
    if (!highlights.trim()) {
      toast.error("Por favor, descreva os destaques da evolução.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await iaStudioApi.synthesizeReport(patientId, highlights);
      if (res.success) {
        setReportData(res.data);
        toast.success("Relatório gerado com inteligência artificial!");
      }
    } catch {
      toast.error("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setIsGenerating(true); // Manter true para simular progresso visual no preview se necessário
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Gerador de Relatório Premium</h3>
            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 fill-emerald-500" /> IA Synthesis Engine
            </p>
          </div>
        </div>
      </header>

      {!reportData ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <Label className="text-xs font-black uppercase text-slate-500 tracking-widest px-1">
              Destaques da Evolução (O que a IA deve enfatizar?)
            </Label>
            <Textarea
              placeholder="Ex: Paciente ganhou 15 graus de flexão de joelho, dor reduziu de 7 para 2, já consegue caminhar 20 min sem compensação..."
              className="min-h-[150px] rounded-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 focus:ring-emerald-500/20 transition-all text-sm leading-relaxed"
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm gap-3 shadow-xl shadow-emerald-600/20 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                IA Processando Dados Clínicos...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Relatório Inteligente
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-[32px] border-none bg-slate-50 dark:bg-slate-900/50 p-6 space-y-4">
              <Badge className="bg-cyan-500/10 text-cyan-600 border-none rounded-full px-3 py-1 font-bold text-[10px]">
                PARA O MÉDICO
              </Badge>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-6">
                "{reportData.medico}"
              </p>
            </Card>
            <Card className="rounded-[32px] border-none bg-emerald-50 dark:bg-emerald-900/10 p-6 space-y-4 border border-emerald-500/10">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-full px-3 py-1 font-bold text-[10px]">
                PARA O PACIENTE
              </Badge>
              <p className="text-sm text-emerald-900/70 dark:text-emerald-300 leading-relaxed italic line-clamp-6">
                "{reportData.paciente}"
              </p>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800"
              onClick={() => setReportData(null)}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Refazer
            </Button>

            <PDFDownloadLink
              document={
                <RelatorioPremiumPDF
                  data={{
                    clinica: {
                      nome: "FisioFlow Studio",
                      endereco: "Av. Exemplo, 123",
                      telefone: "(11) 9999-9999",
                      whatsapp: "(11) 9999-9999",
                    },
                    paciente: { nome: patientName },
                    profissional: {
                      nome: "Dr. Rafael Minatto",
                      registro: "CREFITO 3/XXXXX-F",
                      especialidade: "Ortopedia e Esportiva",
                    },
                    data_emissao: new Date().toISOString(),
                    narrativa_medica: reportData.medico,
                    narrativa_paciente: reportData.paciente,
                    evolucoes: [],
                    metricas: [],
                    referencias: [],
                  }}
                />
              }
              fileName={`Relatorio_Premium_${patientName.replace(/\s+/g, "_")}.pdf`}
              className="flex-1"
            >
              {({ loading }) => (
                <Button
                  disabled={loading}
                  className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Baixar PDF Premium
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </motion.div>
      )}
    </div>
  );
};
