import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePatientPackages } from "@/hooks/usePackages";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, AlertCircle } from "lucide-react";

export function PackageUsageReport() {
    // Fetch all packages (admin view)
    const { data: packages = [], isLoading } = usePatientPackages();

    // Calculations
    const totalPackages = packages.length;
    const activePackages = packages.filter(p => !p.is_expired && (p.sessions_remaining || 0) > 0);
    const expiredPackages = packages.filter(p => p.is_expired);
    const depletedPackages = packages.filter(p => !p.is_expired && (p.sessions_remaining || 0) <= 0);

    const totalRevenue = packages.reduce((sum, p) => sum + p.price_paid, 0);
    const totalSessionsSold = packages.reduce((sum, p) => sum + p.sessions_purchased, 0);
    const totalSessionsUsed = packages.reduce((sum, p) => sum + p.sessions_used, 0);
    const utilizationRate = totalSessionsSold > 0 ? (totalSessionsUsed / totalSessionsSold) * 100 : 0;

    if (isLoading) {
        return <div className="p-8 text-center">Carregando relatório...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold tracking-tight">Relatório de Pacotes</h2>
                <p className="text-muted-foreground">
                    Visão geral de vendas, utilização e status dos pacotes de sessões.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                            {totalPackages} pacotes vendidos
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Taxa de Utilização</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {totalSessionsUsed} de {totalSessionsSold} sessões realizadas
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pacotes Ativos</CardTitle>
                        <Badge variant="default" className="bg-green-500">{activePackages.length}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activePackages.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Pacotes em uso no momento
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expirados/Esgotados</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiredPackages.length + depletedPackages.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {expiredPackages.length} expirados, {depletedPackages.length} esgotados
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Sales Table */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Vendas Recentes</CardTitle>
                    <CardDescription>
                        Lista detalhada dos últimos pacotes adquiridos pelos pacientes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Pacote</TableHead>
                                <TableHead>Data Compra</TableHead>
                                <TableHead>Progresso</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packages.slice(0, 10).map((pkg) => (
                                <TableRow key={pkg.id}>
                                    <TableCell className="font-medium">{(pkg as any).patient_name || 'Paciente'}</TableCell>
                                    <TableCell>{pkg.package?.name}</TableCell>
                                    <TableCell>{new Date(pkg.purchased_at).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">
                                                {pkg.sessions_used}/{pkg.sessions_purchased}
                                            </span>
                                            <div className="h-2 w-16 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${(pkg.sessions_used / pkg.sessions_purchased) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            pkg.is_expired ? 'destructive' :
                                                pkg.status === 'depleted' ? 'secondary' :
                                                    'default'
                                        }>
                                            {pkg.is_expired ? 'Expirado' :
                                                pkg.status === 'depleted' ? 'Esgotado' :
                                                    'Ativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(pkg.price_paid)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
