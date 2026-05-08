import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCreateRecibo, valorPorExtenso } from "@/hooks/useRecibos";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import { type ReciboData } from "@/components/financial/ReciboPDF";

export function useReciboForm(pacientes: any[], clinicaConfig: any, receiptConfig: any) {
  const createRecibo = useCreateRecibo();
  const [formData, setFormData] = useState({
    patient_id: "",
    valor: "",
    referente: "",
    cpf_cnpj_pagador: "",
    usar_dados_clinica: true,
    card_last_digits: "",
    is_first_payment: false,
    package_sessions: "10",
    is_package: false,
    data_emissao: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    omit_date: false,
  });

  const handleOCRExtracted = (data: {
    valor: number;
    nome?: string;
    cardLastDigits?: string;
    isFirstPayment?: boolean;
    patientId?: string;
  }) => {
    const isHighValue = data.valor >= 300;

    setFormData((prev) => ({
      ...prev,
      valor: String(data.valor),
      card_last_digits: data.cardLastDigits || "",
      is_first_payment: data.isFirstPayment || false,
      patient_id: data.patientId || prev.patient_id,
      is_package: isHighValue,
      referente: data.nome ? `Pagamento - ${data.nome}` : prev.referente,
    }));

    if (data.nome && !data.patientId) {
      const match = pacientes.find((p) => accentIncludes(p.full_name, data.nome!));
      if (match) {
        setFormData((prev) => ({ ...prev, patient_id: match.id }));
      }
    }

    if (isHighValue) {
      toast("Valor de pacote detectado!", {
        description: "Deseja registrar como um pacote de 5 ou 10 sessões?",
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const valorNumerico = parseFloat(formData.valor);
    if (isNaN(valorNumerico)) return null;

    let pagadorNome = "";
    let pagadorCpf = formData.cpf_cnpj_pagador;

    if (formData.patient_id) {
      const paciente = pacientes.find((p) => p.id === formData.patient_id);
      if (paciente) {
        pagadorNome = paciente.full_name;
        if (!pagadorCpf) pagadorCpf = paciente.cpf;
      }
    }

    const dataEmissao = formData.omit_date ? null : formData.data_emissao;

    const created = await createRecibo.mutateAsync({
      patient_id: formData.patient_id || null,
      valor: valorNumerico,
      valor_extenso: valorPorExtenso(valorNumerico),
      referente: formData.referente,
      data_emissao: dataEmissao || new Date().toISOString(),
      emitido_por: receiptConfig.custom_professional_name || clinicaConfig?.profile?.full_name || "Sistema",
      cpf_cnpj_emitente: clinicaConfig?.profile?.cpf_cnpj,
      assinado: receiptConfig.assinado_padrao,
    });

    // Automacao de cartao
    if (formData.card_last_digits && formData.patient_id) {
      try {
        await fetch("/api/financial/card-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: formData.patient_id,
            cardLastDigits: formData.card_last_digits,
          }),
        });
      } catch (e) {
        console.error("Failed to save card mapping:", e);
      }
    }

    const novoRecibo: ReciboData = {
      numero: created.numero_recibo,
      valor: created.valor,
      valor_extenso: created.valor_extenso ?? valorPorExtenso(valorNumerico),
      referente: created.referente ?? formData.referente,
      dataEmissao: formData.omit_date ? "" : created.data_emissao || formData.data_emissao,
      emitente: {
        nome: formData.usar_dados_clinica
          ? receiptConfig.custom_issuer_name || clinicaConfig?.org?.name || clinicaConfig?.profile?.full_name || "Profissional"
          : receiptConfig.custom_professional_name || clinicaConfig?.profile?.full_name || "Profissional",
        cpfCnpj: created.cpf_cnpj_emitente ?? clinicaConfig?.profile?.cpf_cnpj,
        telefone: clinicaConfig?.profile?.phone,
        email: clinicaConfig?.profile?.email,
        endereco: clinicaConfig?.org?.address,
      },
      pagador: pagadorNome ? { nome: pagadorNome, cpfCnpj: pagadorCpf } : undefined,
      assinado: created.assinado,
      logoUrl: clinicaConfig?.org?.logo_url,
      disclaimer: receiptConfig.disclaimer_text,
      showDisclaimer: receiptConfig.show_disclaimer,
    };

    resetForm();
    return novoRecibo;
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      valor: "",
      referente: "",
      cpf_cnpj_pagador: "",
      usar_dados_clinica: true,
      card_last_digits: "",
      is_first_payment: false,
      package_sessions: "10",
      is_package: false,
      data_emissao: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      omit_date: false,
    });
  };

  return {
    formData,
    setFormData,
    handleOCRExtracted,
    handleSubmit,
    isSubmitting: createRecibo.isPending,
  };
}
