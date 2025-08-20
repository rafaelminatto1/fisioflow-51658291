import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewExerciseModal } from "@/components/modals/NewExerciseModal";
import { useData } from "@/contexts/DataContext";
import { Dumbbell, Search, PlusCircle, Info, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
 type Exercise = {
  id: string;
  name: string;
  area: "Ombro" | "Joelho" | "Coluna" | "Quadril" | "Tornozelo" | "Punho";
  difficulty: "Iniciante" | "Intermediário" | "Avançado";
  equipment: "Nenhum" | "Elástico" | "Halteres" | "Bola" | "Faixa" | "Máquina";
  description: string;
  sets: number;
  reps: number;
};

const AREAS: Exercise["area"][] = [
  "Ombro",
  "Joelho",
  "Coluna",
  "Quadril",
  "Tornozelo",
  "Punho",
];
const DIFFICULTIES: Exercise["difficulty"][] = [
  "Iniciante",
  "Intermediário",
  "Avançado",
];
const EQUIPMENTS: Exercise["equipment"][] = [
  "Nenhum",
  "Elástico",
  "Halteres",
  "Bola",
  "Faixa",
  "Máquina",
];

const MOCK_EXERCISES: Exercise[] = [
  {
    id: "ex1",
    name: "Elevação Lateral",
    area: "Ombro",
    difficulty: "Intermediário",
    equipment: "Halteres",
    description: "Fortalece deltóides laterais, mantendo cotovelos levemente flexionados.",
    sets: 3,
    reps: 12,
  },
  {
    id: "ex2",
    name: "Agachamento com Bola",
    area: "Joelho",
    difficulty: "Iniciante",
    equipment: "Bola",
    description: "Agachamento assistido com bola na parede para estabilidade do joelho.",
    sets: 3,
    reps: 10,
  },
  {
    id: "ex3",
    name: "Prancha Ventral",
    area: "Coluna",
    difficulty: "Intermediário",
    equipment: "Nenhum",
    description: "Ativa core e estabilizadores da coluna. Mantenha alinhamento neutro.",
    sets: 4,
    reps: 30,
  },
  {
    id: "ex4",
    name: "Elevação de Quadril",
    area: "Quadril",
    difficulty: "Iniciante",
    equipment: "Nenhum",
    description: "Fortalece glúteos e cadeia posterior, focando na extensão do quadril.",
    sets: 3,
    reps: 15,
  },
  {
    id: "ex5",
    name: "Flexão Plantar com Faixa",
    area: "Tornozelo",
    difficulty: "Iniciante",
    equipment: "Faixa",
    description: "Fortalece panturrilha e melhora estabilidade do tornozelo.",
    sets: 3,
    reps: 15,
  },
  {
    id: "ex6",
    name: "Extensão de Punho",
    area: "Punho",
    difficulty: "Intermediário",
    equipment: "Elástico",
    description: "Reforço para extensores do punho com elástico de resistência.",
    sets: 3,
    reps: 12,
  },
  {
    id: "ex7",
    name: "Good Morning",
    area: "Coluna",
    difficulty: "Avançado",
    equipment: "Halteres",
    description: "Fortalece eretores da espinha e isquiotibiais. Técnica é essencial.",
    sets: 4,
    reps: 8,
  },
  {
    id: "ex8",
    name: "Abdução de Ombro com Faixa",
    area: "Ombro",
    difficulty: "Iniciante",
    equipment: "Faixa",
    description: "Ativa manguito rotador e deltoide médio com baixa carga.",
    sets: 3,
    reps: 15,
  },
];

const Exercises = () => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("todas");
  const [difficulty, setDifficulty] = useState<string>("todas");
  const [plan, setPlan] = useState<any[]>([]);
  const { exercises } = useData();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Exercícios | FisioFlow";
  }, []);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = q
        ? ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)
        : true;
      const matchesCategory = category === "todas" ? true : ex.category === category;
      const matchesDifficulty =
        difficulty === "todas" ? true : ex.difficulty === difficulty;
      return matchesQuery && matchesCategory && matchesDifficulty;
    });
  }, [query, category, difficulty, exercises]);

  function handleAddToPlan(ex: any) {
    setPlan((prev) => {
      if (prev.some((p) => p.id === ex.id)) return prev;
      return [...prev, ex];
    });
    toast({
      title: "Adicionado ao plano",
      description: `${ex.name} foi incluído no plano atual`,
    });
  }

  function handleClearPlan() {
    setPlan([]);
    toast({ title: "Plano limpo", description: "Todos os exercícios foram removidos." });
  }

  return (
    <MainLayout>
      <main className="space-y-6 animate-fade-in">
        {/* Page header */}
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Exercícios</h1>
          </div>
          <NewExerciseModal
            trigger={
              <Button variant="medical">
                <PlusCircle className="w-4 h-4" />
                Novo Exercício
              </Button>
            }
          />
        </section>

        {/* Filters */}
        <section>
          <Card className="bg-gradient-card border border-border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou área"
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Buscar exercícios"
                  />
                </div>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger aria-label="Filtrar por categoria">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as categorias</SelectItem>
                    <SelectItem value="fortalecimento">Fortalecimento</SelectItem>
                    <SelectItem value="alongamento">Alongamento</SelectItem>
                    <SelectItem value="mobilidade">Mobilidade</SelectItem>
                    <SelectItem value="cardio">Cardiovascular</SelectItem>
                    <SelectItem value="equilibrio">Equilíbrio</SelectItem>
                    <SelectItem value="respiratorio">Respiratório</SelectItem>
                  </SelectContent>
                </Select>

                {/* Difficulty */}
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger aria-label="Filtrar por dificuldade">
                    <SelectValue placeholder="Dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as dificuldades</SelectItem>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Current Plan Summary */}
        {plan.length > 0 && (
          <section>
            <Card className="bg-gradient-card border border-border">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">Plano atual ({plan.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={handleClearPlan}>Limpar</Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {plan.map((p) => (
                    <Badge key={p.id} className="">{p.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Grid */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ex) => (
              <Card key={ex.id} className="bg-gradient-card border border-border hover:shadow-medical transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-foreground">{ex.name}</CardTitle>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge>{ex.category}</Badge>
                        <Badge variant="secondary">{ex.difficulty}</Badge>
                        {ex.equipment && ex.equipment.length > 0 && (
                          <Badge variant="outline">{ex.equipment[0]}</Badge>
                        )}
                      </div>
                    </div>
                    <Dumbbell className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{ex.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Duração: <strong className="text-foreground">{ex.duration}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="soft">
                          <Info className="w-4 h-4" />
                          Visualizar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{ex.name}</DialogTitle>
                          <DialogDescription>
                            Detalhes do exercício e instruções de execução.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-3 text-sm">
                            <p className="text-muted-foreground">{ex.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge>{ex.category}</Badge>
                              <Badge variant="secondary">{ex.difficulty}</Badge>
                              {ex.equipment && ex.equipment.length > 0 && (
                                <Badge variant="outline">{ex.equipment.join(', ')}</Badge>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Instruções:</h4>
                              <p className="text-muted-foreground">{ex.instructions}</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground mb-2">Músculos Alvo:</h4>
                              <div className="flex flex-wrap gap-1">
                                {ex.targetMuscles.map((muscle) => (
                                  <Badge key={muscle} variant="outline" className="text-xs">
                                    {muscle}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button variant="medical" onClick={() => handleAddToPlan(ex)}>
                              <PlusCircle className="w-4 h-4" />
                              Adicionar ao plano
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button variant="medical" onClick={() => handleAddToPlan(ex)}>
                      <PlusCircle className="w-4 h-4" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card className="bg-gradient-card border border-border">
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">Nenhum exercício encontrado com os filtros atuais.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </MainLayout>
  );
};

export default Exercises;
