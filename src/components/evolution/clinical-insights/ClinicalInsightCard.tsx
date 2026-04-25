import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, AlertTriangle, ShieldAlert, Check, X, Info } from "lucide-react";
import { ActionRule } from "@/data/clinicalReasoningRules";

interface ClinicalInsightCardProps {
  type: "protocol" | "exercise" | "precaution" | "alert";
  title: string;
  content: string;
  priority: "high" | "medium" | "low";
  reasoning?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export const ClinicalInsightCard: React.FC<ClinicalInsightCardProps> = ({
  type,
  title,
  content,
  priority,
  reasoning,
  onAccept,
  onDismiss,
}) => {
  const getStyles = () => {
    switch (type) {
      case "alert":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/50",
          icon: <ShieldAlert className="text-red-500" />,
          label: "Alerta Crítico",
        };
      case "precaution":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/50",
          icon: <AlertTriangle className="text-amber-500" />,
          label: "Precaução",
        };
      case "exercise":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/50",
          icon: <Lightbulb className="text-blue-500" />,
          label: "Sugestão",
        };
      default:
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/50",
          icon: <Info className="text-emerald-500" />,
          label: "Protocolo",
        };
    }
  };

  const styles = getStyles();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg} p-4 shadow-lg backdrop-blur-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="mt-1 flex-shrink-0">{styles.icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                {styles.label}
              </span>
              {priority === "high" && (
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
              )}
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {content}
            </p>

            {reasoning && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] font-medium text-blue-500 hover:underline">
                  Por que isso foi sugerido?
                </summary>
                <p className="mt-1 text-[10px] italic leading-tight text-slate-500 dark:text-slate-500">
                  {reasoning}
                </p>
              </details>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onAccept}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
            title="Aceitar sugestão"
          >
            <Check size={16} />
          </button>
          <button
            onClick={onDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-transform hover:scale-110 active:scale-95 dark:bg-slate-800 dark:text-slate-400"
            title="Ignorar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Subtle progress indicator for priority */}
      <div
        className={`absolute bottom-0 left-0 h-1 bg-current opacity-20 ${styles.border.replace("border-", "bg-")}`}
        style={{ width: priority === "high" ? "100%" : priority === "medium" ? "60%" : "30%" }}
      />
    </motion.div>
  );
};
