import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Loader2, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { gamificationApi, type WeeklyChallengeRow } from "@/api/v2";

type WeeklyChallenge = WeeklyChallengeRow;
const TARGET_TYPES = [
  { value: "sessions", label: "Sessões Completadas" },
  { value: "quests", label: "Missões Diárias" },
  { value: "streak", label: "Dias de Sequência" },
  { value: "exercises", label: "Exercícios Realizados" },
];

export default function ChallengesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<WeeklyChallenge | null>(null);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["admin-challenges"],
    queryFn: async () => (await gamificationApi.weeklyChallenges.list()).data ?? [],
  });

  const upsertChallenge = useMutation({
    mutationFn: async (values: Partial<WeeklyChallenge>) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        xp_reward: values.xp_reward || 200,
        point_reward: values.point_reward || 50,
        start_date: values.start_date,
        end_date: values.end_date,
        target: values.target,
        icon: values.icon || "Target",
        is_active: values.is_active ?? true,
      };
      if (editingChallenge?.id)
        return (await gamificationApi.weeklyChallenges.update(editingChallenge.id, payload)).data;
      return (await gamificationApi.weeklyChallenges.create(payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      setIsDialogOpen(false);
      setEditingChallenge(null);
      toast({ title: "Sucesso", description: "Desafio salvo com sucesso!" });
    },
    onError: (error: Error) =>
      toast({
        title: "Erro",
        description: `Falha ao salvar desafio: ${error.message}`,
        variant: "destructive",
      }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, currentState }: { id: string; currentState: boolean }) =>
      gamificationApi.weeklyChallenges.setActive(id, !currentState),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-challenges"] }),
  });

  const deleteChallenge = useMutation({
    mutationFn: async (id: string) => gamificationApi.weeklyChallenges.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-challenges"] });
      toast({ title: "Removido", description: "Desafio removido com sucesso" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    upsertChallenge.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      xp_reward: Number(formData.get("xp_reward") as string),
      point_reward: Number(formData.get("point_reward") as string),
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      target: {
        type: formData.get("target_type") as string,
        count: Number(formData.get("target_count") as string),
      },
      icon: "Target",
      is_active: true,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            Desafios Semanais
          </CardTitle>
          <CardDescription>Crie e acompanhe desafios ativos para os pacientes</CardDescription>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingChallenge(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Desafio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingChallenge ? "Editar Desafio" : "Novo Desafio"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" required defaultValue={editingChallenge?.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingChallenge?.description || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="xp_reward">XP</Label>
                  <Input
                    id="xp_reward"
                    name="xp_reward"
                    type="number"
                    required
                    defaultValue={editingChallenge?.xp_reward || 200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="point_reward">Pontos</Label>
                  <Input
                    id="point_reward"
                    name="point_reward"
                    type="number"
                    required
                    defaultValue={editingChallenge?.point_reward || 50}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Início</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    required
                    defaultValue={editingChallenge?.start_date?.slice(0, 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fim</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    required
                    defaultValue={editingChallenge?.end_date?.slice(0, 10)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta</Label>
                  <select
                    name="target_type"
                    defaultValue={editingChallenge?.target?.type || "sessions"}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {TARGET_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_count">Quantidade</Label>
                  <Input
                    id="target_count"
                    name="target_count"
                    type="number"
                    required
                    defaultValue={editingChallenge?.target?.count || 1}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={upsertChallenge.isPending}>
                  {upsertChallenge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => {
              const days = differenceInDays(
                parseISO(challenge.end_date),
                parseISO(challenge.start_date),
              );
              return (
                <div
                  key={challenge.id}
                  className="border rounded-xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="font-semibold truncate">{challenge.title}</p>
                      <Badge variant="outline">+{challenge.xp_reward} XP</Badge>
                      <Badge variant="secondary">+{challenge.point_reward} pts</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>
                        {format(parseISO(challenge.start_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}{" "}
                        -{" "}
                        {format(parseISO(challenge.end_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                      <span>
                        {challenge.target?.type}: {challenge.target?.count || 0}
                      </span>
                      <span>{days + 1} dias</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={challenge.is_active ?? true}
                      onCheckedChange={() =>
                        toggleActive.mutate({
                          id: challenge.id,
                          currentState: challenge.is_active ?? true,
                        })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingChallenge(challenge);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteChallenge.mutate(challenge.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
