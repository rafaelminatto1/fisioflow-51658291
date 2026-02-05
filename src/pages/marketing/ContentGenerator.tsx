import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Copy,
  Download,
  Sparkles,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  FileText,
  Image as ImageIcon,
  Video,
  Hash,
  AtSign,
  Smile,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    hashtags: ['#fisioterapia', '#saude', '#bemestar', '#movimento', '#qualidadedevida'],
    maxLength: 2200,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    hashtags: ['#fisioterapia', '#saúde', '#bemestar', '#movimento'],
    maxLength: 63206,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-700',
    hashtags: ['#Fisioterapia', '#Saúde', '#BemEstar', '#QualidadeDeVida', '#ProfissionalDeSaúde'],
    maxLength: 3000,
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: Twitter,
    color: 'bg-black dark:bg-white',
    hashtags: ['#fisioterapia', '#saude', '#bemestar'],
    maxLength: 280,
  },
];

const CONTENT_TYPES = [
  {
    id: 'educational',
    name: 'Educativo',
    icon: FileText,
    description: 'Conteúdo informativo sobre saúde e fisioterapia',
    color: 'bg-blue-500',
  },
  {
    id: 'motivational',
    name: 'Motivacional',
    icon: Smile,
    description: 'Conteúdo inspirador para engajar pacientes',
    color: 'bg-amber-500',
  },
  {
    id: 'promotional',
    name: 'Promocional',
    icon: Sparkles,
    description: 'Divulgação de serviços e promoções',
    color: 'bg-purple-500',
  },
  {
    id: 'transformation',
    name: 'Antes e Depois',
    icon: ImageIcon,
    description: 'Resultados de tratamento (com consentimento)',
    color: 'bg-emerald-500',
  },
];

const TEMPLATES = {
  educational: [
    "Você sabia que {tema} pode afetar sua qualidade de vida?\n\n{explicacao}\n\nA fisioterapia ajuda na prevenção e tratamento. Agende sua avaliação!\n\n{hashtags}",
    "Dica de fisioterapia 💡\n\n{dica}\n\nLembre-se: cada corpo é único. O tratamento personalizado traz melhores resultados.\n\n{hashtags}",
    "MITO OU VERDADE?\n\n{mito}\n\n✅ Verdade: {explicacao_verdade}\n❌ Mito: {explicacao_mito}\n\nCompartilhe alguém que precisa saber disso! {hashtags}",
  ],
  motivational: [
    "Cada passo é uma vitória 🏆\n\n{mensagem}\n\nContinue firme no seu tratamento. Os resultados valem a pena!\n\n{hashtags}",
    "Incrível a evolução deste paciente! 💪\n\n{historia}\n\nDedicação e tratamento adequado fazem a diferença.\n\n{hashtags}",
    "Novo dia, nova oportunidade de evolução!\n\n{mensagem_manha}\n\nA fisioterapia está aqui para te apoiar.\n\n{hashtags}",
  ],
  promotional: [
    "🎈 PROMOÇÃO ESPECIAL 🎈\n\n{oferta}\n\n✅ Avaliação gratuita\n✅ Plano personalizado\n✅ Profissionais qualificados\n\nAgende agora! {telefone} ou {link}\n\n{hashtags}",
    "Transforme sua saúde com nossos serviços de fisioterapia!\n\n{servicos}\n\n📍 {endereco}\n📞 {telefone}\n\n{hashtags}",
    "Ganhe {desconto} na sua primeira sessão!\n\n{detalhes}\n\nOferta válida até {data}. Não perca!\n\n{hashtags}",
  ],
  transformation: [
    "🔄 TRANSFORMAÇÃO\n\nPaciente: {anonimizado}\nTempo de tratamento: {tempo}\n\n{resultado}\n\n⚠️ Resultados variam. Conteúdo autorizado pelo paciente.\n\n{hashtags}",
    "Antes e Depois: Evolução em {tempo}\n\n{detalhes_tratamento}\n\n🎯 Objetivo alcançado!\n\n⚠️ Consentimento LGPD assinado.\n\n{hashtags}",
    "O poder da fisioterapia em números:\n\n{metricas}\n\nResultado de {tempo} de tratamento.\n\n{hashtags}",
  ],
};

const VARIABLES = [
  { name: '{tema}', label: 'Tema (ex: lombalgia, postura)' },
  { name: '{explicacao}', label: 'Explicação do tema' },
  { name: '{dica}', label: 'Dica rápida' },
  { name: '{mito}', label: 'Mito para debunkar' },
  { name: '{mensagem}', label: 'Mensagem motivacional' },
  { name: '{historia}', label: 'História de sucesso (anonimizada)' },
  { name: '{oferta}', label: 'Oferta/promoção' },
  { name: '{servicos}', label: 'Lista de serviços' },
  { name: '{telefone}', label: 'Telefone' },
  { name: '{link}', label: 'Link/Website' },
  { name: '{endereco}', label: 'Endereço' },
  { name: '{desconto}', label: 'Desconto (ex: 20%)' },
  { name: '{data}', label: 'Data de validade' },
  { name: '{tempo}', label: 'Tempo de tratamento' },
  { name: '{anonimizado}', label: 'Nome (ou anonimizado)' },
  { name: '{resultado}', label: 'Resultado obtido' },
  { name: '{metricas}', label: 'Métricas de evolução' },
];

export default function ContentGeneratorPage() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [contentType, setContentType] = useState<'educational' | 'motivational' | 'promotional' | 'transformation'>('educational');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [generatedContent, setGeneratedContent] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [customHashtags, setCustomHashtags] = useState('');

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];
  const PlatformIcon = platform.icon;
  const templates = TEMPLATES[contentType];
  const currentTemplate = templates[templateIndex];

  const characterCount = generatedContent.length;
  const isOverLimit = characterCount > platform.maxLength;

  const generateContent = () => {
    let content = currentTemplate;

    // Replace variables with values
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(key, 'g'), value || key);
    });

    // Add hashtags
    const platformHashtags = platform.hashtags.join(' ');
    const customTags = customHashtags ? ` ${customHashtags}` : '';
    content = content.replace('{hashtags}', platformHashtags + customTags);

    // Remove emojis if disabled
    if (!includeEmojis) {
      content = content.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    }

    setGeneratedContent(content.trim());
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast({
        title: 'Copiado!',
        description: 'Conteúdo copiado para a área de transferência',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o conteúdo',
      });
    }
  };

  const downloadContent = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-${platform.id}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Download iniciado',
      description: 'Arquivo de texto baixado com sucesso',
    });
  };

  const nextTemplate = () => {
    setTemplateIndex((prev) => (prev + 1) % templates.length);
  };

  const extractVariablesFromTemplate = (template: string): string[] => {
    const matches = template.match(/\{[^}]+\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  const requiredVariables = extractVariablesFromTemplate(currentTemplate);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          Gerador de Conteúdo Social
        </h1>
        <p className="text-muted-foreground mt-1">
          Crie posts otimizados para redes sociais
        </p>
      </div>

      {/* Platform & Type Selection */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2',
                      selectedPlatform === p.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg text-white', p.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tipo de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={contentType} onValueChange={(v) => {
              setContentType(v as typeof contentType);
              setTemplateIndex(0);
            }} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                {CONTENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <TabsTrigger key={type.id} value={type.id} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {type.name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            <p className="text-sm text-muted-foreground mt-3">
              {CONTENT_TYPES.find((t) => t.id === contentType)?.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Template & Variables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Template & Variáveis</CardTitle>
            <Button variant="outline" size="sm" onClick={nextTemplate}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Próximo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Preview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Template {templateIndex + 1} de {templates.length}</span>
              <Badge variant="outline">{contentType}</Badge>
            </div>
            <p className="text-sm whitespace-pre-wrap font-mono">{currentTemplate}</p>
          </div>

          {/* Variables */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Variáveis do Template
            </Label>
            <div className="grid gap-3 md:grid-cols-2">
              {requiredVariables.map((variable) => {
                const varInfo = VARIABLES.find((v) => v.name === variable);
                return (
                  <div key={variable} className="space-y-1">
                    <Label htmlFor={variable} className="text-sm text-muted-foreground">
                      {varInfo?.label || variable}
                    </Label>
                    <Input
                      id={variable}
                      placeholder={variable}
                      value={variables[variable] || ''}
                      onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="emojis">Incluir Emojis</Label>
              <p className="text-xs text-muted-foreground">Adiciona emojis ao conteúdo gerado</p>
            </div>
            <Switch id="emojis" checked={includeEmojis} onCheckedChange={setIncludeEmojis} />
          </div>

          {/* Custom Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags Personalizadas (opcional)</Label>
            <Input
              placeholder="#seuhashtag #outrohashtag"
              value={customHashtags}
              onChange={(e) => setCustomHashtags(e.target.value)}
            />
          </div>

          <Button onClick={generateContent} className="w-full" size="lg">
            <Sparkles className="h-5 w-5 mr-2" />
            Gerar Conteúdo
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PlatformIcon className="h-5 w-5" />
                Conteúdo para {platform.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={isOverLimit ? 'destructive' : 'secondary'}>
                  {characterCount} / {platform.maxLength.toLocaleString()}
                </Badge>
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={downloadContent}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            {isOverLimit && (
              <p className="text-sm text-destructive mt-2">
                ⚠️ Conteúdo excede o limite de caracteres para {platform.name}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
