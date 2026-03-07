import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { precadastroApi, type PrecadastroToken } from '@/lib/api/workers-client';

const PreCadastro = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tokenData, setTokenData] = useState<PrecadastroToken | null>(null);
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
    observacoes: '',
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        const res = await precadastroApi.public.getToken(token);
        setTokenData((res?.data ?? null) as PrecadastroToken | null);
      } catch (err) {
        logger.error('Error validating token', err, 'PreCadastro');
        setError(err instanceof Error ? err.message : 'Erro ao validar link');
      } finally {
        setLoading(false);
      }
    };

    void validateToken();
  }, [token]);

  const isFieldRequired = (field: string) => tokenData?.campos_obrigatorios?.includes(field) ?? false;

  const isFieldVisible = (field: string) => {
    const required = tokenData?.campos_obrigatorios ?? [];
    const optional = tokenData?.campos_opcionais ?? [];
    return required.includes(field) || optional.includes(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tokenData) return;

    const requiredFields = tokenData.campos_obrigatorios || ['nome', 'email'];
    for (const field of requiredFields) {
      const value = formData[field as keyof typeof formData];
      if (!value) {
        toast.error(`O campo ${field} é obrigatório`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await precadastroApi.public.submit(token, formData);
      setSubmitted(true);
      toast.success('Pré-cadastro realizado com sucesso!');
    } catch (err) {
      logger.error('Error submitting pre-registration', err, 'PreCadastro');
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar pré-cadastro');
    } finally {
      setSubmitting(false);
    }
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
        <div className="premium-card text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="premium-title text-xl">Link Inválido</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500/5 via-background to-green-500/10 flex items-center justify-center p-4">
        <div className="premium-card text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="premium-title text-xl">Pré-cadastro Enviado</h2>
          <p className="text-muted-foreground">
            Seus dados foram recebidos com sucesso. A clínica entrará em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-container">
      <div className="glow-blob blob-teal" />
      <div className="glow-blob blob-purple" />

      <div className="premium-card">
        <h1 className="premium-title">{tokenData?.nome || 'Pré-cadastro'}</h1>
        <p
          style={{
            color: 'white',
            opacity: 0.7,
            textAlign: 'center',
            marginBottom: '2rem',
            fontSize: '0.875rem',
          }}
        >
          {tokenData?.descricao || 'Preencha seus dados para iniciar seu atendimento prioritário.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFieldVisible('nome') && (
            <div className="premium-form-group">
              <Label htmlFor="nome" className="premium-label">
                Nome completo {isFieldRequired('nome') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Como devemos te chamar?"
                  required={isFieldRequired('nome')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('telefone') && (
            <div className="premium-form-group">
              <Label htmlFor="telefone" className="premium-label">
                WhatsApp / Telefone {isFieldRequired('telefone') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  required={isFieldRequired('telefone')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('email') && (
            <div className="premium-form-group">
              <Label htmlFor="email" className="premium-label">
                E-mail {isFieldRequired('email') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  required={isFieldRequired('email')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('data_nascimento') && (
            <div className="premium-form-group">
              <Label htmlFor="data_nascimento" className="premium-label">
                Data de Nascimento {isFieldRequired('data_nascimento') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  required={isFieldRequired('data_nascimento')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('endereco') && (
            <div className="premium-form-group">
              <Label htmlFor="endereco" className="premium-label">
                Endereço {isFieldRequired('endereco') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                  required={isFieldRequired('endereco')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('cpf') && (
            <div className="premium-form-group">
              <Label htmlFor="cpf" className="premium-label">
                CPF {isFieldRequired('cpf') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  required={isFieldRequired('cpf')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('convenio') && (
            <div className="premium-form-group">
              <Label htmlFor="convenio" className="premium-label">
                Convênio/Plano de Saúde {isFieldRequired('convenio') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Input
                  id="convenio"
                  value={formData.convenio}
                  onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
                  placeholder="Nome do convênio ou Particular"
                  required={isFieldRequired('convenio')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          {isFieldVisible('queixa_principal') && (
            <div className="premium-form-group">
              <Label htmlFor="queixa_principal" className="premium-label">
                Queixa Principal {isFieldRequired('queixa_principal') && <span className="text-destructive">*</span>}
              </Label>
              <div className="premium-input-wrapper">
                <Textarea
                  id="queixa_principal"
                  value={formData.queixa_principal}
                  onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })}
                  placeholder="Descreva brevemente o motivo da consulta"
                  rows={2}
                  required={isFieldRequired('queixa_principal')}
                  className="premium-input"
                />
              </div>
            </div>
          )}

          <div className="premium-form-group">
            <Label htmlFor="observacoes" className="premium-label">Observações (opcional)</Label>
            <div className="premium-input-wrapper">
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Alguma informação adicional que gostaria de compartilhar?"
                rows={3}
                className="premium-input"
              />
            </div>
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
      </div>
    </div>
  );
};

export default PreCadastro;
