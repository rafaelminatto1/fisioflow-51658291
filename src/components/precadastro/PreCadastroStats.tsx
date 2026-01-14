import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Clock, CheckCircle, Users, Activity } from 'lucide-react';

interface StatsProps {
    tokens: any[];
    precadastros: any[];
}

export const PreCadastroStats = ({ tokens, precadastros }: StatsProps) => {
    const activeTokens = tokens?.filter(t => t.ativo).length || 0;
    const pending = precadastros?.filter(p => p.status === 'pendente').length || 0;
    const approved = precadastros?.filter(p => p.status === 'aprovado').length || 0;
    const total = precadastros?.length || 0;
    const conversionRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Link2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Links Ativos</p>
                            <p className="text-2xl font-bold">{activeTokens}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pendentes</p>
                            <p className="text-2xl font-bold">{pending}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Aprovados</p>
                            <p className="text-2xl font-bold">{approved}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Activity className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Conversão</p>
                            <p className="text-2xl font-bold">{conversionRate}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-2 md:col-span-1">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Users className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">{total}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
