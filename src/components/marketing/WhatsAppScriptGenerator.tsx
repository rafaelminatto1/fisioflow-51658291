/**
 * WhatsApp Message Script Generator
 *
 * Create personalized WhatsApp message templates for patient communication
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Sparkles,
  Copy,
  Send,
  Clock,
  Calendar,
  Gift,
  Heart,
  Zap,
  Phone,
  CheckCircle2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ScriptCategory =
  | 'agendamento'
  | 'lembrete'
  | 'alta'
  | 'recall'
  | 'promocao'
  | 'aniversario'
  | 'agradecimento'
  | 'personalizado';

interface ScriptTemplate {
  id: string;
  category: ScriptCategory;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'confirma-agenda',
    category: 'agendamento',
    name: 'Confirmação de Agendamento',
    description: 'Confirmar consulta agendada',
    template: `Olá {nome}! 👋

Tudo bem? Estamos passando para confirmar sua sessão de fisioterapia:

📅 Data: {data}
⏰ Horário: {horario}
📍 {clinica}

Por favor, responda com "CONFIRMADO" se poderá comparecer, ou nos avise se precisar remarcar.

Até logo! 💪`,
    variables: ['{nome}', '{data}', '{horario}', '{clinica}'],
  },
  {
    id: 'lembrete-24h',
    category: 'lembrete',
    name: 'Lembrete 24h Antes',
    description: 'Lembrar consulta um dia antes',
    template: `Oi {nome}! 🌟

Só um lembrete amigável: sua sessão de fisioterapia é *amanhã* às {horario}!

📍 {clinica}

Não esqueça de:
☑️ Vestir roupas confortáveis
☑️ Chegar 10 minutos antes
☑️ Trazer exames se tiver

Nos vemos amanhã! 💪`,
    variables: ['{nome}', '{horario}', '{clinica}'],
  },
  {
    id: 'alta-tratamento',
    category: 'alta',
    name: 'Alta do Tratamento',
    description: 'Parabenizar paciente pela conclusão',
    template: `Parabéns {nome}! 🎉🎊

Com grande satisfação, informamos que você completou seu plano de tratamento!

✅ Você foi *ALTO(A)*!

Foi um prazer acompanhar sua evolução. Para manter os resultados alcançados, lembramos:

🏃 Pratique os exercícios aprendidos
🧘 Mantenha uma postura adequada
💧 Hidratação e alimentação saudável

Se precisar de algo, estamos sempre por aqui! Cuide-se! 💪❤️

{clinica}
{telefone}`,
    variables: ['{nome}', '{clinica}', '{telefone}'],
  },
  {
    id: 'recall-30-dias',
    category: 'recall',
    name: 'Recall 30 Dias',
    description: 'Contatar paciente sem vir há 30 dias',
    template: `Oi {nome}! 👋

Tudo bem? Faz uns 30 dias que não vemos você por aqui.

Como está se sentindo? Quer que você continue bem! Quer agendar um retorno para avaliarmos como estão as coisas?

📅 Temos horários disponíveis esta semana!

Me avise que encaixamos você! 💪`,
    variables: ['{nome}'],
  },
  {
    id: 'promocao-inverno',
    category: 'promocao',
    name: 'Promoção Seasonal',
    description: 'Oferecer promoção sazonal',
    template: `🔥 *PROMOÇÃO ESPECIAL* 🔥

Olá {nome}!

Estamos com uma condição especial para você:

✨ {desconto} DE DESCONTO
✨ Em {numero_sessoes} sessões
✨ Válido até {data_validade}

Essa é sua chance de retomar ou intensificar seu tratamento!

Responda "QUERO" para garantir seu desconto! 💪

{clinica}`,
    variables: ['{nome}', '{desconto}', '{numero_sessoes}', '{data_validade}', '{clinica}'],
  },
  {
    id: 'feliz-aniversario',
    category: 'aniversario',
    name: 'Feliz Aniversário',
    description: 'Desejar feliz aniversário',
    template: `🎂🎉 Feliz Aniversário, {nome}! 🎉🎂

Que esse novo ciclo traga muita saúde, paz e realizações!

Agradecemos por fazer parte da nossa família. Esperamos comemorar muitos anos de vida saudável junto com você! ❤️

Com carinho,
Equipe {clinica} 💪`,
    variables: ['{nome}', '{clinica}'],
  },
  {
    id: 'agradecimento-avaliacao',
    category: 'agradecimento',
    name: 'Agradecimento por Avaliação',
    description: 'Agradecer após avaliação gratuita',
    template: `Oi {nome}!

Foi um prazer receber você para a avaliação na {clinica}! 😊

Esperamos que tenha gostado da experiência. Como ficou o plano de tratamento?

Ficamos à disposição para quaisquer dúvidas!

💪 Cuide-se!`,
    variables: ['{nome}', '{clinica}'],
  },
];

const CATEGORY_ICONS: Record<ScriptCategory, React.ComponentType<{ className?: string }>> = {
  agendamento: Calendar,
  lembrete: Clock,
  alta: CheckCircle2,
  recall: Phone,
  promocao: Gift,
  aniversario: Heart,
  agradecimento: MessageSquare,
  personalizado: Sparkles,
};

const CATEGORY_COLORS: Record<ScriptCategory, string> = {
  agendamento: 'bg-blue-100 text-blue-700 border-blue-200',
  lembrete: 'bg-amber-100 text-amber-700 border-amber-200',
  alta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  recall: 'bg-purple-100 text-purple-700 border-purple-200',
  promocao: 'bg-red-100 text-red-700 border-red-200',
  aniversario: 'bg-pink-100 text-pink-700 border-pink-200',
  agradecimento: 'bg-teal-100 text-teal-700 border-teal-200',
  personalizado: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function WhatsAppScriptGenerator() {
  const [selectedCategory, setSelectedCategory] = useState<ScriptCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customMessage, setCustomMessage] = useState('');

  const filteredTemplates = SCRIPT_TEMPLATES.filter(
    t => selectedCategory === 'all' || t.category === selectedCategory
  );

  const selectTemplate = (template: ScriptTemplate) => {
    setSelectedTemplate(template);
    setGeneratedMessage(template.template);
    setVariables({});
  };

  const generateMessage = () => {
    if (!selectedTemplate) {
      setGeneratedMessage(customMessage);
      return;
    }

    let message = selectedTemplate.template;

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(key, 'g'), value || key);
    });

    // Format for WhatsApp (bold, italic)
    message = message.replace(/\*(.*?)\*/g, '*$1*'); // Keep bold formatting

    setGeneratedMessage(message);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success('Mensagem copiada! Cole no WhatsApp para enviar.');
  };

  const sendToWhatsApp = (phone: string) => {
    const encodedMessage = encodeURIComponent(generatedMessage);
    const formattedPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${formattedPhone}?text=${encodedMessage}`, '_blank');
  };

  const categories: { value: ScriptCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'agendamento', label: 'Agendamento' },
    { value: 'lembrete', label: 'Lembretes' },
    { value: 'alta', label: 'Alta' },
    { value: 'recall', label: 'Recall' },
    { value: 'promocao', label: 'Promoções' },
    { value: 'aniversario', label: 'Aniversário' },
    { value: 'agradecimento', label: 'Agradecimento' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" />
          Gerador de Scripts WhatsApp
        </h2>
        <p className="text-muted-foreground">
          Crie mensagens personalizadas para comunicação com pacientes
        </p>
      </div>

      {/* Category Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label>Filtrar por categoria:</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Badge
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat.value as any)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>Templates Disponíveis</CardTitle>
            <CardDescription>Clique para selecionar e personalizar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredTemplates.map(template => {
                const Icon = CATEGORY_ICONS[template.category];
                return (
                  <div
                    key={template.id}
                    onClick={() => selectTemplate(template)}
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer transition-all hover:border-primary',
                      selectedTemplate?.id === template.id && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded', CATEGORY_COLORS[template.category])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Message */}
            <div className="mt-4 pt-4 border-t">
              <Label className="mb-2 block">Ou crie sua própria mensagem:</Label>
              <Textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Digite sua mensagem personalizada..."
                rows={4}
              />
              {customMessage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setGeneratedMessage(customMessage);
                  }}
                >
                  Usar Mensagem Personalizada
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Editar Mensagem</CardTitle>
            <CardDescription>Personalize as variáveis e visualize o resultado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTemplate ? (
              <>
                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    <Label>Variables:</Label>
                    {selectedTemplate.variables.map(variable => (
                      <div key={variable} className="space-y-1">
                        <Label className="text-sm text-muted-foreground">
                          {variable}
                        </Label>
                        <Input
                          value={variables[variable] || ''}
                          onChange={e =>
                            setVariables({ ...variables, [variable]: e.target.value })
                          }
                          placeholder={`Valor para ${variable}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={generateMessage} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Mensagem
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione um template ou crie uma mensagem personalizada
              </p>
            )}

            {/* Preview */}
            {generatedMessage && (
              <div className="space-y-3">
                <Label>Preview:</Label>
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {generatedMessage}
                  </pre>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const phone = prompt('Digite o telefone (apenas números):');
                      if (phone) sendToWhatsApp(phone);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar no WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 dark:text-green-100 mb-2">
                Dicas para Mensagens Eficazes
              </p>
              <ul className="space-y-1 text-green-800 dark:text-green-200">
                <li>• Use textos curtos e diretos - WhatsApp é sobre rapidez</li>
                <li>• Emojis ajudam a dar tom humano e amigável</li>
                <li>• Use negrito entre asteriscos para destacar informações importantes</li>
                <li>• Sempre inclua call-to-action claro (responda, confirme, etc.)</li>
                <li>• Respeite o horário comercial (9h às 18h) para mensagens</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
