import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type NFSe, statusConfig } from "./types";

interface NFSeTableProps {
  nfses: NFSe[];
  isLoading: boolean;
  onSelect: (nfse: NFSe) => void;
}

export function NFSeTable({ nfses, isLoading, onSelect }: NFSeTableProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 dark:shadow-none overflow-hidden">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30">
        <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">
          Fluxo de Documentos
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400"
          >
            Filtrar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400"
          >
            Exportar
          </Button>
        </div>
      </div>
      <ScrollArea className="max-h-[600px]">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-10">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="px-10 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">
                Nº / Emissão
              </TableHead>
              <TableHead className="px-8 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">
                Destinatário
              </TableHead>
              <TableHead className="px-8 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">
                Valor Bruto
              </TableHead>
              <TableHead className="px-8 py-6 font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">
                Situação PMSP
              </TableHead>
              <TableHead className="px-10 py-6 text-right font-black text-[9px] uppercase tracking-[0.3em] text-slate-400">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-32">
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: "linear",
                      }}
                    >
                      <Clock className="h-10 w-10 text-slate-200" />
                    </motion.div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      Sincronizando registros...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : nfses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-32 text-slate-400">
                  <p className="text-sm font-bold opacity-30">
                    Nenhum documento emitido nesta competência.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              nfses.map((nfse, idx) => {
                const status = statusConfig[nfse.status] || statusConfig.rascunho;
                const StatusIcon = status.icon;
                return (
                  <motion.tr
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={nfse.id}
                    className="group border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300"
                  >
                    <TableCell className="px-10 py-8">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-lg tracking-tighter leading-none">
                          {nfse.numero}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(nfse.data_emissao).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-8">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-slate-200 truncate max-w-[280px] tracking-tight">
                          {nfse.destinatario.nome}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-slate-400 mt-1">
                          {nfse.destinatario.cnpj_cpf.replace(
                            /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                            "$1.$2.$3-$4",
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-8">
                      <span className="font-black text-slate-900 dark:text-white text-base">
                        R${" "}
                        {nfse.valor.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="px-8 py-8">
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl shadow-sm border border-transparent transition-all group-hover:shadow-md",
                          status.bg,
                          status.color,
                        )}
                      >
                        <StatusIcon
                          className={cn(
                            "h-3.5 w-3.5",
                            nfse.status === "aguardando_prefeitura" ? "animate-spin" : "",
                          )}
                        />
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                          {status.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-2">
                        {nfse.link_nfse && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group/btn border border-transparent hover:border-slate-100"
                            onClick={() => window.open(nfse.link_nfse, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 text-slate-400 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all group/btn border border-transparent hover:border-slate-100"
                          onClick={() => onSelect(nfse)}
                        >
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover/btn:text-slate-900 dark:group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
