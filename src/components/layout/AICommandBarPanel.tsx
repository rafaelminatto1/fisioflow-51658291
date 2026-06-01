import { Command } from "cmdk";
import { useChat } from "ai/react";
import {
  Search,
  Sparkles,
  MessageSquare,
  Activity,
  DollarSign,
  X,
  Bot,
  CornerDownLeft,
} from "lucide-react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * Painel pesado do AICommandBar (cmdk + ai/react + framer-motion).
 * Carregado sob demanda via React.lazy quando o usuário abre o Cmd+K —
 * mantém `ai/react`/`cmdk` fora do bundle do app shell.
 */
export default function AICommandBarPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages: _setMessages,
  } = useChat({
    api: "/api/ai-insights/chat",
  });

  const runCommand = (command: () => void) => {
    onClose();
    command();
  };

  const handleSuggestionClick = (text: string) => {
    const fakeEvent = { preventDefault: () => {} } as any;
    handleSubmit(fakeEvent, { data: { message: text } });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop sólido (sem glassmorphism) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Header / Input */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-3 shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <form onSubmit={handleSubmit} className="flex-1 flex items-center">
            <input
              autoFocus
              value={input}
              onChange={handleInputChange}
              placeholder="Pergunte à IA do FisioFlow ou digite um comando..."
              className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 text-lg"
            />
            <button type="submit" className="hidden" />
          </form>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">esc</span>
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Chat View */}
          {messages.length > 0 ? (
            <div className="p-4 space-y-6 bg-white dark:bg-slate-900 min-h-[200px]">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <Avatar className="w-8 h-8 shrink-0 border border-indigo-100 dark:border-indigo-800">
                      <AvatarFallback className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* Command Menu View */
            <Command className="bg-transparent" label="Global Command Menu" shouldFilter={true}>
              <Command.List className="p-2 pb-4">
                <Command.Empty className="py-6 text-center text-sm text-slate-500">
                  Nenhum comando ou resultado encontrado. Tente perguntar à IA.
                </Command.Empty>

                <Command.Group
                  heading="Insights Rápidos (IA)"
                  className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1"
                >
                  <Command.Item
                    onSelect={() => handleSuggestionClick("Quem faltou ontem?")}
                    className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl cursor-pointer transition-colors group"
                  >
                    <MessageSquare className="w-4 h-4 mr-3 text-slate-400 group-hover:text-indigo-500" />
                    Auditoria de faltas (ontem)
                    <CornerDownLeft className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-indigo-400" />
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSuggestionClick("Qual a previsão de receita?")}
                    className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl cursor-pointer transition-colors group"
                  >
                    <DollarSign className="w-4 h-4 mr-3 text-slate-400 group-hover:text-indigo-500" />
                    Previsão de faturamento do mês
                    <CornerDownLeft className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 text-indigo-400" />
                  </Command.Item>
                </Command.Group>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2" />

                <Command.Group
                  heading="Navegação do Sistema"
                  className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1"
                >
                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/patients"))}
                    className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                  >
                    <Search className="w-4 h-4 mr-3 text-slate-400" />
                    Buscar Pacientes...
                  </Command.Item>
                  <Command.Item
                    onSelect={() => runCommand(() => navigate("/ai-hub"))}
                    className="flex items-center px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                  >
                    <Activity className="w-4 h-4 mr-3 text-slate-400" />
                    Abrir AI Analytics Hub
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          )}
        </div>
      </motion.div>
    </div>
  );
}
