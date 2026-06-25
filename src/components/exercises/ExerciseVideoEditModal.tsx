import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VIDEO_CATEGORIES,
  VIDEO_DIFFICULTY,
  BODY_PARTS,
  EQUIPMENT_OPTIONS,
  type ExerciseVideo,
} from "@/services/exerciseVideos";

interface ExerciseVideoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: ExerciseVideo | null;
  onSave: (updates: {
    title: string;
    description: string | null;
    category: string;
    difficulty: string;
    body_parts: string[];
    equipment: string[];
  }) => Promise<void> | void;
  isSaving?: boolean;
}

export function ExerciseVideoEditModal({
  open,
  onOpenChange,
  video,
  onSave,
  isSaving = false,
}: ExerciseVideoEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !video) return;
    setTitle(video.title);
    setDescription(video.description || "");
    setCategory(video.category);
    setDifficulty(video.difficulty);
    setBodyParts(video.body_parts || []);
    setEquipment(video.equipment || []);
  }, [open, video]);

  const toggleBodyPart = (part: string) => {
    setBodyParts((prev) => (prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]));
  };

  const toggleEquipment = (eq: string) => {
    setEquipment((prev) => (prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]));
  };

  const handleClose = () => onOpenChange(false);

  const handleSave = async () => {
    if (!video) return;
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      category,
      difficulty,
      body_parts: bodyParts,
      equipment,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Mídia</DialogTitle>
          <DialogDescription>Atualize as informações da mídia de exercício</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Título do Exercício <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: Rotação de Ombro com Bastão"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva o exercício, objetivo e cuidados importantes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500 caracteres
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Categoria <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Dificuldade <span className="text-destructive">*</span>
              </Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_DIFFICULTY.map((diff) => (
                    <SelectItem key={diff} value={diff}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Partes do Corpo</Label>
            <div className="flex flex-wrap gap-2">
              {BODY_PARTS.map((part) => (
                <Badge
                  key={part}
                  variant={bodyParts.includes(part) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-primary/20",
                    bodyParts.includes(part) &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  onClick={() => toggleBodyPart(part)}
                >
                  {part.charAt(0).toUpperCase() + part.slice(1)}
                  {bodyParts.includes(part) && <Check className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Equipamentos Necessários</Label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <Badge
                  key={eq}
                  variant={equipment.includes(eq) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-primary/20",
                    equipment.includes(eq) && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                  onClick={() => toggleEquipment(eq)}
                >
                  {eq.charAt(0).toUpperCase() + eq.slice(1)}
                  {equipment.includes(eq) && <Check className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={title.trim().length < 3 || isSaving}>
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
