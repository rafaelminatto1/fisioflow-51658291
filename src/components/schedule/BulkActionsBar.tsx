import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, X, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onUpdateStatusSelected: (status: string) => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  onUpdateStatusSelected,
}) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-10 left-1/2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-blue-100/50 dark:border-slate-800/50 shadow-premium-xl rounded-[2rem] px-8 py-4 flex items-center gap-6 z-[100]"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white text-xs font-black rounded-xl w-8 h-8 flex items-center justify-center shadow-lg shadow-blue-500/30">
              {selectedCount}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Selecionados
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                Ações em Massa
              </span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-200/50 dark:bg-slate-700/50" />

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="h-10 px-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border-none font-bold gap-2 transition-all"
              onClick={() => onUpdateStatusSelected("presenca_confirmada")}
            >
              <UserCheck className="w-4 h-4" />
              Confirmar
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border-none font-bold gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mudar Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl p-2 shadow-premium-lg border-blue-100/50 bg-white/95 backdrop-blur-xl"
              >
                <DropdownMenuItem
                  onClick={() => onUpdateStatusSelected("atendido")}
                  className="rounded-xl gap-2 py-2.5"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Marcar como Atendido
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatusSelected("faltou")}
                  className="rounded-xl gap-2 py-2.5"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Marcar como Faltou
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatusSelected("remarcar")}
                  className="rounded-xl gap-2 py-2.5"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Marcar para Remarcar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateStatusSelected("cancelado")}
                  className="rounded-xl gap-2 py-2.5"
                >
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  Marcar como Cancelado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 border-none font-bold gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-red-100/50">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-2xl">
                    Excluir {selectedCount} agendamentos?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    Esta ação é irreversível e removerá permanentemente os registros da sua agenda e
                    histórico financeiro.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="rounded-xl border-slate-200">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 rounded-xl px-6"
                    onClick={onDeleteSelected}
                  >
                    Excluir Permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="h-10 w-px bg-slate-200/50 dark:bg-slate-700/50" />

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all hover:rotate-90"
            onClick={onClearSelection}
            title="Fechar seleção"
          >
            <X className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
