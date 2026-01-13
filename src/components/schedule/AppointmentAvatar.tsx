```javascript
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/media/image';

interface AppointmentAvatarProps {
  patientName: string;
  imageUrl?: string | null;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Gera cor consistente baseada no nome
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-gradient-to-br from-blue-400 to-blue-600',
    'bg-gradient-to-br from-purple-400 to-purple-600',
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-green-400 to-green-600',
    'bg-gradient-to-br from-yellow-400 to-yellow-600',
    'bg-gradient-to-br from-red-400 to-red-600',
    'bg-gradient-to-br from-indigo-400 to-indigo-600',
    'bg-gradient-to-br from-cyan-400 to-cyan-600',
    'bg-gradient-to-br from-teal-400 to-teal-600',
    'bg-gradient-to-br from-orange-400 to-orange-600',
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Pega as iniciais do nome
const getInitials = (name: string): string => {
  const words = name.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export const AppointmentAvatar: React.FC<AppointmentAvatarProps> = ({
  patientName,
  imageUrl,
  status,
  size = 'md',
  className
}) => {
  const initials = getInitials(patientName);
  const colorClass = getColorFromName(patientName);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], 'shadow-md ring-2 ring-background', className)}>
        {imageUrl ? (
          <AvatarImage src={imageUrl} alt={patientName} />
        ) : null}
        <AvatarFallback className={cn(colorClass, 'text-white font-bold')}>
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Status indicator dot */}
      {status && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background shadow-sm animate-pulse"
          style={{
            backgroundColor:
              status === 'confirmado' ? '#10b981' :
                status === 'agendado' ? '#3b82f6' :
                  status === 'em_andamento' ? '#06b6d4' :
                    status === 'concluido' ? '#a855f7' :
                      status === 'atrasado' ? '#eab308' :
                        '#94a3b8'
          }}
        />
      )}
    </div>
  );
};
