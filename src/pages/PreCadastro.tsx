import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc, increment } from '@/integrations/firebase/app';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, AlertCircle, Heart, Calendar, Phone, Mail, User } from 'lucide-react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';


interface TokenData {
  id: string;
  organization_id: string;
  nome: string;
  descricao: string;
  campos_obrigatorios: string[];
  campos_opcionais: string[];
  max_usos?: number;
  usos_atuais?: number;
  expires_at?: string;
}

const PreCadastro = () => {
  const { token } = useParams<{ token: string }>();
  const _navigate = useNavigate(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    endereco: '',
    cpf: '',
    convenio: '',
    queixa_principal: '',
    observacoes: ''
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'precadastro_tokens'),
          where('token', '==', token),
          where('ativo', '==', true)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('Link expirado ou inválido');
          setLoading(false);
          return;
        }

        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TokenData;

        // Check if max uses exceeded
        if (data.max_usos && data.usos_atuais !== undefined && data.usos_atuais >= data.max_usos) {
          setError('Este link atingiu o limite máximo de usos');
          setLoading(false);
          return;
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('Este link expirou');
          setLoading(false);
          return;
        }

        setTokenData({
          ...data,
          campos_obrigatorios: data.campos_obrigatorios as string[] || ['nome', 'email', 'telefone'],
          campos_opcionais: data.campos_opcionais as string[] || []
        });
      } catch (err) {
        logger.error('Error validating token', err, 'PreCadastro');
        setError('Erro ao validar link');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenData) return;

    // Validate required fields
    const requiredFields = tokenData.campos_obrigatorios || ['nome', 'email', 'telefone'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(`O campo ${field} é obrigatório`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Increment token usage and get orgId
      const tokenRef = doc(db, 'precadastro_tokens', tokenData.id);
      await updateDoc(tokenRef, {
        usos_atuais: increment(1)
      });

      const orgId = tokenData.organization_id;

      // Insert precadastro with additional data
      const dadosAdicionais: Record<string, string> = {};
      if (formData.cpf) dadosAdicionais.cpf = formData.cpf;
      if (formData.convenio) dadosAdicionais.convenio = formData.convenio;
      if (formData.queixa_principal) dadosAdicionais.queixa_principal = formData.queixa_principal;

      await addDoc(collection(db, 'precastros'), {
        token_id: tokenData.id,
        organization_id: orgId,
        nome: formData.nome,
        email: formData.email || null,
        telefone: formData.telefone || null,
        data_nascimento: formData.data_nascimento || null,
        endereco: formData.endereco || null,
        observacoes: formData.observacoes || null,
        dados_adicionais: Object.keys(dadosAdicionais).length > 0 ? dadosAdicionais : null,
        created_at: new Date().toISOString()
      });

      setSubmitted(true);
      toast.success('Pré-cadastro realizado com sucesso!');
    } catch (err) {
      logger.error('Error submitting', err, 'PreCadastro');
      toast.error('Erro ao enviar pré-cadastro');
    } finally {
      setSubmitting(false);
    }
  };

  const isFieldRequired = (field: string) => {
    return tokenData?.campos_obrigatorios?.includes(field) || false;
  };

  const isFieldVisible = (field: string) => {
    const required = tokenData?.campos_obrigatorios || [];
    const optional = tokenData?.campos_opcionais || [];
    return required.includes(field) || optional.includes(field);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Inválido</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success/5 via-background to-success/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Pré-cadastro Enviado!</h2>
            <p className="text-muted-foreground">
              Seus dados foram recebidos com sucesso. A clínica entrará em contato em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{tokenData?.nome || 'Pré-cadastro'}</CardTitle>
          <CardDescription>
            {tokenData?.descricao || 'Preencha seus dados para iniciar seu atendimento'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isFieldVisible('nome') && (
              <div className="space-y-2">
                <Label htmlFor="nome" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome completo {isFieldRequired('nome') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Seu nome completo"
                  required={isFieldRequired('nome')}
                />
              </div>
            )}

            {isFieldVisible('email') && (
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail {isFieldRequired('email') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  required={isFieldRequired('email')}
                />
              </div>
            )}

            {isFieldVisible('telefone') && (
              <div className="space-y-2">
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone {isFieldRequired('telefone') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  required={isFieldRequired('telefone')}
                />
              </div>
            )}

            {isFieldVisible('data_nascimento') && (
              <div className="space-y-2">
                <Label htmlFor="data_nascimento" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Nascimento {isFieldRequired('data_nascimento') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  required={isFieldRequired('data_nascimento')}
                />
              </div>
            )}

            {isFieldVisible('endereco') && (
              <div className="space-y-2">
                <Label htmlFor="endereco">
                  Endereço {isFieldRequired('endereco') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                  required={isFieldRequired('endereco')}
                />
              </div>
            )}

            {isFieldVisible('cpf') && (
              <div className="space-y-2">
                <Label htmlFor="cpf">
                  CPF {isFieldRequired('cpf') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  required={isFieldRequired('cpf')}
                />
              </div>
            )}

            {isFieldVisible('convenio') && (
              <div className="space-y-2">
                <Label htmlFor="convenio">
                  Convênio/Plano de Saúde {isFieldRequired('convenio') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="convenio"
                  value={formData.convenio}
                  onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
                  placeholder="Nome do convênio ou Particular"
                  required={isFieldRequired('convenio')}
                />
              </div>
            )}

            {isFieldVisible('queixa_principal') && (
              <div className="space-y-2">
                <Label htmlFor="queixa_principal">
                  Queixa Principal {isFieldRequired('queixa_principal') && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="queixa_principal"
                  value={formData.queixa_principal}
                  onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })}
                  placeholder="Descreva brevemente o motivo da consulta"
                  rows={2}
                  required={isFieldRequired('queixa_principal')}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Alguma informação adicional que gostaria de compartilhar?"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Pré-cadastro'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreCadastro;
