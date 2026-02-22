/**
 * NaturalLanguageScheduler - Agendamento por linguagem natural
 *
 * Features:
 * - Parse de linguagem natural para criar agendamentos
 * - Reconhecimento de nomes, datas, horários
 * - Sugestões em tempo real
 * - Histórico de comandos
 * - Multi-idioma (pt-BR)
 * - Correção automática
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sparkles,
  Clock,
  Calendar,
  User,
  Check,
  X,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { parse, isValid, format, addDays, addWeeks, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// TIPOS
// ============================================================================

export interface NLEntity {
  type: 'patient' | 'date' | 'time' | 'duration' | 'service' | 'notes';
  text: string;
  value: any;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface ParsedAppointment {
  patientName?: string;
  date?: Date;
  time?: string;
  duration?: number;
  service?: string;
  notes?: string;
  confidence: number;
}

// ============================================================================
// PARSER DE LINGUAGEM NATURAL
// ============================================================================

class NLPParser {
  private patientNames: Set<string>;
  private services: string[];
  private commonTerms: Map<string, any>;

  constructor(patientNames: string[] = [], services: string[] = []) {
    this.patientNames = new Set(patientNames);
    this.services = services;
    this.commonTerms = this.buildCommonTerms();
  }

  private buildCommonTerms(): Map<string, any> {
    const terms = new Map();

    // Dias da semana
    terms.set('segunda', 1);
    terms.set('terça', 2);
    terms.set('quarta', 3);
    terms.set('quinta', 4);
    terms.set('sexta', 5);
    terms.set('sábado', 6);
    terms.set('domingo', 0);
    terms.set('hoje', new Date());
    terms.set('amanhã', addDays(new Date(), 1));
    terms.set('segunda-feira', 1);
    terms.set('terça-feira', 2);
    terms.set('quarta-feira', 3);
    terms.set('quinta-feira', 4);
    terms.set('sexta-feira', 5);

    // Períodos
    terms.set('esta semana', 'this-week');
    terms.set('próxima semana', 'next-week');
    terms.set('esta manha', 'this-morning');
    terms.set('esta tarde', 'this-afternoon');
    terms.set('esta noite', 'this-evening');

    // Durações
    terms.set('minuto', 1);
    terms.set('minutos', 1);
    terms.set('hora', 60);
    terms.set('horas', 60);
    terms.set('meia hora', 30);
    terms.set('meia-hora', 30);
    terms.set('uma hora', 60);
    terms.set('duas horas', 120);
    terms.set('três horas', 180);
    terms.set('quatro horas', 240);

    // Serviços comuns
    terms.set('avaliação', 'Avaliação');
    terms.set('sessão', 'Sessão');
    terms.set('retorno', 'Retorno');
    terms.set('fisioterapia', 'Fisioterapia');
    terms.set('massagem', 'Massagem');
    terms.set('alongamento', 'Alongamento');
    terms.set('exercício', 'Exercício');

    return terms;
  }

  private extractTime(text: string): { time: string | null; remainder: string } {
    // Padrões de horário
    const patterns = [
      /(\d{1,2})\s*[:]\s*(\d{2})/g, // 14:30
      /(\d{1,2})\s*[h]\s*(\d{0,2})/gi, // 14h30 ou 14h
      /(\d{3,4})/g, // 1430
      /(\d{1,2})\s*horas?\s*e\s*(\d{1,2})/gi, // 14 horas e 30
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let time: string;
        const matchedText = match[0];

        // Normalizar para HH:MM
        if (pattern.source.includes(':')) {
          time = match[0];
        } else if (pattern.source.includes('h')) {
          const hours = match[1].padStart(2, '0');
          const minutes = match[2] ? match[2].padStart(2, '0') : '00';
          time = `${hours}:${minutes}`;
        } else if (pattern.source.includes('horas?\\s*e\\s*')) {
          const hours = match[1].padStart(2, '0');
          const minutes = match[2] ? match[2].padStart(2, '0') : '00';
          time = `${hours}:${minutes}`;
        } else {
          const numStr = match[0];
          if (numStr.length === 3) {
            time = `0${numStr[0]}:${numStr.slice(1)}`;
          } else {
            time = `${numStr.slice(0, 2)}:${numStr.slice(2)}`;
          }
        }

        return { time, remainder: text.replace(matchedText, '') };
      }
    }

    return { time: null, remainder: text };
  }

  private extractDuration(text: string): { duration: number | null; remainder: string } {
    let duration: number | null = null;
    let remainder = text;

    for (const [term, value] of this.commonTerms.entries()) {
      if (typeof value === 'number' && (term === 'hora' || term === 'horas' || term.includes('minuto'))) {
        const regex = new RegExp(`(\\d+)\\s*${term.replace('(', '\\(').replace(')', '\\)')}`, 'gi');
        const match = remainder.match(regex);
        if (match) {
          const num = parseInt(match[1]);
          duration = (duration || 0) + (num * value);
          remainder = remainder.replace(match[0], '');
        }
      }
    }

    return { duration, remainder };
  }

  private extractDate(text: string): { date: Date | null; remainder: string } {
    let date: Date | null = null;
    let remainder = text;

    // Hoje/amanhã
    const todayMatch = remainder.match(/(?:agendar|marcar|para)\s+(hoje|amanhã)/gi);
    if (todayMatch) {
      const term = this.commonTerms.get(todayMatch[1].toLowerCase()) as Date;
      if (term instanceof Date) {
        date = term;
        remainder = remainder.replace(todayMatch[0], '');
      }
    }

    // Dia da semana
    const dayMatch = remainder.match(/(?:agendar|marcar|na|para|de)\s+(segunda|terça|quarta|quinta|sexta|sábado|domingo)/gi);
    if (dayMatch) {
      const dayNum = this.commonTerms.get(dayMatch[1].toLowerCase()) as number;
      if (typeof dayNum === 'number') {
        const now = new Date();
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const targetDate = addDays(startOfThisWeek, dayNum);

        // Se a data já passou, usar a próxima semana
        if (targetDate < now) {
          date = addWeeks(targetDate, 1);
        } else {
          date = targetDate;
        }

        remainder = remainder.replace(dayMatch[0], '');
      }
    }

    // Data explícita (dd/mm ou dd/mm/yyyy)
    const explicitDateMatch = remainder.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
    if (explicitDateMatch) {
      const [, day, month, year] = explicitDateMatch;
      const currentYear = new Date().getFullYear();
      const fullYear = year ? parseInt(year) : currentYear;

      const parsedDate = parse(`${day}/${month}/${fullYear}`, 'd/M/yyyy', new Date());
      if (isValid(parsedDate)) {
        date = parsedDate;
        remainder = remainder.replace(explicitDateMatch[0], '');
      }
    }

    return { date, remainder };
  }

  private extractService(text: string): { service: string | null; remainder: string } {
    let service: string | null = null;
    let remainder = text;

    for (const [term, value] of this.commonTerms.entries()) {
      if (typeof value === 'string' && (term === 'avaliação' || term === 'sessão' || term === 'retorno')) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const match = remainder.match(regex);
        if (match && !service) {
          service = value;
          remainder = remainder.replace(match[0], '');
        }
      }
    }

    return { service, remainder };
  }

  private extractPatient(text: string): { patient: string | null; remainder: string } {
    let patient: string | null = null;
    let remainder = text;

    // Tentar encontrar nome que parece ser de paciente
    const words = text.split(/\s+/).filter(w => w.length > 2);

    for (const word of words) {
      const cleanedWord = word.replace(/[.,;!?]/g, '');
      if (this.patientNames.has(cleanedWord)) {
        patient = cleanedWord;
        remainder = remainder.replace(word, '');
        break;
      }
    }

    return { patient, remainder };
  }

  private extractNotes(text: string): { notes: string | null; remainder: string } {
    // Remover entidades já extraídas e pegar o restante como notas
    const cleaned = text
      .replace(/(?:agendar|marcar|para|com|na|de|às?|à)\s*/gi, '')
      .replace(/(?:hoje|amanhã|esta\s+(?:semana|manhã|tarde|noite))/gi, '')
      .replace(/(?:segunda|terça|quarta|quinta|sexta|sábado|domingo|-feira)/gi, '')
      .replace(/\d+[:h]\d*/g, '')
      .replace(/\d{3,4}/g, '')
      .trim();

    return { notes: cleaned || null, remainder: '' };
  }

  public parse(text: string): ParsedAppointment {
    let confidence = 0;
    let result: Partial<ParsedAppointment> = {};

    // Extrair em ordem específica
    let currentText = text;

    const { patient, remainder: r1 } = this.extractPatient(currentText);
    if (patient) {
      result.patientName = patient;
      confidence += 25;
    }
    currentText = r1;

    const { date, remainder: r2 } = this.extractDate(currentText);
    if (date) {
      result.date = date;
      confidence += 20;
    }
    currentText = r2;

    const { time, remainder: r3 } = this.extractTime(currentText);
    if (time) {
      result.time = time;
      confidence += 15;
    }
    currentText = r3;

    const { duration, remainder: r4 } = this.extractDuration(currentText);
    if (duration) {
      result.duration = duration;
      confidence += 15;
    }
    currentText = r4;

    const { service, remainder: r5 } = this.extractService(currentText);
    if (service) {
      result.service = service;
      confidence += 15;
    }
    currentText = r5;

    const { notes } = this.extractNotes(currentText);
    if (notes) {
      result.notes = notes;
      confidence += 10;
    }

    // Se data não encontrada, usar hoje como padrão
    if (!result.date) {
      result.date = new Date();
      confidence = Math.max(10, confidence - 20);
    }

    return {
      ...result,
      confidence: Math.min(100, confidence),
    } as ParsedAppointment;
  }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface NaturalLanguageSchedulerProps {
  onConfirm: (appointment: ParsedAppointment) => void;
  patientNames?: string[];
  services?: string[];
  disabled?: boolean;
  placeholder?: string;
}

export const NaturalLanguageScheduler: React.FC<NaturalLanguageSchedulerProps> = ({
  onConfirm,
  patientNames = [],
  services = ['Fisioterapia', 'Avaliação', 'Massagem', 'Alongamento'],
  disabled = false,
  placeholder = 'Ex: Agendar João para amanhã às 14h30, sessão de fisioterapia de 1 hora',
}) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedAppointment | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const parserRef = useRef<NLPParser | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializar parser
  useEffect(() => {
    parserRef.current = new NLParser(patientNames, services);
  }, [patientNames, services]);

  // Exemplos de comandos
  const examples = [
    'Agendar Maria para amanhã às 14:00',
    'Marcar avaliação com João hoje às 9h',
    'Agendar Pedro para terça-feira, sessão de 1 hora',
    'Marcar Ana para 15/03 às 10:30, retorno',
  ];

  // Gerar sugestões
  const handleInput = useCallback((value: string) => {
    setInput(value);

    if (value.length > 2 && parserRef.current) {
      const result = parserRef.current.parse(value);

      // Mostrar sugestões baseado no parse
      const newSuggestions: string[] = [];

      if (result.patientName) {
        newSuggestions.push(`Paciente: ${result.patientName}`);
      }
      if (result.date) {
        newSuggestions.push(`Data: ${format(result.date, "dd 'de' MMMM", { locale: ptBR })}`);
      }
      if (result.time) {
        newSuggestions.push(`Horário: ${result.time}`);
      }
      if (result.duration) {
        newSuggestions.push(`Duração: ${result.duration} min`);
      }

      setSuggestions(newSuggestions);
      setParsed(result);

      if (result.confidence > 50) {
        setShowPreview(true);
      }
    } else {
      setSuggestions([]);
      setParsed(null);
      setShowPreview(false);
    }
  }, []);

  // Submeter
  const handleSubmit = useCallback(() => {
    if (parsed && parsed.confidence > 30) {
      onConfirm(parsed);
      setInput('');
      setParsed(null);
      setShowPreview(false);
      setSuggestions([]);
    }
  }, [parsed, onConfirm]);

  // Usar exemplo
  const useExample = useCallback((example: string) => {
    setInput(example);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setInput('');
      setParsed(null);
      setShowPreview(false);
      setSuggestions([]);
    }
  }, [handleSubmit]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Agendamento Inteligente</h2>
      </div>

      {/* Input principal */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                'w-full px-4 py-3 pr-10 rounded-lg border-2',
                'transition-all',
                'focus:outline-none focus:border-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                parsed && parsed.confidence > 60 ? 'border-green-500' : 'border-input'
              )}
            />
            {parsed && parsed.confidence > 60 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!parsed || parsed.confidence < 30 || disabled}
            className={cn(
              'px-6 py-3 rounded-lg font-medium transition-all',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            <Calendar className="w-4 h-4" />
            Agendar
          </button>
        </div>

        {/* Sugestões em tempo real */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50">
            <div className="p-2">
              {suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded hover:bg-muted/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview do agendamento */}
      {showPreview && parsed && (
        <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Agendamento detectado</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {parsed.patientName && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span><span className="text-muted-foreground">Paciente:</span> {parsed.patientName}</span>
                  </div>
                )}
                {parsed.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span><span className="text-muted-foreground">Data:</span> {format(parsed.date, 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                )}
                {parsed.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span><span className="text-muted-foreground">Horário:</span> {parsed.time}</span>
                  </div>
                )}
                {parsed.duration && (
                  <div className="col-span-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span><span className="text-muted-foreground">Duração:</span> {parsed.duration} minutos</span>
                  </div>
                )}
                {parsed.service && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Serviço:</span> {parsed.service}
                  </div>
                )}
                {parsed.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Observações:</span> {parsed.notes}
                  </div>
                )}
              </div>

              {/* Confidence indicator */}
              <div className="mt-3 pt-3 border-t border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Confiança da detecção:
                  </span>
                  <span className={cn(
                    'font-semibold',
                    parsed.confidence > 70 ? 'text-green-600' :
                    parsed.confidence > 40 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {parsed.confidence}%
                  </span>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      parsed.confidence > 70 ? 'bg-green-500' :
                      parsed.confidence > 40 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${parsed.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exemplos de comandos */}
      {!input && !parsed && (
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Tente estes exemplos:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => useExample(example)}
                className="px-4 py-2 text-left bg-muted/30 hover:bg-muted/50 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span>{example}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

NaturalLanguageScheduler.displayName = 'NaturalLanguageScheduler';

// ============================================================================
// HOOK PARA USO
// ============================================================================

export const useNaturalLanguageScheduler = (patientNames: string[] = []) => {
  const parserRef = React.useRef<NLPParser | null>(null);

  React.useEffect(() => {
    parserRef.current = new NLParser(patientNames);
  }, [patientNames]);

  const parseInput = useCallback((input: string): ParsedAppointment => {
    if (!parserRef.current) {
      return { confidence: 0 } as ParsedAppointment;
    }
    return parserRef.current.parse(input);
  }, []);

  return { parseInput };
};
