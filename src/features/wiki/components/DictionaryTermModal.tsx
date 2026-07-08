import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DictionaryTerm } from "@/hooks/useDictionary";

const formSchema = z.object({
  pt: z.string().min(1, "Termo em português é obrigatório"),
  en: z.string().min(1, "Termo em inglês é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  subcategory: z.string().optional(),
  aliasesPt: z.string().optional(),
  aliasesEn: z.string().optional(),
  descriptionPt: z.string().optional(),
  descriptionEn: z.string().optional(),
});

interface DictionaryTermModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  term?: DictionaryTerm;
  isLoading?: boolean;
}

const CATEGORIES = [
  { id: "muscle", label: "Músculos" },
  { id: "joint", label: "Articulações" },
  { id: "ligament", label: "Ligamentos" },
  { id: "condition", label: "Patologias" },
  { id: "exercise", label: "Exercícios" },
  { id: "test", label: "Testes Clínicos" },
  { id: "movement", label: "Movimentos" },
  { id: "tendon", label: "Tendões" },
  { id: "bone", label: "Ossos" },
  { id: "nerve", label: "Nervos" },
  { id: "equipment", label: "Equipamentos" },
  { id: "medicament", label: "Medicamentos" },
];

export function DictionaryTermModal({
  open,
  onOpenChange,
  onSubmit,
  term,
  isLoading,
}: DictionaryTermModalProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pt: "",
      en: "",
      category: "",
      subcategory: "",
      aliasesPt: "",
      aliasesEn: "",
      descriptionPt: "",
      descriptionEn: "",
    },
  });

  const [isGenerating, setIsGenerating] = React.useState(false);
  const selectedCategory = form.watch("category");

  const handleGenerateAI = async () => {
    const termName = form.getValues("pt");
    if (!termName) {
      toast.error("Preencha o nome do medicamento (PT) primeiro");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-medication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: termName })
      });
      const data = await response.json();
      if (data.summary) form.setValue("descriptionPt", data.summary);
      if (data.sideEffects) form.setValue("descriptionEn", data.sideEffects);
      toast.success("Dados gerados com sucesso!");
    } catch {
      toast.error("Erro ao gerar dados com IA");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (term) {
      form.reset({
        pt: term.pt,
        en: term.en,
        category: term.category,
        subcategory: term.subcategory || "",
        aliasesPt: term.aliasesPt?.join(", ") || "",
        aliasesEn: term.aliasesEn?.join(", ") || "",
        descriptionPt: term.descriptionPt || "",
        descriptionEn: term.descriptionEn || "",
      });
    } else {
      form.reset({
        pt: "",
        en: "",
        category: "",
        subcategory: "",
        aliasesPt: "",
        aliasesEn: "",
        descriptionPt: "",
        descriptionEn: "",
      });
    }
  }, [term, form, open]);

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    const formattedValues = {
      ...values,
      aliasesPt: values.aliasesPt
        ? values.aliasesPt
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      aliasesEn: values.aliasesEn
        ? values.aliasesEn
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };
    onSubmit(formattedValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{term ? "Editar Termo" : "Novo Termo"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termo (PT)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: LCA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termo (EN)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: ACL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria / Região</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Joelho" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="aliasesPt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sinônimos (PT) - Separados por vírgula</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Ligamento Cruzado Anterior, cruzado anterior"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aliasesEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Synonyms (EN) - Separated by comma</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ex: Anterior Cruciate Ligament, anterior cruciate"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descriptionPt"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>
                      {selectedCategory === "medicament" ? "Resumo / Indicação" : "Descrição (PT)"}
                    </FormLabel>
                    {selectedCategory === "medicament" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleGenerateAI}
                        disabled={isGenerating}
                        className="h-7 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
                      >
                        <Wand2 className="h-3 w-3 mr-1" />
                        {isGenerating ? "Gerando..." : "Gerar com IA"}
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea placeholder="Opcional..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedCategory === "medicament" ? "Efeitos Colaterais" : "Description (EN)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Opcional..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar Termo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
