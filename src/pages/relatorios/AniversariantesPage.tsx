import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/web/ui/table';
import { Cake, Gift, Phone, Mail, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Aniversariante {
  id: string;
  name: string;
  birth_date: string;
  dia: number;
  idade: number;
  phone: string | null;
  email: string | null;
}

export default function AniversariantesPage() {
  const [search, setSearch] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);

  const { data: aniversariantes = [], isLoading } = useQuery({
    queryKey: ['aniversariantes', mesSelecionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, birth_date, phone, email')
        .eq('status', 'ativo')
        .not('birth_date', 'is', null);
      
      if (error) throw error;
      
      // Filtrar por mês e calcular dados
      return (data || [])
        .filter(p => {
          if (!p.birth_date) return false;
          const birthMonth = new Date(p.birth_date).getMonth() + 1;
          return birthMonth === mesSelecionado;
        })
        .map(p => ({
          ...p,
          dia: new Date(p.birth_date!).getDate(),
          idade: new Date().getFullYear() - new Date(p.birth_date!).getFullYear(),
        }))
        .sort((a, b) => a.dia - b.dia) as Aniversariante[];
    },
  });

  const filteredAniversariantes = aniversariantes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const hoje = new Date().getDate();
  const mesAtual = new Date().getMonth() + 1;
  const aniversariantesHoje = aniversariantes.filter(a => a.dia === hoje && mesSelecionado === mesAtual);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cake className="h-8 w-8 text-primary" />
              Aniversariantes
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhe os aniversários dos pacientes</p>
          </div>
        </div>

        {/* Destaque aniversariantes de hoje */}
        {aniversariantesHoje.length > 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Aniversariantes de Hoje! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {aniversariantesHoje.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-background rounded-lg p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Cake className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-sm text-muted-foreground">{a.idade} anos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seletor de mês */}
        <div className="flex flex-wrap gap-2">
          {meses.map((mes, idx) => (
            <Button
              key={mes}
              variant={mesSelecionado === idx + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setMesSelecionado(idx + 1)}
            >
              {mes.substring(0, 3)}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Aniversariantes de {meses[mesSelecionado - 1]}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredAniversariantes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum aniversariante encontrado em {meses[mesSelecionado - 1]}.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAniversariantes.map((a) => (
                    <TableRow key={a.id} className={a.dia === hoje && mesSelecionado === mesAtual ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {a.dia}
                          </div>
                          {a.dia === hoje && mesSelecionado === mesAtual && (
                            <Gift className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.idade} anos</TableCell>
                      <TableCell>
                        {a.phone ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {a.phone}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {a.email ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {a.email}
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
