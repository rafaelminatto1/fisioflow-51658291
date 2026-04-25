/**
 * Aniversariantes Page Content - Refactored for Hub
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Cake, Gift, Phone, Mail, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { patientsApi, type PatientRow } from "@/api/v2";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface Aniversariante {
  id: string;
  name: string;
  birth_date: string;
  dia: number;
  idade: number;
  phone: string | null;
  email: string | null;
}

export function AniversariantesContent() {
  const [search, setSearch] = useState("");
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);

  const { data: aniversariantes = [], isLoading } = useQuery({
    queryKey: ["aniversariantes", mesSelecionado],
    queryFn: async () => {
      const res = await patientsApi.list({ status: "ativo", limit: 200, minimal: true });
      const patients = (res?.data ?? []) as PatientRow[];

      return patients
        .filter((p) => {
          if (!p.birth_date) return false;
          const birthDate = new Date(p.birth_date);
          const birthMonth = birthDate.getUTCMonth() + 1;
          return birthMonth === mesSelecionado;
        })
        .map((p) => {
          const birthDate = new Date(p.birth_date!);
          return {
            id: p.id,
            name: p.name ?? p.full_name ?? "Paciente",
            birth_date: p.birth_date!,
            phone: p.phone ?? null,
            email: p.email ?? null,
            dia: birthDate.getUTCDate(),
            idade: new Date().getFullYear() - birthDate.getUTCFullYear(),
          };
        })
        .sort((a, b) => a.dia - b.dia) as Aniversariante[];
    },
  });

  const filteredAniversariantes = aniversariantes.filter((a) => accentIncludes(a.name, search));

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const hoje = new Date().getUTCDate();
  const mesAtual = new Date().getUTCMonth() + 1;
  const aniversariantesHoje = aniversariantes.filter(
    (a) => a.dia === hoje && mesSelecionado === mesAtual,
  );

  return (
    <div className="space-y-10 py-6">
      {/* Celebrate Today Section - Ultra Premium Glass */}
      {aniversariantesHoje.length > 0 && (
        <div className="relative group overflow-hidden rounded-[2.5rem] p-1 bg-gradient-to-r from-blue-500/20 via-primary/20 to-indigo-500/20 shadow-2xl shadow-primary/10 transition-all duration-500 hover:shadow-primary/20">
          <div className="relative z-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2.25rem] p-8 border border-white/40 dark:border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Gift className="h-4 w-4 animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Celebração de Hoje
                  </span>
                </div>
                <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
                  Parabéns aos Aniversariantes! 🎉
                </h2>
                <p className="text-slate-500 font-medium max-w-md">
                  Hoje é um dia especial para seus pacientes. Aproveite para fortalecer o vínculo
                  clínico com uma mensagem especial.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {aniversariantesHoje.map((a) => (
                  <div
                    key={a.id}
                    className="group/card flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 rounded-3xl p-4 border border-primary/10 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/30"
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-primary/30">
                        {a.name[0]}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                      </div>
                    </div>
                    <div className="pr-4">
                      <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">
                        {a.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {a.idade} anos
                        </span>
                      </div>
                    </div>
                    {a.phone && (
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                        asChild
                      >
                        <a
                          href={`https://wa.me/55${a.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Phone className="h-5 w-5" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
      )}

      {/* Month Selector - Horizontal Scrollable Premium Chips */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Filtrar por Mês
          </h3>
          <div className="h-px flex-1 mx-6 bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex flex-wrap gap-2">
          {meses.map((mes, idx) => (
            <motion.div key={mes} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={mesSelecionado === idx + 1 ? "default" : "outline"}
                size="lg"
                onClick={() => setMesSelecionado(idx + 1)}
                className={cn(
                  "rounded-2xl h-14 px-8 text-xs font-black uppercase tracking-widest transition-all duration-300",
                  mesSelecionado === idx + 1
                    ? "bg-primary text-white shadow-xl shadow-primary/30 border-primary scale-105"
                    : "bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500",
                )}
              >
                {mes}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-premium overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Calendário de {meses[mesSelecionado - 1]}
              </h3>
              <p className="text-slate-500 text-sm font-medium mt-1">
                {filteredAniversariantes.length} pacientes celebram este mês
              </p>
            </div>

            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 font-bold text-sm focus:ring-primary/20 focus:border-primary shadow-inner"
              />
            </div>
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-32 w-full bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"
                  />
                ))}
              </div>
            ) : filteredAniversariantes.length === 0 ? (
              <div className="text-center py-32 space-y-4">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">
                  Nenhum aniversariante encontrado
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredAniversariantes.map((a, index) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "group relative overflow-hidden p-6 rounded-3xl border transition-all duration-500",
                      a.dia === hoje && mesSelecionado === mesAtual
                        ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/10"
                        : "bg-white/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-primary/20 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
                    )}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500",
                            a.dia === hoje && mesSelecionado === mesAtual
                              ? "bg-primary text-white shadow-lg shadow-primary/30"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary",
                          )}
                        >
                          {a.dia}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                            {a.name}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            {format(new Date(a.birth_date), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-lg font-black text-[10px] border-slate-200 py-1"
                        >
                          {a.idade} ANOS
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 pt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Contatar Paciente
                      </p>
                      <div className="flex items-center gap-2">
                        {a.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-emerald-500/20"
                            asChild
                          >
                            <a
                              href={`https://wa.me/55${a.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {a.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-blue-500/20"
                            asChild
                          >
                            <a href={`mailto:${a.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Background Decoration for "Today" card */}
                    {a.dia === hoje && mesSelecionado === mesAtual && (
                      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AniversariantesPage() {
  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <AniversariantesContent />
      </div>
    </MainLayout>
  );
}
