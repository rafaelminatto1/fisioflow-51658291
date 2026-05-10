import { useState, useEffect } from "react";
import {
  useContasFinanceiras,
  useCreateContaFinanceira,
  useUpdateContaFinanceira,
  useResumoFinanceiro,
  ContaFinanceira,
} from "@/hooks/useContasFinanceiras";

interface UseContasFinanceirasLogicProps {
  initialTab: "receber" | "pagar";
  lockType: boolean;
}

export function useContasFinanceirasLogic({ initialTab, lockType }: UseContasFinanceirasLogicProps) {
  const [tab, setTab] = useState<"receber" | "pagar">(initialTab);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);

  const [formData, setFormData] = useState({
    tipo: "receber" as "receber" | "pagar",
    descricao: "",
    valor: "",
    data_vencimento: "",
    categoria: "",
    forma_pagamento: "",
    observacoes: "",
  });

  const { data: contas = [], isLoading } = useContasFinanceiras(tab, statusFilter || undefined);
  const { data: resumo } = useResumoFinanceiro();
  const createMutation = useCreateContaFinanceira();
  const updateMutation = useUpdateContaFinanceira();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleOpenDialog = (conta?: ContaFinanceira) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        tipo: conta.tipo,
        descricao: conta.descricao,
        valor: String(conta.valor),
        data_vencimento: conta.data_vencimento,
        categoria: conta.categoria || "",
        forma_pagamento: conta.forma_pagamento || "",
        observacoes: conta.observacoes || "",
      });
    } else {
      setEditingConta(null);
      setFormData({
        tipo: lockType ? initialTab : tab,
        descricao: "",
        valor: "",
        data_vencimento: "",
        categoria: "",
        forma_pagamento: "",
        observacoes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      valor: parseFloat(formData.valor),
      status: "pendente" as const,
      parcelas: 1,
      parcela_atual: 1,
      recorrente: false,
      data_pagamento: null,
      patient_id: null,
      fornecedor_id: null,
    };

    if (editingConta) {
      await updateMutation.mutateAsync({ id: editingConta.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleQuitar = async (conta: ContaFinanceira) => {
    await updateMutation.mutateAsync({
      id: conta.id,
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
    });
  };

  return {
    tab,
    setTab,
    statusFilter,
    setStatusFilter,
    isDialogOpen,
    setIsDialogOpen,
    editingConta,
    formData,
    setFormData,
    contas,
    isLoading,
    resumo,
    createMutation,
    updateMutation,
    handleOpenDialog,
    handleSubmit,
    handleQuitar,
  };
}
