import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Bell, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppointmentReminderData {
  id: string;
  type: 'before' | 'after';
  timeValue: number;
  timeUnit: 'minutes' | 'hours' | 'days';
  message?: string;
  notifyVia: ('whatsapp' | 'email' | 'push')[];
}

interface AppointmentReminderProps {
  reminders: AppointmentReminderData[];
  onRemindersChange: (reminders: AppointmentReminderData[]) => void;
  disabled?: boolean;
}

const defaultReminderTemplates = [
  { label: '24h antes', type: 'before' as const, timeValue: 24, timeUnit: 'hours' as const },
  { label: '2h antes', type: 'before' as const, timeValue: 2, timeUnit: 'hours' as const },
  { label: '1 dia antes', type: 'before' as const, timeValue: 1, timeUnit: 'days' as const },
  { label: '30min antes', type: 'before' as const, timeValue: 30, timeUnit: 'minutes' as const },
];

export const AppointmentReminder: React.FC<AppointmentReminderProps> = ({
  reminders,
  onRemindersChange,
  disabled = false
}) => {
  const compactFieldClass =
    "h-9 rounded-xl border border-border/70 bg-gradient-to-b from-background to-muted/20 text-xs shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)] focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/30";

  const [showCustom, setShowCustom] = useState(false);
  const [customReminder, setCustomReminder] = useState<Omit<AppointmentReminderData, 'id'>>({
    type: 'before',
    timeValue: 1,
    timeUnit: 'hours',
    message: '',
    notifyVia: ['whatsapp']
  });

  const addQuickReminder = (template: typeof defaultReminderTemplates[0]) => {
    const newReminder: AppointmentReminderData = {
      id: `reminder-${Date.now()}`,
      type: template.type,
      timeValue: template.timeValue,
      timeUnit: template.timeUnit,
      notifyVia: ['whatsapp']
    };
    onRemindersChange([...reminders, newReminder]);
  };

  const addCustomReminder = () => {
    const newReminder: AppointmentReminderData = {
      id: `reminder-${Date.now()}`,
      ...customReminder
    };
    onRemindersChange([...reminders, newReminder]);
    setShowCustom(false);
    setCustomReminder({
      type: 'before',
      timeValue: 1,
      timeUnit: 'hours',
      message: '',
      notifyVia: ['whatsapp']
    });
  };

  const removeReminder = (id: string) => {
    onRemindersChange(reminders.filter(r => r.id !== id));
  };

  const toggleNotifyVia = (channel: 'whatsapp' | 'email' | 'push') => {
    setCustomReminder(prev => ({
      ...prev,
      notifyVia: prev.notifyVia.includes(channel)
        ? prev.notifyVia.filter(c => c !== channel)
        : [...prev.notifyVia, channel]
    }));
  };

  const formatReminder = (reminder: AppointmentReminderData) => {
    const unit = reminder.timeUnit === 'minutes' ? 'min' : 
                 reminder.timeUnit === 'hours' ? 'h' : 'd';
    return `${reminder.timeValue}${unit} ${reminder.type === 'before' ? 'antes' : 'depois'}`;
  };

  return (
    <div className="space-y-3">
      {/* Active Reminders */}
      {reminders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reminders.map((reminder) => (
            <Badge 
              key={reminder.id} 
              variant="secondary" 
              className="flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
            >
              <Bell className="h-3 w-3" />
              <span>{formatReminder(reminder)}</span>
              {!disabled && (
                <button 
                  type="button"
                  onClick={() => removeReminder(reminder.id)} 
                  className="ml-1 rounded-full p-0.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Quick Add Buttons */}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          {defaultReminderTemplates.map((template, idx) => {
            const isAdded = reminders.some(
              r => r.type === template.type && 
                   r.timeValue === template.timeValue && 
                   r.timeUnit === template.timeUnit
            );
            return (
              <Button
                key={idx}
                type="button"
                variant="outline"
                size="sm"
                disabled={isAdded}
                onClick={() => addQuickReminder(template)}
                className={cn(
                  "h-8 rounded-full border border-border/70 bg-gradient-to-b from-background to-muted/20 px-3 text-xs shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)] hover:border-primary/20 hover:bg-primary/[0.04]",
                  isAdded && "opacity-50"
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {template.label}
              </Button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCustom(!showCustom)}
            className="h-8 rounded-full px-3 text-xs text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-3 w-3 mr-1" />
            Personalizar
          </Button>
        </div>
      )}

      {/* Custom Reminder Form */}
      {showCustom && !disabled && (
        <div className="space-y-3 rounded-[22px] border border-border/70 bg-gradient-to-b from-background to-muted/25 p-4 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.35)]">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tempo</Label>
              <Input
                type="number"
                min="1"
                value={customReminder.timeValue}
                onChange={(e) => setCustomReminder(prev => ({ ...prev, timeValue: Number(e.target.value) }))}
                className={compactFieldClass}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidade</Label>
              <Select
                value={customReminder.timeUnit}
                onValueChange={(value) => setCustomReminder(prev => ({ ...prev, timeUnit: value as 'minutes' | 'hours' | 'days' }))}
              >
                <SelectTrigger className={compactFieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[20px] border border-border/70 bg-background/95 p-1 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quando</Label>
              <Select
                value={customReminder.type}
                onValueChange={(value) => setCustomReminder(prev => ({ ...prev, type: value as 'before' | 'after' }))}
              >
                <SelectTrigger className={compactFieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[20px] border border-border/70 bg-background/95 p-1 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <SelectItem value="before">Antes</SelectItem>
                  <SelectItem value="after">Depois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notificar via</Label>
            <div className="flex flex-wrap gap-2">
              {(['whatsapp', 'email', 'push'] as const).map((channel) => (
                <Button
                  key={channel}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleNotifyVia(channel)}
                  className={cn(
                    "h-8 rounded-full border border-border/70 px-3 text-xs capitalize shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)]",
                    customReminder.notifyVia.includes(channel)
                      ? "border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-gradient-to-b from-background to-muted/20 hover:border-primary/20 hover:bg-primary/[0.04]"
                  )}
                >
                  {channel === 'whatsapp' ? '📱 WhatsApp' : channel === 'email' ? '✉️ Email' : '🔔 Push'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mensagem personalizada (opcional)</Label>
            <Textarea
              value={customReminder.message || ''}
              onChange={(e) => setCustomReminder(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Ex: Lembre-se de trazer os exames..."
              rows={2}
              className="resize-none rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/20 text-xs shadow-[0_12px_24px_-22px_rgba(15,23,42,0.35)] focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/30"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCustom(false)}
              className="rounded-full px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={addCustomReminder}
              disabled={customReminder.notifyVia.length === 0}
              className="rounded-full px-4"
            >
              Adicionar Lembrete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
