/**
 * Marketing Settings Page
 *
 * Central hub for all marketing automation configurations
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {

  Settings,
  MessageSquare,
  Gift,
  Link2,
  Star,
  Save,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getReviewAutomationConfig,
  updateReviewAutomationConfig,
  getBirthdayAutomationConfig,
  updateBirthdayAutomationConfig,
  getRecallCampaigns,
  createRecallCampaign,
  type ReviewAutomationConfig,
  type BirthdayAutomationConfig,
  type RecallCampaign,
} from '@/services/marketing/marketingService';
import {
  generateReviewTemplate,
  generateBirthdayTemplate,
  generateRecallTemplate,
  type GeneratedTemplateResponse,
} from '@/services/ai/marketingAITemplateService';
import { useAuth } from '@/contexts/AuthContext';

export default function MarketingSettingsPage() {
  const { organizationId = '' } = useAuth();

  // Review Automation State
  const [reviewConfig, setReviewConfig] = useState<ReviewAutomationConfig>({
    organization_id: organizationId,
    enabled: false,
    trigger_status: ['alta', 'concluido'],
    message_template: '',
    delay_hours: 24,
  });
  const [savingReview, setSavingReview] = useState(false);

  // Birthday Automation State
  const [birthdayConfig, setBirthdayConfig] = useState<BirthdayAutomationConfig>({
    organization_id: organizationId,
    enabled: false,
    message_template: '',
    send_whatsapp: true,
    send_email: false,
  });
  const [savingBirthday, setSavingBirthday] = useState(false);

  // Recall Campaigns State
  const [recallCampaigns, setRecallCampaigns] = useState<RecallCampaign[]>([]);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    days_without_visit: 180,
    message_template: '',
  });
  const [_loadingCampaigns, setLoadingCampaigns] = useState(true);

  // AI Generation State
  const [generatingReview, setGeneratingReview] = useState(false);
  const [generatingBirthday, setGeneratingBirthday] = useState(false);
  const [generatingRecall, setGeneratingRecall] = useState(false);

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const loadConfigs = async () => {
    // Load review config
    const review = await getReviewAutomationConfig(organizationId);
    if (review) {
      setReviewConfig(review);
    }

    // Load birthday config
    const birthday = await getBirthdayAutomationConfig(organizationId);
    if (birthday) {
      setBirthdayConfig(birthday);
    }

    // Load recall campaigns
    const campaigns = await getRecallCampaigns(organizationId);
    setRecallCampaigns(campaigns);
    setLoadingCampaigns(false);
  };

  const handleSaveReviewConfig = async () => {
    setSavingReview(true);
    try {
      await updateReviewAutomationConfig(organizationId, reviewConfig);
      toast.success('Configuração de reviews salva com sucesso');
    } catch (_error) {
      toast.error('Erro ao salvar configuração de reviews');
    } finally {
      setSavingReview(false);
    }
  };

  const handleSaveBirthdayConfig = async () => {
    setSavingBirthday(true);
    try {
      await updateBirthdayAutomationConfig(organizationId, birthdayConfig);
      toast.success('Configuração de aniversários salva com sucesso');
    } catch (_error) {
      toast.error('Erro ao salvar configuração de aniversários');
    } finally {
      setSavingBirthday(false);
    }
  };

  const handleGenerateReviewWithAI = async () => {
    setGeneratingReview(true);
    try {
      const result = await generateReviewTemplate({
        clinicName: 'FisioFlow',
        clinicSpecialty: 'Fisioterapia',
        tone: 'friendly',
        includeDiscount: false,
        delayHours: reviewConfig.delay_hours,
      });

      if (result.success && result.template) {
        setReviewConfig({ ...reviewConfig, message_template: result.template });
        toast.success('Template de review gerado com IA!');

        if (result.suggestions && result.suggestions.length > 0) {
          toast.info(`Sugestões: ${result.suggestions.join(', ')}`);
        }
      } else {
        toast.error('Erro ao gerar template com IA');
      }
    } catch (error) {
      console.error('[Settings] Error generating review template:', error);
      toast.error('Erro ao gerar template com IA');
      // Fallback: usar template padrão
      setReviewConfig({
        ...reviewConfig,
        message_template: 'Olá {nome}! Gostaríamos de saber sua opinião sobre nosso atendimento: {review_link}',
      });
    } finally {
      setGeneratingReview(false);
    }
  };

  const handleGenerateBirthdayWithAI = async () => {
    setGeneratingBirthday(true);
    try {
      const result = await generateBirthdayTemplate({
        patientName: '[Nome do Paciente]',
        clinicName: 'FisioFlow',
        relationship: 'friendly',
        includeOffer: true,
      });

      if (result.success && result.template) {
        setBirthdayConfig({ ...birthdayConfig, message_template: result.template });
        toast.success('Template de aniversário gerado com IA!');

        if (result.suggestions && result.suggestions.length > 0) {
          toast.info(`Sugestões: ${result.suggestions.join(', ')}`);
        }
      } else {
        toast.error('Erro ao gerar template com IA');
      }
    } catch (error) {
      console.error('[Settings] Error generating birthday template:', error);
      toast.error('Erro ao gerar template com IA');
      // Fallback: usar template padrão
      setBirthdayConfig({
        ...birthdayConfig,
        message_template: 'Olá {nome}! Desejamos um feliz aniversário! 🎉 Que este novo ciclo traga muita saúde e felicidade.',
      });
    } finally {
      setGeneratingBirthday(false);
    }
  };

  const handleGenerateRecallWithAI = async () => {
    setGeneratingRecall(true);
    try {
      const result = await generateRecallTemplate({
        patientName: '[Nome do Paciente]',
        daysWithoutVisit: newCampaign.days_without_visit || 180,
        clinicName: 'FisioFlow',
        clinicSpecialty: 'Fisioterapia',
        motivationType: 'health',
      });

      if (result.success && result.template) {
        setNewCampaign({ ...newCampaign, message_template: result.template });
        toast.success('Template de recall gerado com IA!');

        if (result.suggestions && result.suggestions.length > 0) {
          toast.info(`Sugestões: ${result.suggestions.join(', ')}`);
        }
      } else {
        toast.error('Erro ao gerar template com IA');
      }
    } catch (error) {
      console.error('[Settings] Error generating recall template:', error);
      toast.error('Erro ao gerar template com IA');
      // Fallback: usar template padrão
      setNewCampaign({
        ...newCampaign,
        message_template: 'Olá {nome}! Já faz {dias} dias desde sua última visita. Que tal agendar um check-up?',
      });
    } finally {
      setGeneratingRecall(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_template) {
      toast.error('Preencha o nome e mensagem da campanha');
      return;
    }

    try {
      const _campaignId = await createRecallCampaign(
        {
          ...newCampaign,
          enabled: true,
        },
        organizationId
      );
      toast.success('Campanha de recall criada com sucesso');

      // Reload campaigns
      const campaigns = await getRecallCampaigns(organizationId);
      setRecallCampaigns(campaigns);

      // Reset form
      setNewCampaign({
        name: '',
        description: '',
        days_without_visit: 180,
        message_template: '',
      });
    } catch (_error) {
      toast.error('Erro ao criar campanha de recall');
    }
  };

  const availableVariables = [
    { variable: '{nome}', description: 'Nome do paciente' },
    { variable: '{telefone}', description: 'Telefone da clínica' },
    { variable: '{email}', description: 'Email da clínica' },
    { variable: '{endereco}', description: 'Endereço da clínica' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Configurações de Marketing
            </h1>
            <p className="text-muted-foreground mt-1">
              Automatize suas ações de marketing e engajamento
            </p>
          </div>
        </div>

        <Tabs defaultValue="reviews" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="recall" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Recall
            </TabsTrigger>
            <TabsTrigger value="birthdays" className="gap-2">
              <Gift className="h-4 w-4" />
              Aniversários
            </TabsTrigger>
            <TabsTrigger value="fisiolink" className="gap-2">
              <Link2 className="h-4 w-4" />
              FisioLink
            </TabsTrigger>
          </TabsList>

          {/* Review Automation Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Automação de Avaliações Google
                </CardTitle>
                <CardDescription>
                  Solicite avaliações automaticamente quando pacientes concluírem tratamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Ativar Automação de Reviews</Label>
                    <p className="text-sm text-muted-foreground">
                      Envie mensagens automáticas solicitando avaliações do Google
                    </p>
                  </div>
                  <Switch
                    checked={reviewConfig.enabled}
                    onCheckedChange={(checked) =>
                      setReviewConfig({ ...reviewConfig, enabled: checked })
                    }
                  />
                </div>

                {reviewConfig.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Status que Disparam a Solicitação</Label>
                      <div className="flex flex-wrap gap-2">
                        {['alta', 'concluido', 'melhorado'].map((status) => (
                          <Badge
                            key={status}
                            variant={
                              reviewConfig.trigger_status?.includes(status)
                                ? 'default'
                                : 'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              const newStatuses = reviewConfig.trigger_status?.includes(status)
                                ? reviewConfig.trigger_status.filter((s) => s !== status)
                                : [...(reviewConfig.trigger_status || []), status];
                              setReviewConfig({ ...reviewConfig, trigger_status: newStatuses });
                            }}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Delay Após Mudança de Status (horas)</Label>
                      <Input
                        type="number"
                        value={reviewConfig.delay_hours}
                        onChange={(e) =>
                          setReviewConfig({
                            ...reviewConfig,
                            delay_hours: parseInt(e.target.value) || 0,
                          })
                        }
                        min={1}
                        max={168}
                      />
                      <p className="text-xs text-muted-foreground">
                        Aguarde este período após a alta antes de solicitar a avaliação
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Google Place ID</Label>
                      <Input
                        value={reviewConfig.google_place_id || ''}
                        onChange={(e) =>
                          setReviewConfig({
                            ...reviewConfig,
                            google_place_id: e.target.value,
                          })
                        }
                        placeholder="Ex: ChIJa1to2yPz_pUR8Y-69fE8S08"
                      />
                      <p className="text-xs text-muted-foreground">
                        O ID do local da sua clínica no Google Maps. Necessário para exibir reviews no site.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Template de Mensagem (WhatsApp)</Label>
                      <Textarea
                        value={reviewConfig.message_template}
                        onChange={(e) =>
                          setReviewConfig({
                            ...reviewConfig,
                            message_template: e.target.value,
                          })
                        }
                        rows={4}
                        placeholder="Olá {nome}! Esperamos que esteja ótimo. Gostaríamos de saber sua opinião sobre nosso atendimento: {review_link}"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableVariables.map((v) => (
                          <Badge
                            key={v.variable}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              setReviewConfig({
                                ...reviewConfig,
                                message_template:
                                  reviewConfig.message_template + v.variable,
                              })
                            }
                          >
                            + {v.variable}
                          </Badge>
                        ))}
                        <Badge
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() =>
                            setReviewConfig({
                              ...reviewConfig,
                              message_template:
                                reviewConfig.message_template + '{review_link}',
                            })
                          }
                        >
                          + {'{review_link}'}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}

                {/* AI Generation Button for Reviews */}
                <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div className="text-sm">
                        <p className="font-medium text-purple-900 dark:text-purple-100">
                          Gerar Template com IA
                        </p>
                        <p className="text-purple-800 dark:text-purple-200">
                          Use IA para criar uma mensagem personalizada e persuasiva.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerateReviewWithAI}
                      disabled={generatingReview}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingReview ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar com IA
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveReviewConfig} disabled={savingReview}>
                  {savingReview ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Dica para Mais Reviews
                    </p>
                    <p className="text-blue-800 dark:text-blue-200 mt-1">
                      O momento ideal para solicitar uma avaliação é quando o paciente
                      relata melhora significativa ou completa o tratamento. Personalize
                      a mensagem para soar genuína e não automatizada.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recall Campaigns Tab */}
          <TabsContent value="recall" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Campanhas de Recall / Retorno
                </CardTitle>
                <CardDescription>
                  Reative pacientes que não retornam há muito tempo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing Campaigns */}
                {recallCampaigns.length > 0 && (
                  <div className="space-y-3">
                    <Label>Campanhas Ativas</Label>
                    {recallCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{campaign.name}</h4>
                            {campaign.enabled && (
                              <Badge variant="secondary" className="text-xs">
                                Ativa
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {campaign.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pacientes sem visita há {campaign.days_without_visit}+ dias
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Campaign Form */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-base font-semibold">Nova Campanha de Recall</Label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome da Campanha</Label>
                      <Input
                        value={newCampaign.name}
                        onChange={(e) =>
                          setNewCampaign({ ...newCampaign, name: e.target.value })
                        }
                        placeholder="Ex: Recall 6 meses"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Dias Sem Visita</Label>
                      <Input
                        type="number"
                        value={newCampaign.days_without_visit}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            days_without_visit: parseInt(e.target.value) || 180,
                          })
                        }
                        min={30}
                        max={730}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={newCampaign.description}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, description: e.target.value })
                      }
                      placeholder="Ex: Pacientes que não vêm há 6 meses"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Template de Mensagem</Label>
                    <Textarea
                      value={newCampaign.message_template}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          message_template: e.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Olá {nome}! Sentimos sua falta. Já faz {dias} dias desde sua última visita. Que tal agendar um check-up?"
                    />
                  </div>

                  {/* AI Generation Button for Recall */}
                  <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950 mt-3">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <div className="text-xs">
                            <p className="font-medium text-purple-900 dark:text-purple-100">
                              Gerar Mensagem com IA
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleGenerateRecallWithAI}
                          disabled={generatingRecall}
                          variant="outline"
                          className="h-8 bg-purple-600 hover:bg-purple-700"
                        >
                          {generatingRecall ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Button onClick={handleCreateCampaign}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Criar Campanha
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Birthday Automation Tab */}
          <TabsContent value="birthdays" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Automação de Aniversários
                </CardTitle>
                <CardDescription>
                  Envie mensagens personalizadas no aniversário dos pacientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base">Ativar Automação de Aniversários</Label>
                    <p className="text-sm text-muted-foreground">
                      Envie mensagens automaticamente no dia do aniversário
                    </p>
                  </div>
                  <Switch
                    checked={birthdayConfig.enabled}
                    onCheckedChange={(checked) =>
                      setBirthdayConfig({ ...birthdayConfig, enabled: checked })
                    }
                  />
                </div>

                {birthdayConfig.enabled && (
                  <>
                    <div className="space-y-3">
                      <Label>Canais de Envio</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={birthdayConfig.send_whatsapp}
                            onCheckedChange={(checked) =>
                              setBirthdayConfig({
                                ...birthdayConfig,
                                send_whatsapp: checked,
                              })
                            }
                          />
                          <Label>WhatsApp</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={birthdayConfig.send_email}
                            onCheckedChange={(checked) =>
                              setBirthdayConfig({
                                ...birthdayConfig,
                                send_email: checked,
                              })
                            }
                          />
                          <Label>Email</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Template de Mensagem</Label>
                      <Textarea
                        value={birthdayConfig.message_template}
                        onChange={(e) =>
                          setBirthdayConfig({
                            ...birthdayConfig,
                            message_template: e.target.value,
                          })
                        }
                        rows={4}
                        placeholder="Olá {nome}! Desejamos um feliz aniversário! 🎉 Que este novo ciclo traga muita saúde e felicidade."
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableVariables.map((v) => (
                          <Badge
                            key={v.variable}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              setBirthdayConfig({
                                ...birthdayConfig,
                                message_template:
                                  birthdayConfig.message_template + v.variable,
                              })
                            }
                          >
                            + {v.variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* AI Generation Button for Birthdays */}
                <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div className="text-sm">
                        <p className="font-medium text-purple-900 dark:text-purple-100">
                          Gerar Mensagem com IA
                        </p>
                        <p className="text-purple-800 dark:text-purple-200">
                          Use IA para criar uma mensagem calorosa e personalizada.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerateBirthdayWithAI}
                      disabled={generatingBirthday}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingBirthday ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar com IA
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveBirthdayConfig} disabled={savingBirthday}>
                  {savingBirthday ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FisioLink Tab */}
          <TabsContent value="fisiolink" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  FisioLink - Link na Bio
                </CardTitle>
                <CardDescription>
                  Crie sua página personalizada para link no Instagram
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 border rounded-lg border-dashed">
                  <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Configure seu FisioLink</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie uma página personalizada com seus links importantes para usar
                    no Instagram e outras redes sociais.
                  </p>
                  <Button asChild>
                    <a href="/marketing/fisiolink">Configurar FisioLink</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
