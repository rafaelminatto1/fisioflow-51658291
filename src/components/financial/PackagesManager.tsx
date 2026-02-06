import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Package, Plus, Edit, Trash2, Users, Calendar, DollarSign } from 'lucide-react';
import { useSessionPackages, useCreatePackage, useUpdatePackage, useDeactivatePackage, type SessionPackage } from '@/hooks/usePackages';
import { formatCurrency } from '@/lib/utils';

interface PackageFormData {
    name: string;
    description: string;
    sessions_count: number;
    price: number;
    validity_days: number;
}

const initialFormData: PackageFormData = {
    name: '',
    description: '',
    sessions_count: 10,
    price: 0,
    validity_days: 90,
};

export function PackagesManager() {
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
                description: pkg.description || '',
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
        if (confirm('Deseja realmente desativar este pacote?')) {
            await deactivatePackage.mutateAsync(id);
        }
    };

    const activePackages = packages.filter(p => p.is_active);
    const inactivePackages = packages.filter(p => !p.is_active);

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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Pacote
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingPackage ? 'Editar Pacote' : 'Novo Pacote'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingPackage
                                    ? 'Atualize as informações do pacote'
                                    : 'Crie um novo pacote de sessões'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Pacote</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Pacote 10 Sessões"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Descrição do pacote..."
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sessions">Nº de Sessões</Label>
                                    <Input
                                        id="sessions"
                                        type="number"
                                        min={1}
                                        value={formData.sessions_count}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            sessions_count: parseInt(e.target.value) || 0
                                        }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">Valor (R$)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={formData.price}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            price: parseFloat(e.target.value) || 0
                                        }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="validity">Validade (dias)</Label>
                                <Input
                                    id="validity"
                                    type="number"
                                    min={1}
                                    value={formData.validity_days}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        validity_days: parseInt(e.target.value) || 30
                                    }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Quantidade de dias que o paciente tem para usar as sessões após a compra
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createPackage.isPending || updatePackage.isPending}
                            >
                                {editingPackage ? 'Salvar' : 'Criar Pacote'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{activePackages.length}</p>
                            <p className="text-sm text-muted-foreground">Pacotes Ativos</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {formatCurrency(activePackages.reduce((sum, p) => sum + p.price, 0) / Math.max(1, activePackages.length))}
                            </p>
                            <p className="text-sm text-muted-foreground">Ticket Médio</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {Math.round(activePackages.reduce((sum, p) => sum + p.sessions_count, 0) / Math.max(1, activePackages.length))}
                            </p>
                            <p className="text-sm text-muted-foreground">Média de Sessões</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Packages Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Pacotes Disponíveis</CardTitle>
                    <CardDescription>
                        Lista de todos os pacotes de sessões cadastrados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : packages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-40" />
                            <p>Nenhum pacote cadastrado</p>
                            <p className="text-sm">Crie seu primeiro pacote clicando no botão acima</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead className="text-center">Sessões</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-center">Validade</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {packages.map((pkg) => (
                                    <TableRow key={pkg.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{pkg.name}</p>
                                                {pkg.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {pkg.description}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{pkg.sessions_count} sessões</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(pkg.price)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="flex items-center justify-center gap-1 text-sm">
                                                <Calendar className="h-3 w-3" />
                                                {pkg.validity_days} dias
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={pkg.is_active ? 'default' : 'outline'}>
                                                {pkg.is_active ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleOpenDialog(pkg)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {pkg.is_active && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive hover:text-destructive"
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
                    )}
                </CardContent>
            </Card>

            {/* Inactive Packages */}
            {inactivePackages.length > 0 && (
                <Card className="opacity-70">
                    <CardHeader>
                        <CardTitle className="text-lg">Pacotes Inativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {inactivePackages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                                >
                                    <div>
                                        <p className="font-medium">{pkg.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {pkg.sessions_count} sessões • {formatCurrency(pkg.price)}
                                        </p>
                                    </div>
                                    <Badge variant="outline">Inativo</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
