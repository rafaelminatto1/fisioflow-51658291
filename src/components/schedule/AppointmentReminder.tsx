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
              className="flex items-center gap-1.5 px-2 py-1"
            >
              <Bell className="h-3 w-3" />
              <span>{formatReminder(reminder)}</span>
              {!disabled && (
                <button 
                  type="button"
                  onClick={() => removeReminder(reminder.id)} 
                  className="ml-1 hover:text-destructive"
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
                className={cn("text-xs h-7", isAdded && "opacity-50")}
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
            className="text-xs h-7"
          >
            <Plus className="h-3 w-3 mr-1" />
            Personalizar
          </Button>
        </div>
      )}

      {/* Custom Reminder Form */}
      {showCustom && !disabled && (
        <div className="bg-muted/30 rounded-lg p-3 border space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tempo</Label>
              <Input
                type="number"
                min="1"
                value={customReminder.timeValue}
                onChange={(e) => setCustomReminder(prev => ({ ...prev, timeValue: Number(e.target.value) }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidade</Label>
              <Select
                value={customReminder.timeUnit}
                onValueChange={(value) => setCustomReminder(prev => ({ ...prev, timeUnit: value as 'minutes' | 'hours' | 'days' }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Antes</SelectItem>
                  <SelectItem value="after">Depois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notificar via</Label>
            <div className="flex gap-2">
              {(['whatsapp', 'email', 'push'] as const).map((channel) => (
                <Button
                  key={channel}
                  type="button"
                  size="sm"
                  variant={customReminder.notifyVia.includes(channel) ? 'default' : 'outline'}
                  onClick={() => toggleNotifyVia(channel)}
                  className="h-7 text-xs capitalize"
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
              className="text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCustom(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={addCustomReminder}
              disabled={customReminder.notifyVia.length === 0}
            >
              Adicionar Lembrete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
