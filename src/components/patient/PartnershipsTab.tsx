import React, { useState, useMemo } from "react";
import {
  Handshake,
  Plus,
  Search,
  Users,
  UserCheck,
  GraduationCap,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePartnerships } from "@/hooks/usePartnerships";
import { PartnershipModal } from "./PartnershipModal";
import type { Partnership, Patient } from "@/types";
import { toast } from "@/hooks/use-toast";
import { usePatientsPageData } from "@/hooks/usePatientsPage";
import { formatCurrency } from "@/lib/utils";

export const PartnershipsTab: React.FC = () => {
  const { partnerships, isLoading, deletePartnership } = usePartnerships();
  const { data: patientsData } = usePatientsPageData({});
  const allPatients: Patient[] = patientsData?.patients || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartnership, setEditingPartnership] = useState<Partnership | null>(null);
  const [expandedPartnershipId, setExpandedPartnershipId] = useState<string | null>(null);

  const filteredPartnerships = useMemo(() => {
    if (!searchTerm.trim()) return partnerships;
    const lower = searchTerm.toLowerCase();
    return partnerships.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower))
    );
  }, [partnerships, searchTerm]);

  // General metrics
  const totalPartnerships = partnerships.length;
  const totalStudents = partnerships.reduce((acc, p) => acc + (p.totalStudents || 0), 0);
  const totalProfessors = partnerships.reduce((acc, p) => acc + (p.totalProfessors || 0), 0);
  const totalPatientsInPartnerships = totalStudents + totalProfessors;

  const handleEdit = (partnership: Partnership) => {
    setEditingPartnership(partnership);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPartnership(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (partnership: Partnership) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a parceria "${partnership.name}"? Os pacientes vinculados continuarão cadastrados.`
      )
    ) {
      return;
    }

    try {
      await deletePartnership(partnership.id);
      toast({
        title: "Parceria excluída",
        description: `A parceria "${partnership.name}" foi removida com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível remover a parceria.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Gestão de Parcerias e Convênios
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre empresas parceiras, estúdios e academias. Defina valores por sessão para alunos e regras para professores.
          </p>
        </div>

        <Button
          onClick={handleCreate}
          className="h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Parceria
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Parcerias Ativas
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {totalPartnerships}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Pacientes em Parceria
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {totalPatientsInPartnerships}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Alunos / Clientes
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalStudents}
              </p>
              <p className="text-[10px] font-medium text-slate-400">Pagam sessão avulsa fixada</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Professores / Colaboradores
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {totalProfessors}
              </p>
              <p className="text-[10px] font-medium text-slate-400">Isenção / Valor especial</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar parceria por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-800 text-xs"
          />
        </div>
      </div>

      {/* Partnerships List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          Carregando parcerias cadastradas...
        </div>
      ) : filteredPartnerships.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <Handshake className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhuma parceria encontrada
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? "Nenhum resultado corresponde à sua busca."
              : "Cadastre parcerias para definir preços padronizados de sessão para alunos e isenção para professores."}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreate} className="mt-4 h-10 rounded-xl font-bold text-xs">
              <Plus className="mr-2 h-4 w-4" /> Cadastrar Primeira Parceria
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPartnerships.map((partnership) => {
            const isExpanded = expandedPartnershipId === partnership.id;
            const partnershipPatients = allPatients.filter(
              (p) =>
                p.partnership_id === partnership.id ||
                p.partnershipId === partnership.id ||
                (p.partner_company_name &&
                  p.partner_company_name.toLowerCase() === partnership.name.toLowerCase())
            );

            return (
              <Card
                key={partnership.id}
                className="rounded-3xl border-slate-200 dark:border-slate-800 bg-card overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary mt-0.5 shrink-0">
                        <Handshake className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {partnership.name}
                          </h3>
                          {partnership.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-black uppercase tracking-wider">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-500/10 text-slate-500 border-none text-[10px] font-black uppercase tracking-wider">
                              Inativa
                            </Badge>
                          )}
                        </div>
                        {partnership.description && (
                          <p className="text-xs text-slate-500 mt-1 max-w-xl">
                            {partnership.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(partnership)}
                        className="h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold"
                      >
                        <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(partnership)}
                        className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Rules grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Sessão Aluno / Cliente
                      </p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(partnership.studentSessionFee)}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Sessão Professor / Instrutor
                      </p>
                      {partnership.professorPays ? (
                        <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                          {formatCurrency(partnership.professorSessionFee)}
                        </p>
                      ) : (
                        <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                          Gratuito (R$ 0,00)
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Pacientes Vinculados
                        </p>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {partnership.totalPatients || partnershipPatients.length} pessoas
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedPartnershipId(isExpanded ? null : partnership.id)
                        }
                        className="h-8 rounded-xl px-2.5 text-xs font-bold text-primary hover:bg-primary/10"
                      >
                        {isExpanded ? (
                          <>
                            Ocultar <ChevronDown className="ml-1 h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            Ver Pacientes <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Patients List */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Pacientes nesta Parceria ({partnershipPatients.length})
                      </h4>

                      {partnershipPatients.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Nenhum paciente vinculado diretamente a esta parceria ainda. Edite a ficha do paciente para selecionar a etiqueta da parceria.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {partnershipPatients.map((patient) => {
                            const isProf =
                              patient.partnership_role === "professor" ||
                              patient.partnershipRole === "professor";

                            const sessionPrice = isProf
                              ? partnership.professorPays
                                ? partnership.professorSessionFee
                                : 0
                              : partnership.studentSessionFee;

                            return (
                              <div
                                key={patient.id}
                                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between"
                              >
                                <div className="space-y-1 min-w-0 pr-2">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {patient.name || patient.full_name}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isProf ? (
                                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none text-[9px] font-bold">
                                        Professor / Colaborador
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none text-[9px] font-bold">
                                        Aluno / Cliente
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="text-xs font-black text-slate-900 dark:text-white">
                                    {formatCurrency(sessionPrice)}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">
                                    Sessão
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      <PartnershipModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partnershipToEdit={editingPartnership}
      />
    </div>
  );
};
