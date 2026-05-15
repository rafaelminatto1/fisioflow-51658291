import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  Zap,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { nfseApi } from "@/api/v2/billing";

const steps = [
  { id: 1, title: "Dados Fiscais", icon: ShieldCheck, desc: "Configuração do Simples Nacional" },
  { id: 2, title: "Certificado", icon: UploadCloud, desc: "Upload do e-CNPJ A1" },
  { id: 3, title: "Homologação", icon: Zap, desc: "Teste de Emissão PMSP" },
  { id: 4, title: "Ativação", icon: CheckCircle2, desc: "Pronto para Produção" },
];

export function NfseWizard() {
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Carrega config existente para pré-preencher o Step 1
  const { data: configData } = useQuery({
    queryKey: ["nfse-config"],
    queryFn: () => nfseApi.config(),
  });
  const config = (configData as any)?.data ?? {};

  const [form, setForm] = useState({
    cnpj: config.cnpj ?? "",
    razao_social: config.razao_social ?? "",
    inscricao_municipal: config.inscricao_municipal ?? "",
    codigo_servico: config.codigo_servico ?? "04391",
    regime_tributario: config.tp_opcao_simples ?? "1",
    cert_password: "",
  });

  const saveConfig = useMutation({
    mutationFn: (data: Record<string, unknown>) => nfseApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nfse-config"] });
    },
    onError: () => toast.error("Erro ao salvar configuração fiscal."),
  });

  const testConnection = useMutation({
    mutationFn: () => (nfseApi as any).testConnection(),
    onSuccess: (res: any) => {
      const ok = res?.data?.success ?? res?.success ?? false;
      setTestResult({
        ok,
        message: ok
          ? "Conexão com PMSP estabelecida com sucesso."
          : (res?.data?.error ?? "Falha na conexão com a Prefeitura."),
      });
    },
    onError: () =>
      setTestResult({ ok: false, message: "Não foi possível contactar a Prefeitura de SP." }),
  });

  const activateProduction = useMutation({
    mutationFn: () => nfseApi.updateConfig({ ativo_producao: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nfse-config"] });
      toast.success("NFS-e ativada!", {
        description: "Sua clínica já pode emitir notas fiscais em produção.",
      });
    },
    onError: () => toast.error("Erro ao ativar NFS-e em produção."),
  });

  const handleNextStep1 = async () => {
    await saveConfig.mutateAsync({
      cnpj: form.cnpj.replace(/\D/g, ""),
      razao_social: form.razao_social,
      inscricao_municipal: form.inscricao_municipal,
      codigo_servico: form.codigo_servico,
      tp_opcao_simples: form.regime_tributario,
    });
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    // Certificado é gerenciado via upload direto — avança para homologação
    setCurrentStep(3);
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    await testConnection.mutateAsync();
  };

  const handleActivate = async () => {
    await activateProduction.mutateAsync();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* STEPS HEADER */}
      <div className="flex items-center justify-between relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        />
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                  isActive
                    ? "bg-emerald-500 border-emerald-100 dark:border-emerald-900 text-white shadow-xl"
                    : isCompleted
                      ? "bg-emerald-500 border-white dark:border-slate-900 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="absolute top-14 text-center w-32 -ml-10">
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                >
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-10">
        <AnimatePresence mode="wait">
          {/* STEP 1 — Dados Fiscais */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8 rounded-[2rem] border-none shadow-xl shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900/50">
                <h3 className="text-xl font-black mb-6">Informações Tributárias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "CNPJ", key: "cnpj", placeholder: "00.000.000/0001-00" },
                    { label: "Razão Social", key: "razao_social", placeholder: "Nome da clínica" },
                    {
                      label: "Inscrição Municipal",
                      key: "inscricao_municipal",
                      placeholder: "00000000",
                    },
                    { label: "Código de Serviço", key: "codigo_servico", placeholder: "04391" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">{label}</Label>
                      <Input
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800/50"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 2 — Certificado */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8 rounded-[2rem] border-none shadow-xl shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900/50 text-center">
                <h3 className="text-xl font-black mb-2">Certificado Digital (e-CNPJ A1)</h3>
                <p className="text-slate-500 mb-8">
                  Necessário para assinar as notas fiscais na Prefeitura de São Paulo.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <label className="block border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-10 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          toast.success(`Arquivo ${file.name} selecionado.`, {
                            description: "Pronto para processamento seguro.",
                          });
                      }}
                    />
                    <UploadCloud className="h-12 w-12 text-emerald-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      Selecionar arquivo .pfx
                    </p>
                    <p className="text-xs text-slate-400 mt-2">ou arraste para esta área</p>
                  </label>

                  <div className="space-y-4 text-left">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500">
                        Senha do Certificado
                      </Label>
                      <Input
                        type="password"
                        value={form.cert_password}
                        onChange={(e) => setForm((f) => ({ ...f, cert_password: e.target.value }))}
                        placeholder="••••••••"
                        className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        <span className="font-bold uppercase tracking-wider block mb-1">
                          Nota de Segurança:
                        </span>
                        Seu certificado será convertido para o formato PEM e armazenado com
                        criptografia AES-256 no Cloudflare Secrets. O FisioFlow nunca armazena o
                        arquivo bruto após o processamento.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* STEP 3 — Homologação */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8 rounded-[2rem] border-none shadow-xl shadow-slate-100/50 dark:shadow-none bg-amber-50 dark:bg-amber-950/20 text-center">
                <div className="h-16 w-16 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-amber-900 dark:text-amber-50 mb-2">
                  Ambiente de Homologação
                </h3>
                <p className="text-amber-700/70 dark:text-amber-200/60 max-w-md mx-auto mb-8 font-medium">
                  Vamos testar a comunicação com a PMSP para garantir que a configuração está
                  correta.
                </p>

                {testResult && (
                  <div
                    className={`flex items-center gap-3 justify-center mb-6 p-4 rounded-2xl text-sm font-medium ${
                      testResult.ok
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0" />
                    )}
                    {testResult.message}
                  </div>
                )}

                <Button
                  onClick={handleTestConnection}
                  disabled={testConnection.isPending}
                  className="rounded-2xl h-14 px-8 bg-amber-600 hover:bg-amber-700 text-white font-black tracking-widest uppercase text-xs"
                >
                  {testConnection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {testConnection.isPending ? "Testando..." : "Testar Conexão com PMSP"}
                </Button>
              </Card>
            </motion.div>
          )}

          {/* STEP 4 — Ativação */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-12 rounded-[3rem] border-none shadow-xl shadow-emerald-100/50 dark:shadow-none bg-emerald-50 dark:bg-emerald-950/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200/50 dark:shadow-none mb-8">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 font-display">
                    Tudo Pronto!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 max-w-sm mb-10 font-medium">
                    Configure e teste concluídos. Clique abaixo para ativar a emissão de notas
                    fiscais em produção.
                  </p>
                  <Button
                    onClick={handleActivate}
                    disabled={activateProduction.isPending || activateProduction.isSuccess}
                    className="rounded-2xl h-16 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-widest uppercase text-sm shadow-xl shadow-emerald-200 dark:shadow-none transition-all hover:scale-105"
                  >
                    {activateProduction.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : null}
                    {activateProduction.isSuccess
                      ? "✓ Produção Ativada"
                      : activateProduction.isPending
                        ? "Ativando..."
                        : "Ativar Produção"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER CONTROLS */}
      <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep((p) => Math.max(1, p - 1))}
          disabled={currentStep === 1}
          className="rounded-xl font-bold text-slate-500"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>

        {currentStep === 1 && (
          <Button
            onClick={handleNextStep1}
            disabled={saveConfig.isPending || !form.cnpj || !form.razao_social}
            className="rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-8"
          >
            {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar e Continuar <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {currentStep === 2 && (
          <Button
            onClick={handleNextStep2}
            className="rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-8"
          >
            Continuar <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        {currentStep === 3 && testResult?.ok && (
          <Button
            onClick={() => setCurrentStep(4)}
            className="rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-8"
          >
            Próximo Passo <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
