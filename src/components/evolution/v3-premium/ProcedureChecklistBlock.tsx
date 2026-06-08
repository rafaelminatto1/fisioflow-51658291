"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Search,
  GripVertical,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ProcedureItem,
  ProcedureCategory,
  PROCEDURE_CATEGORY_LABELS,
  COMMON_PROCEDURES,
} from "../v2-improved/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ProcedureChecklistBlockProps {
  procedures: ProcedureItem[];
  onChange: (procedures: ProcedureItem[]) => void;
}

const CATEGORY_COLORS: Record<
  ProcedureCategory,
  { bg: string; text: string; border: string; glow: string }
> = {
  liberacao_miofascial: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/20",
  },
  mobilizacao: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/20",
  },
  eletroterapia: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/20",
  },
  laser: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    border: "border-rose-500/20",
    glow: "shadow-rose-500/20",
  },
  ultrassom: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-500",
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/20",
  },
  crioterapia: {
    bg: "bg-sky-500/10",
    text: "text-sky-500",
    border: "border-sky-500/20",
    glow: "shadow-sky-500/20",
  },
  termoterapia: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    glow: "shadow-orange-500/20",
  },
  bandagem: {
    bg: "bg-teal-500/10",
    text: "text-teal-500",
    border: "border-teal-500/20",
    glow: "shadow-teal-500/20",
  },
  outro: {
    bg: "bg-slate-500/10",
    text: "text-slate-500",
    border: "border-slate-500/20",
    glow: "shadow-slate-500/20",
  },
};

export function ProcedureChecklistBlock({ procedures, onChange }: ProcedureChecklistBlockProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !isFocused &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused]);

  const completedCount = procedures.filter((p) => p.completed).length;
  const totalCount = procedures.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Handle completion confetti
  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount) {
      const end = Date.now() + 1000;
      const colors = ["#10b981", "#3b82f6", "#f59e0b"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [completedCount, totalCount]);

  const toggleProcedure = (id: string) => {
    const newProcedures = procedures.map((p) =>
      p.id === id ? { ...p, completed: !p.completed } : p,
    );
    onChange(newProcedures);
  };

  const removeProcedure = (id: string) => {
    onChange(procedures.filter((p) => p.id !== id));
  };

  const addProcedure = (name: string, category: ProcedureCategory = "outro") => {
    const newProcedure: ProcedureItem = {
      id: Math.random().toString(36).substring(7),
      name,
      completed: true,
      category,
    };
    onChange([...procedures, newProcedure]);
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const filteredSuggestions = COMMON_PROCEDURES.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !procedures.some((existing) => existing.name === p.name),
  ).slice(0, 5);

  const onReorder = (newOrder: ProcedureItem[]) => {
    onChange(newOrder);
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto p-1" ref={containerRef}>
      {/* Header & Progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Procedimentos Executados</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Marque o que foi realizado nesta sessão
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Liquid Progress Bar */}
        <div className="relative h-2 w-full bg-secondary/30 rounded-full overflow-hidden border border-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-blue-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        </div>
      </div>

      {/* Procedures List */}
      <div className="relative">
        <Reorder.Group axis="y" values={procedures} onReorder={onReorder} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {procedures.map((procedure) => {
              return (
                <Reorder.Item
                  key={procedure.id}
                  value={procedure}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className={cn(
                    "group relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300",
                    "border border-white/5",
                    procedure.completed
                      ? "bg-card shadow-inner"
                      : "bg-card shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                    "cursor-default",
                  )}
                >
                  <button
                    onClick={() => toggleProcedure(procedure.id)}
                    className="relative flex-shrink-0 focus:outline-none"
                  >
                    <AnimatePresence mode="wait">
                      {procedure.completed ? (
                        <motion.div
                          key="checked"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                        >
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="unchecked"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                        >
                          <Circle className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>

                  <div className="flex-grow flex items-center justify-between min-w-0 gap-3">
                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          "text-sm font-medium transition-all duration-500 truncate",
                          procedure.completed
                            ? "text-muted-foreground/80 line-through decoration-emerald-500/50 decoration-2"
                            : "text-foreground",
                        )}
                      >
                        {procedure.name}
                      </span>
                      {procedure.category && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              procedure.category === "liberacao_miofascial"
                                ? "bg-emerald-500"
                                : procedure.category === "mobilizacao"
                                  ? "bg-blue-500"
                                  : procedure.category === "eletroterapia"
                                    ? "bg-amber-500"
                                    : "bg-slate-400",
                            )}
                          />
                          <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">
                            {PROCEDURE_CATEGORY_LABELS[procedure.category]}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() => removeProcedure(procedure.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>

          {procedures.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl border-2 border-dashed border-white/5 bg-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-primary/40" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-[200px]">
                Nenhum procedimento registrado. Comece adicionando um abaixo.
              </p>
            </motion.div>
          )}
        </Reorder.Group>
      </div>

      {/* Smart Input Area */}
      <div className="relative pt-4">
        <div
          className={cn(
            "relative flex items-center gap-2 p-2 rounded-2xl transition-all duration-500",
            "border-2 shadow-2xl",
            isFocused
              ? "bg-card border-primary/40 ring-4 ring-primary/10 shadow-primary/10"
              : "bg-card border-white/10",
          )}
        >
          <Search
            className={cn(
              "w-5 h-5 ml-2 transition-colors duration-300",
              isFocused ? "text-primary" : "text-muted-foreground",
            )}
          />
          <Input
            ref={inputRef}
            placeholder="Adicionar procedimento (ex: TENS, Liberação...)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (suggestionIndex >= 0 && filteredSuggestions[suggestionIndex]) {
                  addProcedure(
                    filteredSuggestions[suggestionIndex].name,
                    filteredSuggestions[suggestionIndex].category,
                  );
                } else if (searchTerm.trim()) {
                  addProcedure(searchTerm.trim());
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSuggestionIndex((prev) =>
                  prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
              } else if (e.key === "Escape") {
                setShowSuggestions(false);
              }
            }}
            className="border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground/50 h-11"
          />
          {searchTerm.trim() && (
            <Button
              size="sm"
              onClick={() => addProcedure(searchTerm.trim())}
              className="rounded-xl px-4 h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 mr-1"
            >
              Adicionar
            </Button>
          )}
        </div>

        {/* Suggestions Popover */}
        <AnimatePresence>
          {showSuggestions &&
            (searchTerm.trim() || isFocused) &&
            filteredSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.98 }}
                className="absolute bottom-full mb-3 left-0 right-0 p-2 bg-black/80 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    Sugestões Inteligentes
                  </span>
                  <Sparkles className="w-3 h-3 text-primary/50" />
                </div>
                <div className="mt-1">
                  {filteredSuggestions.map((suggestion, idx) => {
                    const catConfig = CATEGORY_COLORS[suggestion.category];
                    return (
                      <button
                        key={idx}
                        onClick={() => addProcedure(suggestion.name, suggestion.category)}
                        onMouseEnter={() => setSuggestionIndex(idx)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all group text-left",
                          suggestionIndex === idx ? "bg-card" : "hover:bg-card",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "p-1.5 rounded-lg border",
                              catConfig.bg,
                              catConfig.border,
                            )}
                          >
                            <ChevronRight className={cn("w-3 h-3", catConfig.text)} />
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium transition-colors",
                              suggestionIndex === idx ? "text-primary" : "group-hover:text-primary",
                            )}
                          >
                            {suggestion.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] uppercase border-white/10 bg-transparent",
                            catConfig.text,
                          )}
                        >
                          {PROCEDURE_CATEGORY_LABELS[suggestion.category]}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Quick Tips */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/40 font-medium uppercase tracking-tighter">
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-card font-sans">
            {" "}
            /{" "}
          </kbd>
          <span>para focar</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-card" />
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Enter para adicionar</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-card" />
        <span>Arraste para reordenar</span>
        <div className="w-1 h-1 rounded-full bg-card" />
        <span>Confete ao completar 100%</span>
      </div>
    </div>
  );
}
