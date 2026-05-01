import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link2, Eye, Plus, Trash2, Loader2, Save, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { profileApi } from "@/api/v2/system";
import { request } from "@/api/v2/base";
import { publicBookingApi } from "@/api/v2/operations";
import type { BookingRequest } from "@/types/workers";

interface PublicService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  color: string;
}

interface PublicProfileData {
  slug: string;
  is_public: boolean;
  specialty: string;
  bio: string;
  avatar_url: string;
  public_services: PublicService[];
}

const PAGES_URL = import.meta.env.VITE_PAGES_URL ?? "https://fisioflow.pages.dev";

export function PublicProfileTab() {
  const queryClient = useQueryClient();

  const { data: profileRes, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => profileApi.me(),
    staleTime: 1000 * 60 * 5,
  });

  const profile = (profileRes?.data ?? {}) as Record<string, any>;

  const [form, setForm] = useState<PublicProfileData>({
    slug: "",
    is_public: false,
    specialty: "",
    bio: "",
    avatar_url: "",
    public_services: [],
  });

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        slug: profile.slug ?? "",
        is_public: Boolean(profile.is_public),
        specialty: profile.specialty ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
        public_services: Array.isArray(profile.public_services) ? profile.public_services : [],
      });
    }
  }, [profileRes]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<PublicProfileData>) =>
      request("/api/profile/me/public", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Perfil público atualizado!");
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: () => toast.error("Erro ao salvar perfil público"),
  });

  const checkSlug = async (slug: string) => {
    if (!slug || slug.length < 2) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    try {
      const res = await fetch(`/api/public-booking/booking/${encodeURIComponent(slug)}`);
      const data = await res.json() as any;
      // If the profile found is the current user's, slug is "available" (it's theirs)
      setSlugAvailable(res.status === 404 || data.data?.user_id === profile.user_id);
    } catch {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const addService = () => {
    setForm((f) => ({
      ...f,
      public_services: [
        ...f.public_services,
        { id: crypto.randomUUID(), name: "", duration_minutes: 50, price: 0, color: "#3b82f6" },
      ],
    }));
  };

  const removeService = (id: string) => {
    setForm((f) => ({
      ...f,
      public_services: f.public_services.filter((s) => s.id !== id),
    }));
  };

  const updateService = (id: string, field: keyof PublicService, value: string | number) => {
    setForm((f) => ({
      ...f,
      public_services: f.public_services.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    }));
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const publicUrl = form.slug ? `${PAGES_URL}/agendar/${form.slug}` : null;

  return (
    <div className="space-y-6">
      {/* Enable public profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Agendamento Público (FisioLink)
          </CardTitle>
          <CardDescription>
            Ative para receber agendamentos diretamente pelo seu link público, sem que os pacientes
            precisem criar conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Ativar perfil público</p>
              <p className="text-xs text-muted-foreground">
                Seu link ficará acessível para qualquer pessoa com o endereço
              </p>
            </div>
            <Switch
              checked={form.is_public}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))}
            />
          </div>

          {form.is_public && publicUrl && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Link2 className="h-4 w-4 text-blue-600 shrink-0" />
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate"
              >
                {publicUrl}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Link copiado!"); }}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slug + profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidade do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Seu link personalizado</Label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted border border-input rounded-l-md">
                {PAGES_URL}/agendar/
              </span>
              <Input
                value={form.slug}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setForm((f) => ({ ...f, slug: v }));
                  setSlugAvailable(null);
                }}
                onBlur={() => checkSlug(form.slug)}
                placeholder="seu-nome"
                className="rounded-l-none"
              />
            </div>
            {checkingSlug && <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>}
            {!checkingSlug && slugAvailable === true && <p className="text-xs text-green-600">Link disponível ✓</p>}
            {!checkingSlug && slugAvailable === false && <p className="text-xs text-destructive">Link já está em uso</p>}
          </div>

          <div className="space-y-2">
            <Label>Especialidade</Label>
            <Input
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
              placeholder="Ex: Fisioterapia Ortopédica"
            />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Apresentação breve para os seus pacientes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Serviços Oferecidos</CardTitle>
            <CardDescription>Serviços que aparecerão na sua página de agendamento</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addService} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.public_services.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum serviço cadastrado. Clique em "Adicionar" para começar.
            </p>
          )}
          {form.public_services.map((svc) => (
            <div key={svc.id} className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-center">
              <Input
                value={svc.name}
                onChange={(e) => updateService(svc.id, "name", e.target.value)}
                placeholder="Nome do serviço"
              />
              <Input
                type="number"
                value={svc.duration_minutes}
                onChange={(e) => updateService(svc.id, "duration_minutes", Number(e.target.value))}
                placeholder="Min"
              />
              <Input
                type="number"
                value={svc.price}
                onChange={(e) => updateService(svc.id, "price", Number(e.target.value))}
                placeholder="R$"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={() => removeService(svc.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {form.public_services.length > 0 && (
            <p className="text-xs text-muted-foreground">Duração em minutos · Preço em reais</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Perfil Público
        </Button>
      </div>

      <Separator />

      <BookingRequestsPanel />
    </div>
  );
}

function BookingRequestsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["booking-requests"],
    queryFn: () => publicBookingApi.listRequests({ status: "pending" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "confirmed" | "rejected" }) =>
      publicBookingApi.updateRequest(id, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["booking-requests"] });
      toast.success(status === "confirmed" ? "Agendamento confirmado!" : "Solicitação recusada.");
    },
    onError: () => toast.error("Erro ao processar solicitação."),
  });

  const requests: BookingRequest[] = (data as any)?.data ?? [];

  const formatDate = (ymd: string) =>
    new Date(ymd + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Solicitações de Agendamento Pendentes
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-1">{requests.length}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Pacientes que solicitaram agendamento via seu link público
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        )}
        {!isLoading && requests.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma solicitação pendente.
          </p>
        )}
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-amber-50/30 border-amber-100">
              <div className="space-y-0.5 min-w-0">
                <p className="font-medium text-sm truncate">{req.patient_name}</p>
                <p className="text-xs text-muted-foreground">{req.patient_phone}</p>
                <p className="text-xs font-medium text-blue-700">
                  {formatDate(req.requested_date)} às {req.requested_time}
                </p>
                {req.notes && <p className="text-xs text-muted-foreground italic truncate">{req.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-green-300 text-green-700 hover:bg-green-50"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: req.id, status: "confirmed" })}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-red-300 text-red-700 hover:bg-red-50"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ id: req.id, status: "rejected" })}
                >
                  <XCircle className="h-3.5 w-3.5" /> Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
