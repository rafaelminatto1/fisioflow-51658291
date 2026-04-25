import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  MessageSquare,
  LineChart,
  Stethoscope,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getWorkersApiUrl } from "@/lib/api/config";

export function AIHubView() {
  const [soapText, setSoapText] = useState("");
  const [soapResult, setSoapResult] = useState<any>(null);
  const [loadingSoap, setLoadingSoap] = useState(false);

  const [simulatorProfile, setSimulatorProfile] = useState({
    age: 45,
    condition: "Pós-operatório de LCA (3 semanas)",
    painLevel: 4,
    motivationLevel: "medium",
    personaTraits: ["ansioso", "focado na recuperação"],
  });
  const [simResult, setSimResult] = useState<any>(null);
  const [loadingSim, setLoadingSim] = useState(false);
  const [tutorMessage, setTutorMessage] = useState(
    "Olá! Como você está se sentindo hoje com seus exercícios?",
  );

  const handleSoapReview = async () => {
    if (!soapText.trim()) return;
    setLoadingSoap(true);
    try {
      const res = await fetch(`${getWorkersApiUrl()}/api/agents/soap-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: soapText }),
      });
      const { data } = await res.json();
      setSoapResult(data);
      toast.success("Análise SOAP concluída!");
    } catch (error) {
      toast.error("Erro ao revisar nota SOAP.");
    } finally {
      setLoadingSoap(false);
    }
  };

  const handleSimulation = async () => {
    setLoadingSim(true);
    try {
      const res = await fetch(`${getWorkersApiUrl()}/api/agents/simulator/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: simulatorProfile,
          chatHistory: [],
          agentLastMessage: tutorMessage,
        }),
      });
      const { data } = await res.json();
      setSimResult(data);
      toast.success("Simulação gerada!");
    } catch (error) {
      toast.error("Erro ao gerar simulação.");
    } finally {
      setLoadingSim(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Agent Hub</h2>
          <p className="text-muted-foreground">
            Experimente e refine os agentes de inteligência clínica.
          </p>
        </div>
      </header>

      <Tabs defaultValue="soap" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="soap" className="gap-2">
            <Stethoscope className="h-4 w-4" /> SOAP Review
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Simulator
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-2">
            <LineChart className="h-4 w-4" /> Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="soap" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revisor de Notas SOAP</CardTitle>
                <CardDescription>
                  Otimize sua documentação clínica com feedback em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rascunho da Nota</Label>
                  <Textarea
                    placeholder="Ex: Paciente relata dor 5/10 no joelho. Realizado exercícios de fortalecimento..."
                    className="min-h-[200px]"
                    value={soapText}
                    onChange={(e) => setSoapText(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleSoapReview}
                  disabled={loadingSoap || !soapText.trim()}
                >
                  {loadingSoap ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Analisar Nota
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {soapResult ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Resultado da Análise</CardTitle>
                      <Badge variant={soapResult.score > 70 ? "default" : "destructive"}>
                        Score: {soapResult.score}/100
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase">Sugestões de Melhoria</Label>
                      <ul className="space-y-1">
                        {soapResult.suggestions.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {soapResult.improvedText && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase">
                          Versão Aprimorada (IA)
                        </Label>
                        <div className="p-3 bg-background border rounded-lg text-sm italic">
                          {soapResult.improvedText}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mb-4 opacity-20" />
                  <p>Insira uma nota SOAP para ver a análise do agente.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="simulator" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulador de Paciente</CardTitle>
                <CardDescription>
                  Teste seu AI Tutor contra diferentes perfis de pacientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md"
                      value={simulatorProfile.age}
                      onChange={(e) =>
                        setSimulatorProfile((p) => ({ ...p, age: parseInt(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nível de Dor (0-10)</Label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md"
                      value={simulatorProfile.painLevel}
                      onChange={(e) =>
                        setSimulatorProfile((p) => ({ ...p, painLevel: parseInt(e.target.value) }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condição Clínica</Label>
                  <Textarea
                    value={simulatorProfile.condition}
                    onChange={(e) =>
                      setSimulatorProfile((p) => ({ ...p, condition: e.target.value }))
                    }
                    className="h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Última mensagem do Tutor</Label>
                  <Textarea
                    value={tutorMessage}
                    onChange={(e) => setTutorMessage(e.target.value)}
                    className="h-20 bg-blue-50/30 border-blue-100"
                  />
                </div>
                <Button
                  className="w-full gap-2"
                  variant="secondary"
                  onClick={handleSimulation}
                  disabled={loadingSim}
                >
                  {loadingSim ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Simular Resposta do Paciente
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {simResult ? (
                <Card className="border-emerald-200 bg-emerald-50/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Paciente Simulado</CardTitle>
                      {simResult.safetyTriggered && (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Risco Detectado
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-background border-l-4 border-emerald-500 rounded-r-lg shadow-sm">
                      <p className="text-sm font-medium">"{simResult.simulatedMessage}"</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Processo Interno de Pensamento
                      </Label>
                      <p className="text-xs text-slate-600 bg-white/50 p-3 rounded border italic">
                        {simResult.internalThoughtProcess}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                  <p>Configure o perfil e clique em simular para ver como o paciente responde.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <Card className="border-dashed border-2">
            <CardContent className="py-20 flex flex-col items-center justify-center text-center">
              <LineChart className="h-12 w-12 mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-medium">Chart Generation Agent</h3>
              <p className="text-muted-foreground max-w-md mx-auto mt-2">
                Este agente está sendo finalizado para integrar com o dashboard de evolução do
                paciente. Ele converterá automaticamente registros clínicos em gráficos interativos.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
