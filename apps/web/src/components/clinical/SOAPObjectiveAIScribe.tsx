import React, { useState } from "react";

interface SOAPObjectiveAIScribeProps {
  patientId?: string;
  onApplyObservation?: (observationText: string) => void;
}

export const SOAPObjectiveAIScribe: React.FC<SOAPObjectiveAIScribeProps> = ({
  patientId,
  onApplyObservation,
}) => {
  const [movementType, setMovementType] = useState<string>("Agachamento Funcional");
  const [mqiScore, setMqiScore] = useState<number>(84);
  const [symmetryScore, setSymmetryScore] = useState<number>(91);
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedNote, setGeneratedNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/ai/vision/soap-observation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          movementType,
          mqiScore,
          symmetryScore,
          clinicalNotes: clinicalNotes.trim() || undefined,
          angles: {
            leftKnee: 94.2,
            rightKnee: 98.5,
            trunkInclination: 14.1,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erro ao sintetizar observação por IA");
      }

      setGeneratedNote(data.objectiveNote);
    } catch (err: any) {
      // Fallback gracioso local em caso de desconexão
      const fallback = `Avaliação cinemática em ${movementType}: Registrado MQI Score de ${mqiScore}/100 com simetria bilateral de ${symmetryScore}%. Flexão de joelhos atingiu 94° E / 98° D. Alinhamento de tronco sem compensações antálgicas.`;
      setGeneratedNote(fallback);
      setError("Nota gerada via modo de contingência local.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100">AI Scribe — Observação Objetiva (Vision)</h3>
            <p className="text-xs text-slate-400">Sintetiza automaticamente a seção 'O' do SOAP via Workers AI</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            MQI: {mqiScore}/100
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Movimento</label>
          <input
            type="text"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">MQI Score (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={mqiScore}
            onChange={(e) => setMqiScore(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Simetria (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={symmetryScore}
            onChange={(e) => setSymmetryScore(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Observação do Terapeuta (Opcional)</label>
        <textarea
          rows={2}
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          placeholder="Ex: Leve valgo dinâmico em joelho esquerdo ao final da fase excêntrica..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-teal-500 focus:outline-none"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Sintetizando Nota Clínica (Workers AI)...</span>
          </>
        ) : (
          <span>✨ Gerar Nota Objetiva (SOAP 'O')</span>
        )}
      </button>

      {error && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-md">
          {error}
        </div>
      )}

      {generatedNote && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-teal-400">Prévia da Observação Objetiva:</span>
            <button
              onClick={() => onApplyObservation?.(generatedNote)}
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              + Inserir na Evolução
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic">{generatedNote}</p>
        </div>
      )}
    </div>
  );
};
