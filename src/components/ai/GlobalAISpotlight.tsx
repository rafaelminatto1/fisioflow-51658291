import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BrainCircuit,
  Search,
  User,
  Calendar,
  FileText,
  Dumbbell,
  Sparkles,
  BookOpen,
  ArrowRight,
  Stethoscope,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { patientsApi } from "@/api/v2/patients";
import type { PatientRow } from "@/types/workers";

const QUICK_CLINICAL_QUERIES = [
  {
    label: "Protocolo P.O. Reconstrução de LCA (Semanas 1-4)",
    query: "anterior cruciate ligament rehabilitation guideline",
    type: "pubmed",
  },
  {
    label: "Tendinopatia do Manguito Rotador (Isométricos vs Isotônicos)",
    query: "rotator cuff tendinopathy exercise evidence",
    type: "pubmed",
  },
  {
    label: "Manejo Fisioterapêutico Hérnia Discal Lumbar L4-L5",
    query: "lumbar radiculopathy physical therapy CPG",
    type: "pubmed",
  },
  {
    label: "Critérios de Alta e Retorno ao Esporte no LCA",
    query: "return to sport criteria ACL evidence",
    type: "pubmed",
  },
];

export function GlobalAISpotlight() {
  const [open, setOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const navigate = useNavigate();

  // Acionador via Atalho Cmd+K ou Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Busca dinâmica de pacientes quando digita @ ou pesquisa
  useEffect(() => {
    if (!open) return;
    const cleanSearch = inputQuery.replace(/^@/, "").trim();
    if (cleanSearch.length < 2) {
      setPatients([]);
      return;
    }

    let active = true;
    setLoadingPatients(true);
    patientsApi
      .list({ search: cleanSearch, limit: 6 })
      .then((res) => {
        if (active) setPatients(res.data || []);
      })
      .catch(() => {
        if (active) setPatients([]);
      })
      .finally(() => {
        if (active) setLoadingPatients(false);
      });

    return () => {
      active = false;
    };
  }, [inputQuery, open]);

  const handleSelectPatient = (patient: PatientRow, action: "view" | "copilot" | "schedule") => {
    setOpen(false);
    if (action === "view") {
      navigate(`/pacientes/${patient.id}`);
    } else if (action === "copilot") {
      navigate(`/inteligencia?tab=copilot&patientId=${patient.id}&q=${encodeURIComponent(`Resumo clínico e próximas sessões do paciente ${patient.full_name}`)}`);
    } else if (action === "schedule") {
      navigate(`/agenda?patientId=${patient.id}&openModal=true`);
    }
  };

  const handleRunClinicalQuery = (queryText: string) => {
    setOpen(false);
    navigate(`/inteligencia?tab=knowledge&q=${encodeURIComponent(queryText)}`);
  };

  const isPatientMention = inputQuery.startsWith("@");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center border-b px-3 bg-slate-50/50 dark:bg-slate-900/50">
        <Sparkles className="mr-2 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
        <CommandInput
          placeholder="Digite @paciente, faça uma pergunta clínica ou escolha um comando..."
          value={inputQuery}
          onValueChange={setInputQuery}
          className="border-none focus:ring-0 text-sm font-semibold"
        />
        <Badge variant="outline" className="ml-2 text-[10px] font-black border-teal-500/30 text-teal-700 bg-teal-500/10">
          IA SPOTLIGHT
        </Badge>
      </div>

      <CommandList className="max-h-[380px] p-2 font-[Nunito,sans-serif]">
        <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
          {isPatientMention ? (
            <p>Buscando paciente no Neon DB...</p>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold text-slate-700">Pressione Enter para consultar no Copiloto de IA</p>
              <button
                type="button"
                onClick={() => handleRunClinicalQuery(inputQuery)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
              >
                <BrainCircuit className="h-3.5 w-3.5" /> Pesquisar "{inputQuery}" na Central de IA
              </button>
            </div>
          )}
        </CommandEmpty>

        {/* Lista de Pacientes (@paciente) */}
        {(isPatientMention || patients.length > 0) && (
          <CommandGroup heading="👤 Pacientes (Neon DB)">
            {loadingPatients && <p className="px-2 py-1 text-xs text-muted-foreground">Carregando pacientes...</p>}
            {patients.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => handleSelectPatient(p, "copilot")}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-bold text-xs">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{p.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.main_condition || "Fisioterapia Ortopédica"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPatient(p, "copilot");
                    }}
                    className="rounded-md bg-teal-500/10 px-2 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-500/20"
                  >
                    Consultar IA
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPatient(p, "view");
                    }}
                    className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Prontuário
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-2" />

        {/* Evidências & Diretrizes Ortopédicas */}
        <CommandGroup heading="📚 Dúvidas Clínicas & PubMed Ouro">
          {QUICK_CLINICAL_QUERIES.map((item) => (
            <CommandItem
              key={item.query}
              onSelect={() => handleRunClinicalQuery(item.query)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-500/10 text-[10px]">
                PUBMED
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* Atalhos Rápidos da Central */}
        <CommandGroup heading="⚡ Atalhos Rápido do Sistema">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate("/inteligencia?tab=copilot");
            }}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
          >
            <BrainCircuit className="h-4 w-4 text-teal-600" />
            <span>Abrir Copiloto Clínico em Tempo Real</span>
          </CommandItem>

          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate("/inteligencia?tab=studio");
            }}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
          >
            <Stethoscope className="h-4 w-4 text-blue-600" />
            <span>Abrir Studio IA (Audio Scribe & Evolução SOAP)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate("/agenda");
            }}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-amber-600" />
            <span>Ir para Agenda Inteligente</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
