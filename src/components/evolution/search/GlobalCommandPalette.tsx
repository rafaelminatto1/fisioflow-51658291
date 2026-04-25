import React, { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import {
  Search,
  User,
  Phone,
  ClipboardList,
  Loader2,
  X,
  ArrowRight,
  Plus,
  Calendar,
  Settings,
  HelpCircle,
  Receipt,
  Activity,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { patientsApi } from "@/api/v2/patients";
import { exercisesApi, protocolsApi } from "@/api/v2/exercises";
import { patientRoutes } from "@/lib/routing/appRoutes";
import type { PatientRow, Exercise, Protocol } from "@/types/workers";

export const GlobalCommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientRow[]>([]);
  const [exerciseResults, setExerciseResults] = useState<Exercise[]>([]);
  const [protocolResults, setProtocolResults] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Atalho Cmd+K ou Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  useEffect(() => {
    const openPalette = () => setOpen(true);

    document.addEventListener("open-command-palette", openPalette);
    return () => document.removeEventListener("open-command-palette", openPalette);
  }, []);

  const performGlobalSearch = useCallback(async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setExerciseResults([]);
      setProtocolResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [patientsRes, exercisesRes, protocolsRes] = await Promise.all([
        patientsApi.list({ search: trimmedQuery, limit: 5 }),
        exercisesApi.list({ q: trimmedQuery, limit: 5 }),
        protocolsApi.list({ q: trimmedQuery, limit: 5 }),
      ]);

      setResults(patientsRes.data ?? []);
      setExerciseResults(exercisesRes.data ?? []);
      setProtocolResults(protocolsRes.data ?? []);
    } catch (error) {
      console.error("Global search error:", error);
      // Não limpamos resultados anteriores em caso de erro para não quebrar a UX
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performGlobalSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performGlobalSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-black/5">
        <Command label="Global Search" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <div className="flex items-center px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-4" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar paciente por nome, telefone ou CPF..."
              className="flex-1 h-16 bg-transparent border-none outline-none text-base font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 font-mono text-[10px] font-black text-slate-500 shadow-sm uppercase">
                ESC
              </kbd>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <Command.List className="max-h-[50vh] overflow-y-auto p-3 scrollbar-hide">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="relative">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <User className="w-3.5 h-3.5 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Buscando pacientes...
                </p>
              </div>
            )}

            {!isLoading && results.length === 0 && query.trim().length > 1 && (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Nenhum resultado para "{query}"
                </p>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                  Tente buscar por nome, telefone ou CPF
                </p>
              </div>
            )}

            {!isLoading && results.length === 0 && query.trim().length < 2 && (
              <Command.Empty className="py-16 text-center">
                <p className="text-sm font-bold text-slate-400">
                  Comece a digitar para pesquisar pacientes.
                </p>
              </Command.Empty>
            )}

            {!isLoading && query.trim().length === 0 && (
              <>
                <Command.Group
                  heading={
                    <span className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 block">
                      Ações Rápidas
                    </span>
                  }
                >
                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      navigate("/agenda");
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 group"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-blue-200 dark:group-aria-selected:border-blue-800 transition-all">
                      <Calendar className="w-5 h-5 text-slate-400 group-aria-selected:text-blue-600 dark:group-aria-selected:text-blue-400" />
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                      Ver Agenda Clínica
                    </p>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      navigate("/pacientes/novo");
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 group"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-blue-200 dark:group-aria-selected:border-blue-800 transition-all">
                      <Plus className="w-5 h-5 text-slate-400 group-aria-selected:text-blue-600 dark:group-aria-selected:text-blue-400" />
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                      Cadastrar Novo Paciente
                    </p>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      navigate("/financial");
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-emerald-50 dark:aria-selected:bg-emerald-900/20 group"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-emerald-200 dark:group-aria-selected:border-emerald-800 transition-all">
                      <Receipt className="w-5 h-5 text-slate-400 group-aria-selected:text-emerald-600 dark:group-aria-selected:text-emerald-400" />
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                      Financeiro & Faturamento (Workbench)
                    </p>
                  </Command.Item>

                  <Command.Item
                    onSelect={() => {
                      setOpen(false);
                      navigate("/configuracoes");
                    }}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 group"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-blue-200 dark:group-aria-selected:border-blue-800 transition-all">
                      <Settings className="w-5 h-5 text-slate-400 group-aria-selected:text-blue-600 dark:group-aria-selected:text-blue-400" />
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                      Configurações do Sistema
                    </p>
                  </Command.Item>
                </Command.Group>
              </>
            )}

            {results.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 block">
                    Pacientes encontrados
                  </span>
                }
              >
                {results.map((patient) => (
                  <Command.Item
                    key={patient.id}
                    value={`${patient.full_name} ${patient.phone ?? ""} ${patient.cpf ?? ""}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate(patientRoutes.profile(patient.id));
                    }}
                    className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 group hover:translate-x-1"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-blue-200 dark:group-aria-selected:border-blue-800 group-aria-selected:shadow-md transition-all">
                      <User className="w-5 h-5 text-slate-400 group-aria-selected:text-blue-600 dark:group-aria-selected:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone || "Sem telefone"}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                            {patient.status || "Paciente"}
                          </span>
                        </div>
                        {patient.main_condition && (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-[9px] font-bold rounded-full text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 truncate max-w-[12rem]">
                            {patient.main_condition}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {patient.full_name}
                      </p>
                      {patient.email && (
                        <p className="text-xs font-medium text-slate-400 truncate">
                          {patient.email}
                        </p>
                      )}
                    </div>
                    <div className="self-center opacity-0 group-aria-selected:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {protocolResults.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 block">
                    Protocolos Clínicos
                  </span>
                }
              >
                {protocolResults.map((protocol) => (
                  <Command.Item
                    key={protocol.id}
                    onSelect={() => {
                      setOpen(false);
                      navigate(`/protocols/${protocol.id}`);
                    }}
                    className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-purple-50 dark:aria-selected:bg-purple-900/20 group hover:translate-x-1"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-purple-200 dark:group-aria-selected:border-purple-800 transition-all">
                      <BookOpen className="w-5 h-5 text-slate-400 group-aria-selected:text-purple-600 dark:group-aria-selected:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-purple-600 uppercase">
                          {protocol.type || "Protocolo"}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {protocol.name}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {exerciseResults.length > 0 && (
              <Command.Group
                heading={
                  <span className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 block">
                    Exercícios & Biblioteca
                  </span>
                }
              >
                {exerciseResults.map((exercise) => (
                  <Command.Item
                    key={exercise.id}
                    onSelect={() => {
                      setOpen(false);
                      navigate(`/exercises/${exercise.id}`);
                    }}
                    className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all aria-selected:bg-orange-50 dark:aria-selected:bg-orange-900/20 group hover:translate-x-1"
                  >
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group-aria-selected:border-orange-200 dark:group-aria-selected:border-orange-800 transition-all">
                      <Activity className="w-5 h-5 text-slate-400 group-aria-selected:text-orange-600 dark:group-aria-selected:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-orange-600 uppercase">
                          {exercise.category || "Exercício"}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                        {exercise.name}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="h-5 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-black text-slate-400">
                  ↑↓
                </kbd>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Navegar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="h-5 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-black text-slate-400">
                  ENTER
                </kbd>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Abrir</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Abrir prontuário
              </span>
              <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Paciente
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
};
