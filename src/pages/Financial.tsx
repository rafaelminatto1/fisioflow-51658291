import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  AlertCircle,
  Plus,
  Download,
  Filter
} from 'lucide-react';

const Financial = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Mock financial data
  const financialStats = {
    totalRevenue: 15750.00,
    pendingPayments: 2340.00,
    monthlyGrowth: 12.5,
    paidAppointments: 42,
    totalAppointments: 47
  };

  const recentTransactions = [
    {
      id: '1',
      patientName: 'Maria Silva',
      service: 'Fisioterapia',
      amount: 120.00,
      status: 'Pago',
      date: new Date(),
      paymentMethod: 'Cartão'
    },
    {
      id: '2',
      patientName: 'João Santos',
      service: 'Reavaliação',
      amount: 150.00,
      status: 'Pendente',
      date: new Date(),
      paymentMethod: 'Dinheiro'
    },
    {
      id: '3',
      patientName: 'Ana Costa',
      service: 'Consulta Inicial',
      amount: 180.00,
      status: 'Pago',
      date: new Date(Date.now() - 86400000),
      paymentMethod: 'PIX'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-100 text-green-700';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-700';
      case 'Atrasado':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie cobranças e acompanhe sua receita</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Relatório
            </Button>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nova Cobrança
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Período:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {financialStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-3">
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-sm text-green-600 font-medium">+{financialStats.monthlyGrowth}%</span>
                <span className="text-sm text-muted-foreground ml-1">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {financialStats.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {financialStats.totalAppointments - financialStats.paidAppointments} consultas pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Pagamento</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round((financialStats.paidAppointments / financialStats.totalAppointments) * 100)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {financialStats.paidAppointments} de {financialStats.totalAppointments} consultas pagas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(financialStats.totalRevenue / financialStats.paidAppointments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">Por consulta realizada</p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Management Tabs */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="pending">Pendências</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Transações Recentes
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{transaction.patientName}</p>
                          <p className="text-sm text-muted-foreground">{transaction.service}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {transaction.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions
                    .filter(t => t.status === 'Pendente')
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{transaction.patientName}</p>
                            <p className="text-sm text-muted-foreground">{transaction.service}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.date.toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Cobrar
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Financeiras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Valores por Tipo de Consulta</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <span>Consulta Inicial</span>
                      <span className="font-medium">R$ 180,00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <span>Fisioterapia</span>
                      <span className="font-medium">R$ 120,00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <span>Reavaliação</span>
                      <span className="font-medium">R$ 150,00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <span>Consulta de Retorno</span>
                      <span className="font-medium">R$ 100,00</span>
                    </div>
                  </div>
                  <Button className="mt-4" variant="outline">
                    Editar Valores
                  </Button>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Métodos de Pagamento</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="pix" defaultChecked />
                      <label htmlFor="pix">PIX</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="cartao" defaultChecked />
                      <label htmlFor="cartao">Cartão de Crédito/Débito</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="dinheiro" defaultChecked />
                      <label htmlFor="dinheiro">Dinheiro</label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Financial;