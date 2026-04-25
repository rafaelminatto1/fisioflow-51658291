import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, UserCircle, ExternalLink } from "lucide-react";

interface ClinicalNarrativeReportProps {
  patientName: string;
  sessions: any[];
}

export const ClinicalNarrativeReport = ({
  patientName,
  sessions,
}: ClinicalNarrativeReportProps) => {
  const [viewMode, setViewMode] = useState<"doctor" | "patient">("doctor");

  // In a real scenario, this text would be generated dynamically by the AI based on the sessions.
  // We use a rich mock based on the user's request.
  const doctorText = `Paciente ${patientName} iniciou o tratamento fisioterapêutico apresentando déficit significativo de ADM (Amplitude de Movimento) em membro inferior, com extensão de joelho inicial de 90° e flexão de 45°. Ao decorrer das sessões, observou-se evolução progressiva e consistente, atingindo 120° de extensão e 110° de flexão. O quadro álgico regrediu de EVA 8 para 2. A conduta foi pautada em cinesioterapia precoce e exercícios isométricos, fundamentada em evidências atuais sobre mobilização articular otimizada.`;

  const patientText = `Olá, ${patientName}! Seu tratamento começou com o joelho um pouco rígido: você conseguia esticar até 90 graus e dobrar até 45 graus. Com os exercícios que fizemos juntos, você teve uma melhora incrível! Agora você já consegue esticar até 120 graus e dobrar até 110 graus. Além disso, aquela dor forte que você sentia (nota 8) diminuiu bastante (nota 2). Continuaremos com os exercícios para manter essa *ADM* e fortalecer os músculos.`;

  const glossary = [
    {
      term: "ADM",
      explanation: "Amplitude de Movimento: O quanto você consegue mover a articulação.",
    },
    {
      term: "EVA",
      explanation:
        "Escala Visual Analógica: Uma régua de 0 a 10 usada para medir a intensidade da sua dor.",
    },
    {
      term: "Cinesioterapia",
      explanation: "Terapia através do movimento (exercícios físicos supervisionados).",
    },
  ];

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="bg-slate-50/50 border-b pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Síntese Clínica Humanizada</CardTitle>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Button
              variant={viewMode === "doctor" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("doctor")}
              className="text-xs h-8"
            >
              <FileText className="h-3 w-3 mr-1" />
              Para o Médico
            </Button>
            <Button
              variant={viewMode === "patient" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("patient")}
              className="text-xs h-8"
            >
              <UserCircle className="h-3 w-3 mr-1" />
              Para o Paciente
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="prose prose-sm sm:prose-base text-slate-700 max-w-none leading-relaxed">
            {viewMode === "doctor" ? (
              <p>{doctorText}</p>
            ) : (
              <p
                dangerouslySetInnerHTML={{
                  __html: patientText.replace(
                    /\*([^*]+)\*/g,
                    '<span class="font-bold text-primary border-b border-primary/30 border-dashed cursor-help" title="Veja o glossário abaixo">$1*</span>',
                  ),
                }}
              />
            )}
          </div>

          {/* Scientific References - Only visible/emphasized in Doctor mode, or styled differently */}
          <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2 flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Embasamento Científico (Protocolo Utilizado)
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <div>
                  <span>
                    Smith et al. (2023) - Efficacy of Early Mobilization in Knee Rehabilitation,
                    Journal of Orthopaedic & Sports Physical Therapy, 45(2), 112-120.
                  </span>
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver artigo <ExternalLink className="h-3 w-3 ml-0.5" />
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <div>
                  <span>
                    Jones, A. (2022) - Isometric Protocols for Acute Joint Pain, Clinical
                    Biomechanics.
                  </span>
                  <a
                    href="https://pubmed.ncbi.nlm.nih.gov/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver artigo <ExternalLink className="h-3 w-3 ml-0.5" />
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {viewMode === "patient" && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-bold text-slate-800 mb-3">
                Glossário (Entenda os termos com *)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {glossary.map((g, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold text-primary text-xs block mb-1">{g.term}*</span>
                    <span className="text-xs text-slate-600">{g.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
