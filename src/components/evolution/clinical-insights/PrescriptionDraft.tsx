import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Trash2, Send, ChevronRight } from "lucide-react";

interface PrescriptionItem {
  id: string;
  title: string;
  type: string;
  data: any;
}

interface PrescriptionDraftProps {
  items: PrescriptionItem[];
  onRemoveItem: (index: number) => void;
  onFinalize: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const PrescriptionDraft: React.FC<PrescriptionDraftProps> = ({
  items,
  onRemoveItem,
  onFinalize,
  isOpen,
  setIsOpen,
}) => {
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-0 top-1/2 z-50 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-l-xl bg-blue-600 text-white shadow-xl transition-all hover:w-12 ${items.length > 0 ? "animate-bounce" : ""}`}
      >
        <div className="relative">
          <ClipboardList size={20} />
          {items.length > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
              {items.length}
            </span>
          )}
        </div>
      </button>

      {/* Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-[60] h-screen w-80 border-l border-slate-200 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80"
          >
            <div className="flex h-full flex-col p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="text-blue-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rascunho</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="mt-20 flex flex-col items-center text-center opacity-40">
                    <ClipboardList size={48} className="mb-4" />
                    <p className="text-sm">Nenhum exercício ou protocolo selecionado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {items.map((item, idx) => (
                        <motion.div
                          key={`${item.id}-${idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="group relative flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-800"
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase text-blue-500">
                              {item.type}
                            </span>
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                          </div>
                          <button
                            onClick={() => onRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <button
                  onClick={onFinalize}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <Send size={18} />
                  Finalizar Prescrição
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/10 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
