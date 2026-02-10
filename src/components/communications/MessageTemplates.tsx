/**
 * Componente: MessageTemplates
 * Templates de mensagem rápida para comunicação com pacientes
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Calendar,
  Gift,
  TrendingUp,
  CheckCircle,
  Clock,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageTemplate {
  id: string;
  category: 'lembrete' | 'agendamento' | 'aniversario' | 'reactivacao' | 'pesquisa' | 'evolucao';
  title: string;
  subject?: string;
  body: string;
  icon?: React.ElementType;
  tags?: string[];
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'lembrete-exercicio',
    category: 'lembrete',
    title: 'Lembrete de Exercícios',
    subject: 'Não esqueça de fazer seus exercícios!',
    body: 'Olá {nome}! Este é um lembrete gentil para realizar seus exercícios de hoje. Cada sessão conta para sua recuperação. Você consegue! 💪',
    icon: TrendingUp,
    tags: ['exercícios', 'diário'],
  },
  {
    id: 'confirmacao-agendamento',
    category: 'agendamento',
    title: 'Confirmação de Agendamento',
    subject: 'Confirmação de consulta - FisioFlow',
    body: 'Olá {nome}! Sua consulta foi agendada para {data} às {hora}. Por favor, chegue com 15 minutos de antecedência. Até logo!',
    icon: Calendar,
    tags: ['agendamento', 'confirmação'],
  },
  {
    id: 'lembrete-agendamento',
    category: 'agendamento',
    title: 'Lembrete de Consulta',
    subject: 'Lembrete: Sua consulta é amanhã',
    body: 'Olá {nome}! Lembrando que sua consulta é amanhã às {hora}. Confirmamos seu horário e aguardamos sua presença!',
    icon: Clock,
    tags: ['agendamento', 'lembrete'],
  },
  {
    id: 'feliz-aniversario',
    category: 'aniversario',
    title: 'Feliz Aniversário',
    subject: 'Feliz Aniversário! 🎂',
    body: 'Olá {nome}! A equipe {clinica} deseja a você um feliz aniversário! Que seu dia seja especial e cheio de alegria. 🎉',
    icon: Gift,
    tags: ['aniversário', 'comemoração'],
  },
  {
    id: 'reativacao',
    category: 'reactivacao',
    title: 'Reativação de Tratamento',
    subject: 'Sentimos sua falta - Volte quando precisar',
    body: 'Olá {nome}! Sentimos sua ausência. Se você precisa de uma nova sessão de fisioterapia, estamos aqui para ajudar. Agende seu retorno!',
    icon: MessageCircle,
    tags: ['reativação', 'retenção'],
  },
  {
    id: 'pesquisa-satisfacao',
    category: 'pesquisa',
    title: 'Pesquisa de Satisfação',
    subject: 'Sua opinião é importante para nós',
    body: 'Olá {nome}! Gostaríamos de saber sua opinião sobre o tratamento. Sua resposta nos ajuda a melhorar cada vez mais. Obrigado!',
    icon: CheckCircle,
    tags: ['pesquisa', 'feedback'],
  },
  {
    id: 'evolucao-positiva',
    category: 'evolucao',
    title: 'Evolução Positiva',
    subject: 'Ótima notícia sobre seu tratamento!',
    body: 'Olá {nome}! Temos ótimas notícias sobre sua evolução. Seu progresso tem sido excelente e estamos muito felizes com os resultados. Continue assim! 🌟',
    icon: Stethoscope,
    tags: ['evolução', 'motivação'],
  },
];

const CATEGORY_COLORS: Record<MessageTemplate['category'], string> = {
  lembrete: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  agendamento: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  aniversario: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  reativacao: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  pesquisa: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  evolucao: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
};

interface MessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void;
  selectedCategory?: MessageTemplate['category'] | 'all';
  onCategoryChange?: (category: MessageTemplate['category'] | 'all') => void;
}

export function MessageTemplates({
  onSelectTemplate,
  selectedCategory = 'all',
  onCategoryChange,
}: MessageTemplatesProps) {
  const filteredTemplates =
    selectedCategory === 'all'
      ? MESSAGE_TEMPLATES
      : MESSAGE_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      {onCategoryChange && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('all')}
          >
            Todos
          </Button>
          <Button
            variant={selectedCategory === 'lembrete' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('lembrete')}
          >
            Lembretes
          </Button>
          <Button
            variant={selectedCategory === 'agendamento' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('agendamento')}
          >
            Agendamentos
          </Button>
          <Button
            variant={selectedCategory === 'aniversario' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('aniversario')}
          >
            Aniversários
          </Button>
          <Button
            variant={selectedCategory === 'reactivacao' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('reactivacao')}
          >
            Reativação
          </Button>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTemplates.map((template) => {
          const Icon = template.icon || MessageCircle;
          return (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => onSelectTemplate(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'p-1.5 rounded-md',
                      CATEGORY_COLORS[template.category]
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm">{template.title}</CardTitle>
                  </div>
                </div>
                {template.subject && (
                  <p className="text-xs text-muted-foreground mt-1">{template.subject}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {template.body}
                </p>
                {template.tags && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export { MESSAGE_TEMPLATES };
export default MessageTemplates;
