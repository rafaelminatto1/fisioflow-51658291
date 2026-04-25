import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Save,
  Loader2,
} from "lucide-react";
import {
  useSessionPackages,
  useCreatePackage,
  useUpdatePackage,
  useDeactivatePackage,
  type SessionPackage,
} from "@/hooks/usePackages";
import { formatCurrency, cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PackageFormData {
  name: string;
  description: string;
  sessions_count: number;
  price: number;
  validity_days: number;
}

const initialFormData: PackageFormData = {
  name: "",
  description: "",
  sessions_count: 10,
  price: 0,
  validity_days: 90,
};

export function PackagesManager() {
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SessionPackage | null>(null);
  const [formData, setFormData] = useState<PackageFormData>(initialFormData);

  const { data: packages = [], isLoading } = useSessionPackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deactivatePackage = useDeactivatePackage();

  const handleOpenDialog = (pkg?: SessionPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description || "",
        sessions_count: pkg.sessions_count,
        price: pkg.price,
        validity_days: pkg.validity_days,
      });
    } else {
      setEditingPackage(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.sessions_count <= 0 || formData.price <= 0) {
      return;
    }

    if (editingPackage) {
      await updatePackage.mutateAsync({
        id: editingPackage.id,
        ...formData,
      });
    } else {
      await createPackage.mutateAsync(formData);
    }

    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingPackage(null);
  };

  const handleDeactivate = async (id: string) => {
    if (confirm("Deseja realmente desativar este pacote?")) {
      await deactivatePackage.mutateAsync(id);
    }
  };

  const activePackages = packages.filter((p) => p.is_active);
  const inactivePackages = packages.filter((p) => !p.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pacotes de Sessões</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os pacotes disponíveis para venda
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          Novo Pacote
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activePackages.length}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Pacotes Ativos
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  activePackages.reduce((sum, p) => sum + p.price, 0) /
                    Math.max(1, activePackages.length),
                )}
              </p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Ticket Médio
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(
                  activePackages.reduce((sum, p) => sum + p.sessions_count, 0) /
                    Math.max(1, activePackages.length),
                )}
              </p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Média de Sessões
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg">Pacotes Disponíveis</CardTitle>
          <CardDescription>Lista de todos os pacotes de sessões cadastrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-medium">Nenhum pacote cadastrado</p>
              <p className="text-xs">Crie seu primeiro pacote clicando no botão acima</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-bold text-xs">Nome do Pacote</TableHead>
                    <TableHead className="text-center font-bold text-xs">Sessões</TableHead>
                    <TableHead className="text-right font-bold text-xs">Valor</TableHead>
                    <TableHead className="text-center font-bold text-xs">Validade</TableHead>
                    <TableHead className="text-center font-bold text-xs">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id} className="hover:bg-slate-50/50 border-slate-100">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-800">{pkg.name}</p>
                          {pkg.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{pkg.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="rounded-lg bg-blue-50 text-blue-700 border-blue-100 font-medium"
                        >
                          {pkg.sessions_count} sessões
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700">
                        {formatCurrency(pkg.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {pkg.validity_days} dias
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={pkg.is_active ? "default" : "outline"}
                          className={cn(
                            "rounded-lg text-[10px] h-5",
                            pkg.is_active ? "bg-emerald-500" : "text-slate-400",
                          )}
                        >
                          {pkg.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary"
                            onClick={() => handleOpenDialog(pkg)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {pkg.is_active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive"
                              onClick={() => handleDeactivate(pkg.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Packages */}
      {inactivePackages.length > 0 && (
        <Card className="opacity-70 border-slate-100 bg-slate-50/30">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Pacotes Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactivePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white"
                >
                  <div>
                    <p className="font-semibold text-slate-600">{pkg.name}</p>
                    <p className="text-xs text-slate-400">
                      {pkg.sessions_count} sessões • {formatCurrency(pkg.price)}
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-lg text-[10px]">
                    Inativo
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Nova Campanha - Refactored to CustomModal */}
      <CustomModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isMobile={isMobile}
        contentClassName="max-w-md"
      >
        <CustomModalHeader onClose={() => setIsDialogOpen(false)}>
          <CustomModalTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {editingPackage ? "Editar Pacote" : "Novo Pacote de Sessões"}
          </CustomModalTitle>
        </CustomModalHeader>

        <CustomModalBody className="p-0 sm:p-0">
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pkg-name" className="font-bold text-xs">
                Nome do Pacote *
              </Label>
              <Input
                id="pkg-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Pacote 10 Sessões - Pilates"
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-description" className="font-bold text-xs">
                Descrição / Observações
              </Label>
              <Textarea
                id="pkg-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descreva os benefícios ou condições do pacote..."
                rows={2}
                className="rounded-xl border-slate-200 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-sessions" className="font-bold text-xs">
                  Nº de Sessões
                </Label>
                <Input
                  id="pkg-sessions"
                  type="number"
                  min={1}
                  value={formData.sessions_count}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sessions_count: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-price" className="font-bold text-xs">
                  Valor Total (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-medium text-sm">
                    R$
                  </span>
                  <Input
                    id="pkg-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.price}
                    className="pl-9 rounded-xl border-slate-200"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg-validity" className="font-bold text-xs">
                Validade do Crédito (dias)
              </Label>
              <Input
                id="pkg-validity"
                type="number"
                min={1}
                value={formData.validity_days}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    validity_days: parseInt(e.target.value) || 30,
                  }))
                }
                className="rounded-xl border-slate-200"
              />
              <p className="text-[10px] text-slate-400 italic">
                Prazo para o paciente utilizar todas as sessões após a data da compra.
              </p>
            </div>
          </div>
        </CustomModalBody>

        <CustomModalFooter isMobile={isMobile}>
          <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createPackage.isPending || updatePackage.isPending || !formData.name}
            className="rounded-xl px-8 bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-lg"
          >
            {createPackage.isPending || updatePackage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {editingPackage ? "Salvar Alterações" : "Criar Pacote"}
          </Button>
        </CustomModalFooter>
      </CustomModal>
    </div>
  );
}
