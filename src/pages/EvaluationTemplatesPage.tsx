import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Grid, List, ClipboardList } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateCard } from "@/components/evaluation/TemplateCard";
import { EvaluationTemplate } from "@/types/clinical-forms";
import { useEvaluationForms } from "@/hooks/useEvaluationForms";
import { useDeleteEvaluationForm } from "@/hooks/useEvaluationForms";
import { useDuplicateEvaluationForm } from "@/hooks/useEvaluationForms";
import { useToggleFavorite } from "@/hooks/useTemplateFavorites";
import { useIncrementTemplateUsage } from "@/hooks/useTemplateStats";
import { accentIncludes } from "@/lib/utils/bilingualSearch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const CATEGORY_LABELS: Record<string, string> = {
  anamnese: "Anamnese",
  esportiva: "Esportiva",
  ortopedica: "Ortopédica",
  neurologica: "Neurológica",
  respiratoria: "Respiratória",
  avaliacao_postural: "Postural",
  avaliacao_funcional: "Funcional",
  geral: "Geral",
  custom: "Personalizada",
};

export default function EvaluationTemplatesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewTemplate, setPreviewTemplate] = useState<EvaluationTemplate | null>(null);

  const { data: templates = [], isLoading } = useEvaluationForms();
  const deleteMutation = useDeleteEvaluationForm();
  const duplicateMutation = useDuplicateEvaluationForm();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { mutate: incrementUsage } = useIncrementTemplateUsage();

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      accentIncludes(template.nome, searchQuery) ||
      (accentIncludes(template.descricao || "", searchQuery) ?? false);
    const matchesCategory = selectedCategory === "all" || template.tipo === selectedCategory;
    const matchesFavorites = !favoritesOnly || template.is_favorite;

    return matchesSearch && matchesCategory && matchesFavorites;
  });

  const handleToggleFavorite = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      toggleFavorite({
        templateId,
        isFavorite: Boolean(template.is_favorite),
      });
    }
  };

  const handleEdit = (templateId: string) => {
    navigate(`/templates/${templateId}/edit`);
  };

  const handleDuplicate = (templateId: string) => {
    duplicateMutation.mutate(templateId);
  };

  const handleDelete = (templateId: string) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteMutation.mutate(templateId);
    }
  };

  const handlePreview = (template: EvaluationTemplate) => {
    setPreviewTemplate(template);
  };

  const handleUse = (templateId: string) => {
    incrementUsage(templateId);
    navigate(`/patients/new?template=${templateId}`);
  };

  const categories = [
    { value: "all", label: "Todas Categorias" },
    ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando templates...</div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ClipboardList className="h-8 w-8" />
              Templates de Avaliação
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus templates de fichas de avaliação
            </p>
          </div>
          <Button onClick={() => navigate("/templates/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="favorites-only">Apenas favoritos</Label>
                  <Switch
                    id="favorites-only"
                    checked={favoritesOnly}
                    onCheckedChange={setFavoritesOnly}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-r-none ${viewMode === "grid" ? "bg-muted" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-l-none ${viewMode === "list" ? "bg-muted" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {(favoritesOnly || selectedCategory !== "all" || searchQuery) && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {filteredTemplates.length} de {templates.length} templates
            </Badge>
            {favoritesOnly && <Badge variant="outline">Favoritos</Badge>}
            {selectedCategory !== "all" && (
              <Badge variant="outline">
                {CATEGORY_LABELS[selectedCategory] || selectedCategory}
              </Badge>
            )}
            {(favoritesOnly || selectedCategory !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFavoritesOnly(false);
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {filteredTemplates.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Nenhum template encontrado</h3>
                <p className="text-muted-foreground mt-2">
                  {searchQuery || selectedCategory !== "all" || favoritesOnly
                    ? "Tente ajustar os filtros de busca"
                    : "Crie seu primeiro template de avaliação"}
                </p>
              </div>
              {!searchQuery && selectedCategory === "all" && !favoritesOnly && (
                <Button onClick={() => navigate("/templates/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Template
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template as EvaluationTemplate}
                isFavorite={template.is_favorite}
                onToggleFavorite={handleToggleFavorite}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onPreview={handlePreview}
                onUse={handleUse}
              />
            ))}
          </div>
        )}

        {previewTemplate && (
          <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{previewTemplate.nome}</DialogTitle>
                {previewTemplate.descricao && (
                  <DialogDescription>{previewTemplate.descricao}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[previewTemplate.tipo] || previewTemplate.tipo}
                  </Badge>
                </div>
                {previewTemplate.referencias && (
                  <div>
                    <h4 className="font-semibold mb-2">Referências</h4>
                    <p className="text-sm text-muted-foreground">{previewTemplate.referencias}</p>
                  </div>
                )}
                {previewTemplate.fields && previewTemplate.fields.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Campos ({previewTemplate.fields.length})</h4>
                    <div className="space-y-2">
                      {previewTemplate.fields.map((field) => (
                        <div key={field.id} className="p-3 bg-muted rounded-md">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{field.label}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {field.tipo_campo}
                              </Badge>
                              {field.obrigatorio && (
                                <Badge variant="destructive" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                          </div>
                          {field.descricao && (
                            <p className="text-xs text-muted-foreground mt-1">{field.descricao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                    Fechar
                  </Button>
                  <Button onClick={() => handleUse(previewTemplate.id)}>Usar Template</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
