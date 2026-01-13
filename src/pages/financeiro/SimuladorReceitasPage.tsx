import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp, Calculator, Plus, Trash2, DollarSign,
  Target, BarChart3, Info, Save
} from 'lucide-react';
import { toast } from 'sonner';

interface ReceitaFixa {
  id: string;
  nome: string;
  valor: number;
  quantidade: number;
  recurring: boolean;
}

interface DespesaFixa {
  id: string;
  nome: string;
  valor: number;
  tipo: 'mensal' | 'trimestral' | 'anual';
}

interface Cenario {
  nome: string;
  aumentoPercentual: number;
  novosAlunos: number;
}

export default function SimuladorReceitasPage() {
  const [receitasFixas, setReceitasFixas] = useState<ReceitaFixa[]>([
    { id: '1', nome: 'Consulta Avulsa', valor: 150, quantidade: 20, recurring: true },
    { id: '2', nome: 'Pacote 10 Sessões', valor: 1200, quantidade: 5, recurring: true },
    { id: '3', nome: 'Avaliação Inicial', valor: 200, quantidade: 8, recurring: true },
  ]);

  const [despesasFixas, setDespesasFixas] = useState<DespesaFixa[]>([
    { id: '1', nome: 'Aluguel', valor: 3000, tipo: 'mensal' },
    { id: '2', nome: 'Contas (Água/Luz/Internet)', valor: 500, tipo: 'mensal' },
    { id: '3', nome: 'Limpeza', valor: 800, tipo: 'mensal' },
    { id: '4', nome: 'Software/Assinaturas', valor: 300, tipo: 'mensal' },
  ]);

  const [novaReceita, setNovaReceita] = useState({ nome: '', valor: '', quantidade: '' });
  const [novaDespesa, setNovaDespesa] = useState({ nome: '', valor: '', tipo: 'mensal' as 'mensal' | 'trimestral' | 'anual' });
  const [cenarioPersonalizado, setCenarioPersonalizado] = useState({ aumento: 0, novosAlunos: 0 });
  const [metaLucro, setMetaLucro] = useState(5000);
  const [horasDisponiveis, setHorasDisponiveis] = useState(160);

  // Cálculos
  const totalReceitas = receitasFixas.reduce((acc, r) => acc + (r.valor * r.quantidade), 0);
  const totalDespesas = despesasFixas.reduce((acc, d) => {
    const fator = d.tipo === 'mensal' ? 1 : d.tipo === 'trimestral' ? 1/3 : 1/12;
    return acc + (d.valor * fator);
  }, 0);
  const lucroAtual = totalReceitas - totalDespesas;
  const margemLucro = totalReceitas > 0 ? (lucroAtual / totalReceitas) * 100 : 0;

  // Cenário otimista (aumento de 20% nas receitas)
  const receitasOtimista = totalReceitas * 1.2;
  const lucroOtimista = receitasOtimista - totalDespesas;

  // Cenário pessimista (redução de 20% nas receitas)
  const receitasPessimista = totalReceitas * 0.8;
  const lucroPessimista = receitasPessimista - totalDespesas;

  // Cenário personalizado
  const fatorAumento = 1 + (cenarioPersonalizado.aumento / 100);
  const receitaPersonalizada = totalReceitas * fatorAumento;
  const receitaNovosAlunos = cenarioPersonalizados.novosAlunos * 150; // média de 150 por aluno
  const totalReceitasPersonalizado = receitaPersonalizada + receitaNovosAlunos;
  const lucroPersonalizado = totalReceitasPersonalizado - totalDespesas;

  // Cálculo de atingimento de meta
  const metaAtingida = lucroAtual >= metaLucro;
  const diferencaMeta = metaLucro - lucroAtual;
  const percentualMeta = (lucroAtual / metaLucro) * 100;

  // Horas ocupadas (assumindo média de 1h por atendimento)
  const totalAtendimentos = receitasFixas.reduce((acc, r) => acc + r.quantidade, 0);
  const taxaOcupacao = (totalAtendimentos / horasDisponiveis) * 100;

  const adicionarReceita = () => {
    if (!novaReceita.nome || !novaReceita.valor || !novaReceita.quantidade) return;
    setReceitasFixas([...receitasFixas, {
      id: Date.now().toString(),
      nome: novaReceita.nome,
      valor: parseFloat(novaReceita.valor),
      quantidade: parseInt(novaReceita.quantidade),
      recurring: true
    }]);
    setNovaReceita({ nome: '', valor: '', quantidade: '' });
    toast.success('Receita adicionada!');
  };

  const adicionarDespesa = () => {
    if (!novaDespesa.nome || !novaDespesa.valor) return;
    setDespesasFixas([...despesasFixas, {
      id: Date.now().toString(),
      nome: novaDespesa.nome,
      valor: parseFloat(novaDespesa.valor),
      tipo: novaDespesa.tipo
    }]);
    setNovaDespesa({ nome: '', valor: '', tipo: 'mensal' });
    toast.success('Despesa adicionada!');
  };

  const removerReceita = (id: string) => {
    setReceitasFixas(receitasFixas.filter(r => r.id !== id));
    toast.success('Receita removida!');
  };

  const removerDespesa = (id: string) => {
    setDespesasFixas(despesasFixas.filter(d => d.id !== id));
    toast.success('Despesa removida!');
  };

  const salvarSimulacao = () => {
    // Aqui você pode implementar a lógica para salvar no banco
    toast.success('Simulação salva com sucesso!');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-8 w-8 text-primary" />
              Simulador de Receitas
            </h1>
            <p className="text-muted-foreground mt-1">Planeje e projeta suas finanças futuras</p>
          </div>
          <Button onClick={salvarSimulacao} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Simulação
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Receitas Previstas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{receitasFixas.length} fontes de receita</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-500" />
                Despesas Fixas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{despesasFixas.length} despesas cadastradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                Lucro Projetado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroAtual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {lucroAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {margemLucro.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Meta de Lucro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metaAtingida ? 'text-green-600' : 'text-orange-600'}`}>
                {percentualMeta.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {!metaAtingida ? `Faltam R$ ${diferencaMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Meta atingida!'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda - Receitas e Despesas */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="receitas" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="receitas">Receitas Fixas</TabsTrigger>
                <TabsTrigger value="despesas">Despesas Fixas</TabsTrigger>
              </TabsList>

              <TabsContent value="receitas" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Adicionar Receita</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1">
                        <Input
                          placeholder="Nome"
                          value={novaReceita.nome}
                          onChange={(e) => setNovaReceita({ ...novaReceita, nome: e.target.value })}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Valor"
                          value={novaReceita.valor}
                          onChange={(e) => setNovaReceita({ ...novaReceita, valor: e.target.value })}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Qtd"
                          value={novaReceita.quantidade}
                          onChange={(e) => setNovaReceita({ ...novaReceita, quantidade: e.target.value })}
                        />
                      </div>
                      <Button onClick={adicionarReceita} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {receitasFixas.map((receita) => (
                    <Card key={receita.id}>
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{receita.nome}</p>
                            <p className="text-sm text-muted-foreground">{receita.quantidade}x</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              R$ {(receita.valor * receita.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">R$ {receita.valor} cada</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerReceita(receita.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="despesas" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Adicionar Despesa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1">
                        <Input
                          placeholder="Nome"
                          value={novaDespesa.nome}
                          onChange={(e) => setNovaDespesa({ ...novaDespesa, nome: e.target.value })}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Valor"
                          value={novaDespesa.valor}
                          onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })}
                        />
                      </div>
                      <div>
                        <Select
                          value={novaDespesa.tipo}
                          onValueChange={(v: 'mensal' | 'trimestral' | 'anual') => setNovaDespesa({ ...novaDespesa, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mensal">Mensal</SelectItem>
                            <SelectItem value="trimestral">Trimestral</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={adicionarDespesa} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {despesasFixas.map((despesa) => {
                    const fator = despesa.tipo === 'mensal' ? 1 : despesa.tipo === 'trimestral' ? 1/3 : 1/12;
                    const valorMensal = despesa.valor * fator;
                    return (
                      <Card key={despesa.id}>
                        <CardContent className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{despesa.nome}</p>
                              <Badge variant="outline" className="text-xs">{despesa.tipo}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-bold text-red-600">
                                R$ {valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">R$ {despesa.valor} {despesa.tipo === 'mensal' ? '/mês' : despesa.tipo === 'trimestral' ? '/trimestre' : '/ano'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerDespesa(despesa.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna da Direita - Configurações e Cenários */}
          <div className="space-y-6">
            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta de Lucro Mensal</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">R$</span>
                    <Input
                      type="number"
                      value={metaLucro}
                      onChange={(e) => setMetaLucro(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Horas Disponíveis/Mês</Label>
                  <Input
                    type="number"
                    value={horasDisponiveis}
                    onChange={(e) => setHorasDisponiveis(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Taxa de ocupação: {taxaOcupacao.toFixed(1)}%</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Atendimentos Totais</Label>
                    <span className="font-semibold">{totalAtendimentos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Ticket Médio</Label>
                    <span className="font-semibold">
                      R$ {(totalReceitas / totalAtendimentos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Lucro por Hora</Label>
                    <span className="font-semibold">
                      R$ {(lucroAtual / horasDisponiveis).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cenários */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cenários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cenário Atual */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Cenário Atual</span>
                    <Badge variant="secondary">Base</Badge>
                  </div>
                  <p className="text-lg font-bold">R$ {lucroAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                {/* Cenário Otimista */}
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Otimista (+20%)</span>
                    <Badge className="bg-green-500">+{((lucroOtimista - lucroAtual) / Math.abs(lucroAtual || 1) * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="text-lg font-bold text-green-600">R$ {lucroOtimista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                {/* Cenário Pessimista */}
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Pessimista (-20%)</span>
                    <Badge variant="destructive">{((lucroPessimista - lucroAtual) / Math.abs(lucroAtual || 1) * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="text-lg font-bold text-red-600">R$ {lucroPessimista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <Separator />

                {/* Cenário Personalizado */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Cenário Personalizado</Label>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Aumento nos preços</span>
                        <span className="font-medium">{cenarioPersonalizado.aumento}%</span>
                      </div>
                      <Slider
                        value={[cenarioPersonalizado.aumento]}
                        onValueChange={(v) => setCenarioPersonalizado({ ...cenarioPersonalizado, aumento: v[0] })}
                        max={50}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Novos alunos</span>
                        <span className="font-medium">{cenarioPersonalizado.novosAlunos}</span>
                      </div>
                      <Slider
                        value={[cenarioPersonalizado.novosAlunos]}
                        onValueChange={(v) => setCenarioPersonalizado({ ...cenarioPersonalizado, novosAlunos: v[0] })}
                        max={20}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <p className="text-sm font-medium mb-1">Resultado do Cenário</p>
                    <p className={`text-lg font-bold ${lucroPersonalizado >= lucroAtual ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {lucroPersonalizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lucroPersonalizado >= lucroAtual
                        ? `+R$ ${(lucroPersonalizado - lucroAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs atual`
                        : `-R$ ${(lucroAtual - lucroPersonalizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs atual`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dicas */}
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Info className="h-4 w-4" />
                  Dicas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                {margemLucro < 30 && (
                  <p>• Sua margem de lucro está baixa. Considere revisar preços ou reduzir custos.</p>
                )}
                {taxaOcupacao > 80 && (
                  <p>• Alta ocupação! Considere aumentar preços ou expandir horários.</p>
                )}
                {taxaOcupacao < 50 && (
                  <p>• Baixa ocupação. Invista em marketing para atrair mais pacientes.</p>
                )}
                {!metaAtingida && (
                  <p>• Para atingir sua meta, você precisa aumentar R$ {diferencaMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} nas receitas.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
