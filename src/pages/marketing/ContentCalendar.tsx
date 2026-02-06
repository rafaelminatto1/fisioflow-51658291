/**
 * Content Calendar for Instagram
 *
 * Plan and schedule social media content with AI-generated ideas
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  Image,
  Video,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addDoc,
  collection,
  getDocs,
  query,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ContentType = 'post' | 'story' | 'reel' | 'carousel' | 'live';
type ContentStatus = 'idea' | 'scheduled' | 'posted' | 'cancelled';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  status: ContentStatus;
  date: string;
  hashtags?: string;
  imageUrl?: string;
  createdAt: string;
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'post', label: 'Post', icon: Image, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'story', label: 'Story', icon: Image, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: 'reel', label: 'Reel', icon: Video, color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'carousel', label: 'Carrossel', icon: FileText, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'live', label: 'Live', icon: Video, color: 'bg-orange-100 text-orange-700 border-orange-200' },
];

const _STATUS_COLORS: Record<ContentStatus, string> = {
  idea: 'bg-gray-100 text-gray-700 border-gray-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  posted: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const CONTENT_IDEAS = [
  { title: 'Dica da Semana', description: 'Compartilhe uma dica rápida de saúde/postura', type: 'post' as ContentType },
  { title: 'Antes e Depois', description: 'Mostre uma evolução de um paciente (com consentimento)', type: 'post' as ContentType },
  { title: 'Mitos e Verdades', description: 'Desfaça um mito comum sobre fisioterapia', type: 'carousel' as ContentType },
  { title: 'Bastidores', description: 'Mostre um pouco do dia a dia da clínica', type: 'story' as ContentType },
  { title: 'Exercício em Vídeo', description: 'Demonstre um exercício simples', type: 'reel' as ContentType },
  { title: 'Dúvida Frequentes', description: 'Responda uma pergunta comum de pacientes', type: 'post' as ContentType },
  { title: 'Depoimento', description: 'Compartilhe um depoimento (autorizado)', type: 'post' as ContentType },
  { title: 'Live Q&A', description: 'Ao vivo tirando dúvidas', type: 'live' as ContentType },
  { title: 'Casos Clínicos', description: 'Explique um caso interessante (anonimizado)', type: 'carousel' as ContentType },
  { title: 'Equipe', description: 'Apresente um membro da equipe', type: 'post' as ContentType },
];

export default function ContentCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'post' as ContentType,
    status: 'idea' as ContentStatus,
    date: '',
    hashtags: '',
  });
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | 'all'>('all');
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  useEffect(() => {
    loadContentItems();
  }, []);

  const loadContentItems = async () => {
    try {
      const q = query(collection(db, 'content_calendar'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data()),
      } as ContentItem));
      setContentItems(items);
    } catch (error) {
      console.error('Error loading content items:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateIdeas = async () => {
    setGeneratingIdeas(true);
    // Simulate AI generation - in production, this would call an AI service
    await new Promise(resolve => setTimeout(resolve, 1000));

    const today = new Date();
    const newIdeas = CONTENT_IDEAS.slice(0, 3).map((idea, index) => ({
      title: idea.title,
      description: idea.description,
      type: idea.type,
      status: 'idea' as ContentStatus,
      date: format(addDays(today, index * 2), 'yyyy-MM-dd'),
      hashtags: '#fisioterapia #saude #movimento',
    }));

    for (const idea of newIdeas) {
      await addDoc(collection(db, 'content_calendar'), {
        ...idea,
        createdAt: serverTimestamp(),
      });
    }

    await loadContentItems();
    setGeneratingIdeas(false);
    toast.success('3 ideias geradas automaticamente!');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'content_calendar', editingItem.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        toast.success('Conteúdo atualizado!');
      } else {
        await addDoc(collection(db, 'content_calendar'), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        toast.success('Conteúdo adicionado ao calendário!');
      }

      setShowAddDialog(false);
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        type: 'post',
        status: 'idea',
        date: '',
        hashtags: '',
      });
      await loadContentItems();
    } catch (_error) {
      toast.error('Erro ao salvar conteúdo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;

    try {
      await deleteDoc(doc(db, 'content_calendar', id));
      toast.success('Conteúdo excluído!');
      await loadContentItems();
    } catch (_error) {
      toast.error('Erro ao excluir conteúdo');
    }
  };

  const getFilteredItems = () => {
    return contentItems.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      return true;
    });
  };

  const getItemsForDate = (date: Date) => {
    return getFilteredItems().filter(item =>
      item.date && isSameDay(parseISO(item.date), date)
    );
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Calendário de Conteúdo
          </h1>
          <p className="text-muted-foreground mt-1">
            Planeje e organize seu conteúdo para redes sociais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateIdeas} disabled={generatingIdeas}>
            {generatingIdeas ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Ideias com IA
              </>
            )}
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Conteúdo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <Select value={filterType} onValueChange={(value: unknown) => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {CONTENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value: unknown) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="idea">Ideia</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="posted">Postado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const items = getItemsForDate(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-24 p-2 border rounded-lg',
                      isToday && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className={cn(
                      'text-sm font-medium mb-1',
                      isToday && 'text-primary'
                    )}>
                  {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 2).map(item => {
                        const typeConfig = CONTENT_TYPES.find(t => t.value === item.type);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setEditingItem(item);
                              setFormData({
                                title: item.title,
                                description: item.description,
                                type: item.type,
                                status: item.status,
                                date: item.date,
                                hashtags: item.hashtags || '',
                              });
                              setShowAddDialog(true);
                            }}
                            className={cn(
                              'text-xs p-1 rounded cursor-pointer truncate',
                              typeConfig?.color
                            )}
                          >
                      {item.title}
                          </div>
                        );
                      })}
                      {items.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{items.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Content */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Conteúdos</CardTitle>
            <CardDescription>Itens agendados para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getFilteredItems()
                .filter(item => item.status !== 'cancelled' && item.status !== 'posted')
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 6)
                .map(item => {
                  const typeConfig = CONTENT_TYPES.find(t => t.value === item.type);
                  const Icon = typeConfig?.icon || Image;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setEditingItem(item);
                        setFormData({
                          title: item.title,
                          description: item.description,
                          type: item.type,
                          status: item.status,
                          date: item.date,
                          hashtags: item.hashtags || '',
                        });
                        setShowAddDialog(true);
                      }}
                    >
                      <div className={cn('p-2 rounded', typeConfig?.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.date && format(parseISO(item.date), 'dd/MMM')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              {getFilteredItems().filter(item => item.status !== 'cancelled' && item.status !== 'posted').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum conteúdo agendado</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={generateIdeas}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Ideias
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingItem ? 'Editar Conteúdo' : 'Novo Conteúdo'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Dica da semana"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descrição do conteúdo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: unknown) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value: unknown) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Ideia</SelectItem>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="posted">Postado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Hashtags</Label>
                <Input
                  value={formData.hashtags}
                  onChange={e => setFormData({ ...formData, hashtags: e.target.value })}
                  placeholder="#fisioterapia #saude"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setEditingItem(null);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || !formData.title}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </MainLayout>
  );
}

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { addDays } from 'date-fns';
import { normalizeFirestoreData } from '@/utils/firestoreData';
