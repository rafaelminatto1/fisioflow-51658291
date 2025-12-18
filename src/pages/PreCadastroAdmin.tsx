import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link2, Plus, Copy, Trash2, Eye, UserPlus, Clock, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PreCadastroAdmin = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newToken, setNewToken] = useState({
    nome: '',
    descricao: '',
    validade_dias: 30,
    max_usos: ''
  });

  // Fetch tokens
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['precadastro-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('precadastro_tokens')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch precadastros
  const { data: precadastros, isLoading: precadastrosLoading } = useQuery({
    queryKey: ['precadastros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('precadastros')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Create token mutation
  const createToken = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('precadastro_tokens')
        .insert({
          organization_id: profile?.organization_id,
          nome: newToken.nome || 'Link de Pré-cadastro',
          descricao: newToken.descricao,
          validade_dias: newToken.validade_dias,
          max_usos: newToken.max_usos ? parseInt(newToken.max_usos) : null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Link criado com sucesso!');
      setIsCreateOpen(false);
      setNewToken({ nome: '', descricao: '', validade_dias: 30, max_usos: '' });
    },
    onError: () => {
      toast.error('Erro ao criar link');
    }
  });

  // Toggle token status
  const toggleToken = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('precadastro_tokens')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastro-tokens'] });
      toast.success('Status atualizado');
    }
  });

  // Update precadastro status
  const updatePrecadastro = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('precadastros')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precadastros'] });
      toast.success('Status atualizado');
    }
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/pre-cadastro/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pendente: { variant: 'secondary', label: 'Pendente' },
      aprovado: { variant: 'default', label: 'Aprovado' },
      rejeitado: { variant: 'destructive', label: 'Rejeitado' },
      convertido: { variant: 'outline', label: 'Convertido' }
    };
    const config = variants[status] || variants.pendente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pré-cadastro de Pacientes</h1>
            <p className="text-muted-foreground">Gerencie links de pré-cadastro e novos pacientes</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Link de Pré-cadastro</DialogTitle>
                <DialogDescription>
                  Crie um link para pacientes se pré-cadastrarem
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Link</Label>
                  <Input
                    value={newToken.nome}
                    onChange={(e) => setNewToken({ ...newToken, nome: e.target.value })}
                    placeholder="Ex: Link Instagram"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Descrição (visível para o paciente)</Label>
                  <Textarea
                    value={newToken.descricao}
                    onChange={(e) => setNewToken({ ...newToken, descricao: e.target.value })}
                    placeholder="Preencha seus dados para agendar sua avaliação"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Validade (dias)</Label>
                    <Input
                      type="number"
                      value={newToken.validade_dias}
                      onChange={(e) => setNewToken({ ...newToken, validade_dias: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Máx. usos (vazio = ilimitado)</Label>
                    <Input
                      type="number"
                      value={newToken.max_usos}
                      onChange={(e) => setNewToken({ ...newToken, max_usos: e.target.value })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={() => createToken.mutate()} disabled={createToken.isPending}>
                  {createToken.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Links Ativos</p>
                  <p className="text-2xl font-bold">{tokens?.filter(t => t.ativo).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold">{precadastros?.filter(p => p.status === 'pendente').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold">{precadastros?.filter(p => p.status === 'aprovado').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{precadastros?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="precadastros">
          <TabsList>
            <TabsTrigger value="precadastros">Pré-cadastros</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>
          
          <TabsContent value="precadastros" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pré-cadastros Recebidos</CardTitle>
                <CardDescription>Gerencie os pré-cadastros de novos pacientes</CardDescription>
              </CardHeader>
              <CardContent>
                {precadastrosLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : precadastros?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pré-cadastro recebido ainda
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {precadastros?.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {p.email && <div>{p.email}</div>}
                              {p.telefone && <div className="text-muted-foreground">{p.telefone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {p.status === 'pendente' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updatePrecadastro.mutate({ id: p.id, status: 'aprovado' })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updatePrecadastro.mutate({ id: p.id, status: 'rejeitado' })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {p.status === 'aprovado' && (
                                <Button size="sm">
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Converter
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
          </TabsContent>
          
          <TabsContent value="links" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Links de Pré-cadastro</CardTitle>
                <CardDescription>Links para compartilhar com potenciais pacientes</CardDescription>
              </CardHeader>
              <CardContent>
                {tokensLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : tokens?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum link criado ainda
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tokens?.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{t.nome || 'Link de Pré-cadastro'}</h4>
                            <Badge variant={t.ativo ? 'default' : 'secondary'}>
                              {t.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t.usos_atuais} usos {t.max_usos ? `de ${t.max_usos}` : '(ilimitado)'}
                            {t.expires_at && (
                              <>
                                {' • '}
                                Expira em {format(new Date(t.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </>
                            )}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={t.ativo}
                            onCheckedChange={(ativo) => toggleToken.mutate({ id: t.id, ativo })}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyLink(t.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PreCadastroAdmin;
