import { AppointmentType, AppointmentStatus } from '@/types/appointment';

export const APPOINTMENT_TYPES: AppointmentType[] = [
    'Consulta Inicial',
    'Fisioterapia',
    'Reavaliação',
    'Consulta de Retorno',
    'Avaliação Funcional',
    'Terapia Manual',
    'Pilates Clínico',
    'RPG',
    'Dry Needling',
    'Liberação Miofascial'
];

export const APPOINTMENT_STATUSES = [
    'agendado',
    'avaliacao',
    'confirmado',
    'aguardando_confirmacao',
    'em_andamento',
    'em_espera',
    'atrasado',
    'concluido',
    'remarcado',
    'cancelado',
    'falta'
] as const;

export const STATUS_LABELS: Record<string, string> = {
    'agendado': 'Agendado',
    'avaliacao': 'Avaliação',
    'confirmado': 'Confirmado',
    'aguardando_confirmacao': 'Aguardando',
    'em_andamento': 'Em Andamento',
    'em_espera': 'Em Espera',
    'atrasado': 'Atrasado',
    'concluido': 'Concluído',
    'remarcado': 'Remarcado',
    'cancelado': 'Cancelado',
    'falta': 'Falta'
};

export const STATUS_COLORS: Record<string, string> = {
    'agendado': 'bg-blue-500',
    'avaliacao': 'bg-violet-500',
    'confirmado': 'bg-emerald-500',
    'aguardando_confirmacao': 'bg-amber-500',
    'em_andamento': 'bg-cyan-500',
    'em_espera': 'bg-indigo-500',
    'atrasado': 'bg-yellow-500',
    'concluido': 'bg-purple-500',
    'remarcado': 'bg-orange-500',
    'cancelado': 'bg-red-500',
    'falta': 'bg-rose-500'
};

export const PAYMENT_METHODS = [
    { value: 'pix', label: 'PIX', icon: '📱' },
    { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
    { value: 'debito', label: 'Débito', icon: '💳' },
    { value: 'credito', label: 'Crédito', icon: '💳' },
] as const;
