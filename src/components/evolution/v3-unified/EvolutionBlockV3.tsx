import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Dumbbell, 
  Stethoscope,
  Info,
  MoreVertical,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { EvolutionItemV3, EvolutionBlockV3Props } from "./types";

// Category colors for visual distinction
const CATEGORY_COLORS: Record<string, string> = {
  liberacao_miofascial: "bg-purple-500/10 text-purple-700 border-purple-200",
  mobilizacao: "bg-blue-500/10 text-blue-700 border-blue-200",
  eletroterapia: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  laser: "bg-red-500/10 text-red-700 border-red-200",
  ultrassom: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  crioterapia: "bg-sky-500/10 text-sky-700 border-sky-200",
  termoterapia: "bg-orange-500/10 text-orange-700 border-orange-200",
  bandagem: "bg-pink-500/10 text-pink-700 border-pink-200",
  outro: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  liberacao_miofascial: "Liberação Miofascial",
  mobilizacao: "Mobilização",
  eletroterapia: "Eletroterapia",
  laser: "Laser",
  ultrassom: "Ultrassom",
  crioterapia: "Crioterapia",
  termoterapia: "Termoterapia",
  bandagem: "Bandagem",
  outro: "Outro",
};

export const EvolutionBlockV3: React.FC<EvolutionBlockV3Props> = ({
  items,
  onChange,
  type,
  title,
  icon,
  iconBg,
  accentColor: _accentColor = "primary",
  placeholder,
  disabled = false,
  className
}) => {
  const [newItemName, setNewItemName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [newItemType, setNewItemType] = useState<EvolutionItemType>("procedure");

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getTitle = () => {
    if (title) return title;
    if (type === "unified") return "Sessão de Atendimento";
    return type === "exercise" ? "Exercícios Terapêuticos" : "Procedimentos e Condutas";
  };

  const getIcon = () => {
    if (icon) return icon;
    if (type === "unified") return <Activity className="h-4 w-4" />;
    return type === "exercise" ? <Dumbbell className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />;
  };

  const defaultPlaceholder = type === "exercise" ? "Adicionar novo exercício..." : "Adicionar novo procedimento...";

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    
    const newItem: EvolutionItemV3 = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      completed: true, // Auto-complete when added manually in evolution
      type: type === "unified" ? newItemType : type,
      order: items.length
    };
    
    onChange([...items, newItem]);
    setNewItemName("");
    setExpandedId(newItem.id);
  };

  const handleToggleItem = (id: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<EvolutionItemV3>) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  return (
    <div className={cn(
      "group relative flex flex-col gap-3 p-5 rounded-3xl border border-border/50 bg-card/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-2xl transition-colors duration-300",
            iconBg || (
              type === "unified" ? "bg-primary/10 text-primary" : 
              type === "exercise" ? "bg-blue-500/10 text-blue-600" : 
              "bg-emerald-500/10 text-emerald-600"
            )
          )}>
            {getIcon()}
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight text-foreground/90">{getTitle()}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {completedCount} de {totalCount} concluídos
              </span>
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1.5">
              <span className={cn(
                "text-sm font-bold",
                progress === 100 ? "text-primary" : "text-muted-foreground"
              )}>
                {Math.round(progress)}%
              </span>
              <Progress value={progress} className="h-1.5 w-24 sm:w-32 bg-muted/50 overflow-hidden rounded-full">
                <div 
                  className={cn(
                    "h-full transition-all duration-700 ease-in-out bg-gradient-to-r",
                    type === "unified" ? "from-primary/80 to-primary" :
                    type === "exercise" ? "from-blue-500 to-indigo-500" : "from-emerald-500 to-teal-500"
                  )} 
                  style={{ width: `${progress}%` }} 
                />
              </Progress>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      {!disabled && (
        <div className="flex flex-col gap-2 mt-2">
          {type === "unified" && (
            <div className="flex items-center gap-2 mb-1 px-1">
              <Button
                size="sm"
                variant={newItemType === "procedure" ? "default" : "ghost"}
                onClick={() => setNewItemType("procedure")}
                className={cn(
                  "h-7 rounded-full text-[10px] uppercase font-bold tracking-wider",
                  newItemType === "procedure" && "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                <Stethoscope className="h-3 w-3 mr-1.5" />
                Procedimento
              </Button>
              <Button
                size="sm"
                variant={newItemType === "exercise" ? "default" : "ghost"}
                onClick={() => setNewItemType("exercise")}
                className={cn(
                  "h-7 rounded-full text-[10px] uppercase font-bold tracking-wider",
                  newItemType === "exercise" && "bg-blue-600 hover:bg-blue-700"
                )}
              >
                <Dumbbell className="h-3 w-3 mr-1.5" />
                Exercício
              </Button>
            </div>
          )}
          <div className="relative flex items-center group/input">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder={placeholder || (type === "unified" ? (newItemType === "exercise" ? "Adicionar exercício..." : "Adicionar procedimento...") : defaultPlaceholder)}
              className="pl-10 pr-12 h-12 rounded-2xl bg-muted/30 border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all"
            />
            <Plus className="absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within/input:text-primary" />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
              className="absolute right-1.5 h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2.5 mt-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-dashed border-border/60 bg-muted/10">
            <div className="p-3 rounded-full bg-muted/20 mb-3">
              <Activity className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground font-medium text-center">
              Nenhum item adicionado ainda
            </p>
            <p className="text-[11px] text-muted-foreground/60 text-center mt-1">
              Adicione os procedimentos realizados ou exercícios prescritos
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group/item relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden",
                item.completed 
                  ? "bg-muted/5 border-border/40" 
                  : "bg-background border-border/60 shadow-sm",
                expandedId === item.id && "ring-1 ring-primary/20 border-primary/30 shadow-md"
              )}
            >
              {/* Row Header */}
              <div className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggleItem(item.id)}
                  disabled={disabled}
                  className="h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                
                <div 
                  className="flex-1 cursor-pointer flex items-center min-w-0"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <span className={cn(
                    "text-sm font-semibold truncate transition-all duration-300 flex items-center gap-2",
                    item.completed && "text-muted-foreground/70 line-through decoration-muted-foreground/30 font-medium"
                  )}>
                    {type === "unified" && (
                      item.type === "exercise" 
                        ? <Dumbbell className="h-3.5 w-3.5 text-blue-500/70 shrink-0" /> 
                        : <Stethoscope className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                    )}
                    {item.name}
                  </span>

                  {/* Procedure metadata badges */}
                  {item.type === "procedure" && (
                    <div className="flex items-center gap-1.5 ml-2">
                      {item.category && item.category !== "outro" && (
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4 font-medium border-0", CATEGORY_COLORS[item.category])}>
                          {CATEGORY_LABELS[item.category]}
                        </Badge>
                      )}
                      {item.intensity && (
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-bold border-yellow-200 bg-yellow-50 text-yellow-700">
                          {item.intensity}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Indicators */}
                  <div className="ml-2 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    {(item.prescription || item.notes) && (
                      <div className="p-1 rounded-md bg-muted/30 text-muted-foreground/70" title="Possui detalhes">
                        <Info className="h-3 w-3" />
                      </div>
                    )}
                    {item.patientFeedback && (
                      <div className="p-1 rounded-md bg-sky-500/10 text-sky-600" title="Possui feedback">
                        <MessageSquare className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                  >
                    {expandedId === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem 
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === item.id && (
                <div className="px-10 pb-4 pt-1 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  {item.type === "exercise" ? (
                    <>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-1">
                          <Dumbbell className="h-3 w-3 text-blue-500" />
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                            Prescrição (Séries, Repetições, Carga)
                          </label>
                        </div>
                        <Input
                          value={item.prescription || ""}
                          onChange={(e) => handleUpdateItem(item.id, { prescription: e.target.value })}
                          placeholder="Ex: 3x12 - 5kg - 30s descanso"
                          className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-blue-500/20 text-sm"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 px-1">
                          <MessageSquare className="h-3 w-3 text-indigo-500" />
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                            Feedback do Paciente
                          </label>
                        </div>
                        <Input
                          value={item.patientFeedback || ""}
                          onChange={(e) => handleUpdateItem(item.id, { patientFeedback: e.target.value })}
                          placeholder="Como o paciente se sentiu? Dor? Facilidade?"
                          className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-indigo-500/20 text-sm"
                          disabled={disabled}
                        />
                      </div>
                    </>
                  ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-1">
                            Intensidade / Parâmetros
                          </label>
                          <Input
                            value={item.intensity || ""}
                            onChange={(e) => handleUpdateItem(item.id, { intensity: e.target.value })}
                            placeholder="Ex: 2.0 J/cm² ou 10mA"
                            className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-emerald-500/20 text-sm"
                            disabled={disabled}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-1">
                            Notas do Procedimento
                          </label>
                          <Input
                            value={item.notes || ""}
                            onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                            placeholder="Detalhes sobre a técnica, tempo ou resposta..."
                            className="h-9 rounded-xl bg-muted/40 border-border/40 focus-visible:ring-emerald-500/20 text-sm"
                            disabled={disabled}
                          />
                        </div>
                      </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
