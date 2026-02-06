/**
 * GlobalTimer - Widget flutuante de timer global
 * Persiste entre páginas e permite controle rápido do timer
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

  Play,
  Pause,
  Square,
  Clock,
  MoreVertical,
  X,
  Edit2,
  DollarSign,
  Tag,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuickTimer } from '@/hooks/useTimeTracker';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import type { ActiveTimer } from '@/types/timetracking';

interface GlobalTimerProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  minimized?: boolean;
}

export function GlobalTimer({
  position = 'bottom-right',
  minimized = false,
}: GlobalTimerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isMinimized, setIsMinimized] = useState(minimized);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number | undefined>();

  const {
    activeTimer,
    isRunning,
    formattedTime,
    startTimer,
    stopTimer,
    discardTimer,
  } = useQuickTimer({
    organizationId: user?.organizationId || '',
    userId: user?.uid || '',
  });

  // Atualizar form quando timer muda
  useEffect(() => {
    if (activeTimer) {
      setDescription(activeTimer.description);
      setIsBillable(activeTimer.is_billable);
      setHourlyRate(activeTimer.hourly_rate);
    }
  }, [activeTimer]);

  // Posicionamento CSS
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const handleStart = () => {
    if (!description.trim()) {
      toast.error('Digite uma descrição para o timer');
      return;
    }
    startTimer(description.trim());
    setIsEditing(false);
  };

  const handleStop = async () => {
    await stopTimer();
    toast.success('Timer finalizado e entrada criada!');
  };

  const handleDiscard = () => {
    if (window.confirm('Descartar timer ativo? O tempo será perdido.')) {
      discardTimer();
      toast.info('Timer descartado');
    }
  };

  const handleEditSave = () => {
    if (!activeTimer || !description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    // TODO: Atualizar timer ativo
    setIsEditing(false);
  };

  // Se não há timer ativo e está minimizado, não mostrar
  if (!activeTimer && isMinimized) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className={`fixed ${positionClasses[position]} z-50`}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <MinimizedTimer
            key="minimized"
            isRunning={isRunning}
            formattedTime={formattedTime}
            onExpand={() => setIsMinimized(false)}
            onStop={handleStop}
          />
        ) : (
          <ExpandedTimer
            key="expanded"
            activeTimer={activeTimer}
            isRunning={isRunning}
            formattedTime={formattedTime}
            description={description}
            isEditing={isEditing}
            isBillable={isBillable}
            hourlyRate={hourlyRate}
            onDescriptionChange={setDescription}
            onBillableChange={setIsBillable}
            onHourlyRateChange={setHourlyRate}
            onStart={handleStart}
            onStop={handleStop}
            onDiscard={handleDiscard}
            onEdit={() => setIsEditing(true)}
            onEditSave={handleEditSave}
            onEditCancel={() => setIsEditing(false)}
            onMinimize={() => setIsMinimized(true)}
            onGoToTimeTracking={() => navigate('/timetracking')}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MinimizedTimerProps {
  isRunning: boolean;
  formattedTime: string;
  onExpand: () => void;
  onStop: () => void;
}

function MinimizedTimer({
  isRunning,
  formattedTime,
  onExpand,
  onStop,
}: MinimizedTimerProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg flex items-center gap-3 cursor-pointer"
      onClick={onExpand}
    >
      {isRunning && (
        <div className="relative">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
      )}
      <Clock className="w-4 h-4" />
      <span className="font-mono font-medium">{formattedTime}</span>
      <ChevronUp className="w-4 h-4" />
    </motion.div>
  );
}

interface ExpandedTimerProps {
  activeTimer: ActiveTimer | null;
  isRunning: boolean;
  formattedTime: string;
  description: string;
  isEditing: boolean;
  isBillable: boolean;
  hourlyRate: number | undefined;
  onDescriptionChange: (value: string) => void;
  onBillableChange: (value: boolean) => void;
  onHourlyRateChange: (value: number | undefined) => void;
  onStart: () => void;
  onStop: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onMinimize: () => void;
  onGoToTimeTracking: () => void;
}

function ExpandedTimer({
  activeTimer,
  isRunning,
  formattedTime,
  description,
  isEditing,
  isBillable,
  hourlyRate,
  onDescriptionChange,
  onBillableChange,
  onHourlyRateChange,
  onStart,
  onStop,
  onDiscard,
  onEdit,
  onEditSave,
  onEditCancel,
  onMinimize,
  onGoToTimeTracking,
}: ExpandedTimerProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-background border rounded-xl shadow-2xl w-80 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
          <Clock className="w-4 h-4" />
          <span className="font-medium text-sm">Timer</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onMinimize}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="font-mono text-4xl font-bold tracking-tight">
            {formattedTime}
          </div>
          {activeTimer && (
            <div className="text-xs text-muted-foreground mt-1">
              Iniciado às {new Date(activeTimer.start_time).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        {/* Description */}
        {!isRunning && !isEditing && (
          <Input
            placeholder="O que você está fazendo?"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onStart()}
            autoFocus
          />
        )}

        {isEditing && activeTimer && (
          <div className="space-y-2">
            <Textarea
              placeholder="Descrição"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="billable"
                  checked={isBillable}
                  onCheckedChange={onBillableChange}
                />
                <Label htmlFor="billable" className="text-sm">
                  Faturável
                </Label>
              </div>
              <Input
                type="number"
                placeholder="R$/h"
                value={hourlyRate || ''}
                onChange={(e) => onHourlyRateChange(e.target.value ? Number(e.target.value) : undefined)}
                className="w-24"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEditCancel} className="flex-1">
                Cancelar
              </Button>
              <Button size="sm" onClick={onEditSave} className="flex-1">
                Salvar
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={onStart} className="flex-1" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </Button>
            ) : (
              <>
                <Button onClick={onStop} variant="default" className="flex-1" size="sm">
                  <Square className="w-4 h-4 mr-2" />
                  Parar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDiscard} className="text-destructive">
                      <X className="w-4 h-4 mr-2" />
                      Descartar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onGoToTimeTracking}>
                      <Clock className="w-4 h-4 mr-2" />
                      Ver Time Tracking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}

        {/* Billable Badge */}
        {activeTimer && isBillable && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            {hourlyRate ? (
              <span>
                R$ {((activeTimer.duration_seconds || 0) / 3600 * hourlyRate).toFixed(2)}
              </span>
            ) : (
              <span>Faturável</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Provider para tornar o GlobalTimer disponível em toda a app
 */
export function GlobalTimerProvider({ children }: { children: React.ReactNode }) {
  // TODO: Implementar provider se necessário
  return <>{children}</>;
}
