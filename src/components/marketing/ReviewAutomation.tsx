/**
 * Review Automation Trigger Component
 *
 * Automatically sends review requests when patients reach certain milestones
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {

  Star,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Settings,
  Zap,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getReviewAutomationConfig,
  updateReviewAutomationConfig,
  type ReviewAutomationConfig,
} from '@/services/marketing/marketingService';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReviewStats {
  sent: number;
  completed: number;
  pending: number;
  conversionRate: number;
}

const TRIGGER_OPTIONS = [
  { value: 'alta', label: 'Após Alta', description: 'Quando o paciente recebe alta' },
  { value: 'concluido', label: 'Tratamento Concluído', description: 'Quando o plano de tratamento termina' },
  { value: 'melhorado', label: 'Melhora Significativa', description: 'Quando o paciente relata melhora' },
  { value: '5_sessoes', label: 'Após 5 Sessões', description: 'Após completar 5 sessões' },
  { value: '10_sessoes', label: 'Após 10 Sessões', description: 'Após completar 10 sessões' },
];

const MESSAGE_TEMPLATES = [
  {
    name: 'Amigável',
    template: 'Olá {nome}! 🌟 Esperamos que esteja ótimo após o tratamento. Gostaríamos muito de saber sua opinião sobre o atendimento. Deixa uma avaliação no Google? {review_link} ⭐',
  },
  {
    name: 'Profissional',
    template: 'Prezado(a) {nome}, agradecemos pela confiança em nosso tratamento. Sua opinião é fundamental para continuarmos evoluindo. Por favor, avalie nossa clínica: {review_link}',
  },
  {
    name: 'Curto',
    template: '{nome}, amamos cuidar de você! ❤️ Deixa uma avaliação no Google: {review_link}',
  },
];

export function ReviewAutomation({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const orgId = organizationId || user?.organizationId || '';

  const [config, setConfig] = useState<ReviewAutomationConfig>({
    organization_id: orgId,
    enabled: false,
    trigger_status: ['alta', 'concluido'],
    message_template: '',
    delay_hours: 24,
  });
  const [stats, setStats] = useState<ReviewStats>({
    sent: 0,
    completed: 0,
    pending: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  useEffect(() => {
    loadConfig();
    loadStats();
  }, [orgId]);

  const loadConfig = async () => {
    try {
      const reviewConfig = await getReviewAutomationConfig(orgId);
      if (reviewConfig) {
        setConfig(reviewConfig);
      }
    } catch (error) {
      console.error('Error loading review config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // In a real implementation, you'd query a review_requests collection
      // For now, mock the stats
      setStats({
        sent: 45,
        completed: 28,
        pending: 17,
        conversionRate: 62.2,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await updateReviewAutomationConfig(orgId, config);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleTrigger = (status: string) => {
    const newStatuses = config.trigger_status?.includes(status)
      ? config.trigger_status.filter((s) => s !== status)
      : [...(config.trigger_status || []), status];
    setConfig({ ...config, trigger_status: newStatuses });
  };

  const applyTemplate = (template: string) => {
    setConfig({ ...config, message_template: template });
  };

  const getGoogleReviewLink = () => {
    // In production, this would be the actual Google Place ID
    return 'https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando configurações...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Solicitações Enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Avaliações Feitas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Automação
          </CardTitle>
          <CardDescription>
            Configure quando e como as solicitações de avaliação serão enviadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Ativar Automação de Reviews</Label>
              <p className="text-sm text-muted-foreground">
                Envie solicitações de avaliação automaticamente via WhatsApp
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {config.enabled && (
            <>
              {/* Trigger Options */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Quando Enviar</Label>
                <div className="grid gap-2">
                  {TRIGGER_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => toggleTrigger(option.value)}
                      className={cn(
                        'flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors',
                        config.trigger_status?.includes(option.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          config.trigger_status?.includes(option.value)
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/30'
                        )}
                      >
                        {config.trigger_status?.includes(option.value) && (
                          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delay */}
              <div className="space-y-2">
                <Label>Delay Após Gatilho (horas)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={config.delay_hours}
                    onChange={(e) =>
                      setConfig({ ...config, delay_hours: parseInt(e.target.value) || 0 })
                    }
                    min={1}
                    max={168}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Aguarde {config.delay_hours} hora{config.delay_hours !== 1 ? 's' : ''} após o
                    gatilho antes de enviar
                  </span>
                </div>
              </div>

              {/* Message Template */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Template de Mensagem</Label>

                {/* Quick Templates */}
                <div className="flex flex-wrap gap-2">
                  {MESSAGE_TEMPLATES.map((template, index) => (
                    <Button
                      key={index}
                      variant={selectedTemplate === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(index);
                        applyTemplate(template.template);
                      }}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>

                <Textarea
                  value={config.message_template}
                  onChange={(e) =>
                    setConfig({ ...config, message_template: e.target.value })
                  }
                  rows={4}
                  placeholder="Olá {nome}! Gostaríamos de saber sua opinião..."
                  className="resize-none"
                />

                {/* Variables */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setConfig({
                        ...config,
                        message_template: config.message_template + ' {nome}',
                      })
                    }
                  >
                    + {'{nome}'}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setConfig({
                        ...config,
                        message_template: config.message_template + ' {review_link}',
                      })
                    }
                  >
                    + {'{review_link}'}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setConfig({
                        ...config,
                        message_template: config.message_template + ' {clinica}',
                      })
                    }
                  >
                    + {'{clinica}'}
                  </Badge>
                </div>
              </div>

              {/* Google Place ID */}
              <div className="space-y-2">
                <Label>Google Place ID (opcional)</Label>
                <Input
                  value={config.google_place_id || ''}
                  onChange={(e) =>
                    setConfig({ ...config, google_place_id: e.target.value })
                  }
                  placeholder="ChIJxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Configure para gerar links diretos para sua página do Google Maps
                </p>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Dicas para Mais Reviews
              </p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                <li>• O momento ideal é logo após uma melhora significativa</li>
                <li>• Mensagens curtas e pessoais têm maior taxa de conversão</li>
                <li>• Evite enviar solicitações em horários inconvenientes</li>
                <li>• Responda todos os reviews, positivos e negativos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Save } from 'lucide-react';
