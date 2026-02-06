/**
 * FisioLink Configuration Page
 *
 * Create and customize a Link-in-Bio page for Instagram/social media
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {

  Link2,
  Smartphone,
  MessageSquare,
  MapPin,
  Phone,
  Globe,
  Eye,
  Save,
  Copy,
  ExternalLink,
  Sparkles,
  Palette,
  BarChart3,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getFisioLinkConfig,
  updateFisioLinkConfig,
  type FisioLinkConfig,
} from '@/services/marketing/marketingService';
import { useAuth } from '@/contexts/AuthContext';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', preview: 'bg-white border-gray-200' },
  { value: 'dark', label: 'Escuro', preview: 'bg-gray-900 border-gray-700' },
  { value: 'clinical', label: 'Clínico', preview: 'bg-blue-50 border-blue-200' },
];

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Azul', color: 'bg-blue-500' },
  { value: '#10b981', label: 'Verde', color: 'bg-emerald-500' },
  { value: '#8b5cf6', label: 'Roxo', color: 'bg-purple-500' },
  { value: '#f59e0b', label: 'Laranja', color: 'bg-amber-500' },
  { value: '#ef4444', label: 'Vermelho', color: 'bg-red-500' },
  { value: '#06b6d4', label: 'Ciano', color: 'bg-cyan-500' },
];

export default function FisioLinkPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [config, setConfig] = useState<Partial<FisioLinkConfig>>({
    slug: '',
    whatsapp_number: '',
    google_maps_url: '',
    phone: '',
    show_before_after: true,
    show_reviews: true,
    custom_message: '',
    theme: 'clinical',
    primary_color: '#3b82f6',
  });
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    // Load existing config
    if (organizationId) {
      getFisioLinkConfig(organizationId).then((existingConfig) => {
        if (existingConfig) {
          setConfig(existingConfig);
          setSlug(existingConfig.slug);
        } else {
          setSlug(organizationId);
        }
      });
    }
  }, [organizationId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newSlug = await updateFisioLinkConfig(organizationId, {
        ...config,
        slug: slug || organizationId,
      });
      setSlug(newSlug);
      toast.success('FisioLink configurado com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/l/${slug || organizationId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência');
  };

  const getFisioLinkUrl = () => `${window.location.origin}/l/${slug || organizationId}`;

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="h-8 w-8" />
            FisioLink - Link na Bio
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie sua página personalizada para o link do Instagram
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Pré-visualizar
              </>
            )}
          </Button>
          <Button variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Link
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Panel */}
        {!previewMode && (
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
              <CardDescription>Personalize sua página FisioLink</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Slug */}
              <div className="space-y-2">
                <Label>URL Personalizada</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {window.location.origin}/l/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="sua-clinica"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use um nome curto e fácil de lembrar para seu link
                </p>
              </div>

              {/* Contact Links */}
              <div className="space-y-4">
                <Label>Links de Contato</Label>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm">
                    WhatsApp (com DDI e DDD)
                  </Label>
                  <Input
                    id="whatsapp"
                    value={config.whatsapp_number}
                    onChange={(e) =>
                      setConfig({ ...config, whatsapp_number: e.target.value })
                    }
                    placeholder="5511999999999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maps" className="text-sm">
                    Google Maps (localização)
                  </Label>
                  <Input
                    id="maps"
                    value={config.google_maps_url}
                    onChange={(e) =>
                      setConfig({ ...config, google_maps_url: e.target.value })
                    }
                    placeholder="https://maps.google.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">
                    Telefone Fixo
                  </Label>
                  <Input
                    id="phone"
                    value={config.phone}
                    onChange={(e) =>
                      setConfig({ ...config, phone: e.target.value })
                    }
                    placeholder="(11) 1234-5678"
                  />
                </div>
              </div>

              {/* Content Options */}
              <div className="space-y-4">
                <Label>Conteúdo da Página</Label>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Mostrar Antes e Depois</Label>
                    <p className="text-xs text-muted-foreground">
                      Exibe galeria de resultados clínicos
                    </p>
                  </div>
                  <Switch
                    checked={config.show_before_after}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, show_before_after: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Mostrar Avaliações</Label>
                    <p className="text-xs text-muted-foreground">
                      Exibe depoimentos e rating do Google
                    </p>
                  </div>
                  <Switch
                    checked={config.show_reviews}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, show_reviews: checked })
                    }
                  />
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label>Mensagem de Boas-vindas</Label>
                <Textarea
                  value={config.custom_message}
                  onChange={(e) =>
                    setConfig({ ...config, custom_message: e.target.value })
                  }
                  rows={3}
                  placeholder="Bem-vindo à Clínica FisioFlow! Cuidamos da sua saúde com dedicação."
                />
              </div>

              {/* Theme Selection */}
              <div className="space-y-3">
                <Label>Tema da Página</Label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setConfig({ ...config, theme: theme.value as any })}
                      className={cn(
                        'p-3 border-2 rounded-lg transition-all',
                        config.theme === theme.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn('h-8 rounded mb-2', theme.preview)} />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-3">
                <Label>Cor Principal</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setConfig({ ...config, primary_color: color.value })}
                      className={cn(
                        'w-10 h-10 rounded-full transition-all',
                        config.primary_color === color.value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'ring-1 ring-border'
                      )}
                    >
                      <div className={cn('w-full h-full rounded-full', color.color)} />
                    </button>
                  ))}
                  <Input
                    type="color"
                    value={config.primary_color}
                    onChange={(e) =>
                      setConfig({ ...config, primary_color: e.target.value })
                    }
                    className="w-10 h-10 p-0 border-0"
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
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
        )}

        {/* Preview Panel */}
        <Card className={cn(!previewMode && 'md:col-span-1')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto w-full max-w-[320px]">
              {/* Phone Mockup */}
              <div className="border-8 border-gray-900 rounded-[2rem] overflow-hidden bg-white">
                {/* Phone Screen */}
                <div
                  className="min-h-[500px] p-4 space-y-4"
                  style={{
                    backgroundColor:
                      config.theme === 'dark'
                        ? '#111827'
                        : config.theme === 'clinical'
                        ? '#eff6ff'
                        : '#ffffff',
                  }}
                >
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                      F
                    </div>
                    <h2 className="font-bold text-lg">FisioFlow</h2>
                    {config.custom_message && (
                      <p className="text-sm opacity-80">{config.custom_message}</p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="space-y-2">
                    {config.whatsapp_number && (
                      <a
                        href={`https://wa.me/${config.whatsapp_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span className="font-medium">Agendar via WhatsApp</span>
                      </a>
                    )}

                    {config.google_maps_url && (
                      <a
                        href={config.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">Ver Localização</span>
                      </a>
                    )}

                    {config.phone && (
                      <a
                        href={`tel:${config.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
                      >
                        <Phone className="h-5 w-5" />
                        <span className="font-medium">Ligar Agora</span>
                      </a>
                    )}
                  </div>

                  {/* Features */}
                  {config.show_before_after && (
                    <div className="p-3 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center text-sm text-gray-500">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Galeria de Antes e Depois</p>
                        <p className="text-xs">(apenas com consentimento)</p>
                      </div>
                    </div>
                  )}

                  {config.show_reviews && (
                    <div className="p-3 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center text-sm text-gray-500">
                        <Star className="h-8 w-8 mx-auto mb-2 opacity-50 fill-amber-400 text-amber-400" />
                        <p>Avaliações Google</p>
                        <p className="text-xs">★★★★★ 5.0</p>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center text-xs opacity-60">
                    <p>Feito com FisioFlow</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" asChild>
                <a href={getFisioLinkUrl()} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </a>
              </Button>
              <Button onClick={copyLink} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </MainLayout>
  );
}

import { cn } from '@/lib/utils';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Star from 'lucide-react/dist/esm/icons/star';
