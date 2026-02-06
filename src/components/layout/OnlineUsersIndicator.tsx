import React, { useState } from 'react';
import { Users, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { cn } from '@/lib/utils';

export const OnlineUsersIndicator: React.FC = () => {
  const { onlineUsers, onlineCount, isConnected } = useOnlineUsers('fisioflow-online');
  const [isOpen, setIsOpen] = useState(false);

  // Mapear roles para labels
  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      fisioterapeuta: 'Fisioterapeuta',
      estagiario: 'Estagiário',
      paciente: 'Paciente',
    };
    return labels[role] || role;
  };

  // Cores por role
  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'text-purple-600 bg-purple-100',
      fisioterapeuta: 'text-blue-600 bg-blue-100',
      estagiario: 'text-green-600 bg-green-100',
      paciente: 'text-gray-600 bg-gray-100',
    };
    return colors[role] || 'text-gray-600 bg-gray-100';
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
            "hover:bg-muted/50 cursor-pointer group",
            isOpen && "bg-muted/50"
          )}
          aria-label={`${onlineCount} usuários online`}
        >
          <div className="relative">
            <Users className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            {onlineCount > 0 && (
              <Circle className="absolute -top-1 -right-1 h-3 w-3 fill-success text-success animate-pulse" />
            )}
          </div>
          
          <Badge 
            variant="secondary" 
            className="font-semibold min-w-[24px] justify-center"
          >
            {onlineCount}
          </Badge>
          
          <span className="text-sm text-muted-foreground hidden md:inline">
            online
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-success/10 rounded-full">
              <Circle className="h-3 w-3 fill-success text-success animate-pulse" />
            </div>
            <h3 className="font-semibold text-sm">
              Usuários Online
            </h3>
            <Badge variant="secondary" className="ml-auto">
              {onlineCount}
            </Badge>
          </div>
        </div>

        {/* Lista de usuários */}
        <div className="max-h-96 overflow-y-auto">
          {onlineUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum usuário online no momento
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {onlineUsers.map((user) => (
                <div
                  key={user.userId}
                  className="px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar/Indicator */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-background">
                        <span className="text-sm font-semibold text-primary">
                          {user.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-success text-success border-2 border-background rounded-full" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.userName}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs mt-1",
                          getRoleColor(user.role)
                        )}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>

                    {/* Tempo online (opcional) */}
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const joinedTime = new Date(user.joinedAt);
                        const now = new Date();
                        const diffMinutes = Math.floor((now.getTime() - joinedTime.getTime()) / 60000);
                        
                        if (diffMinutes < 1) return 'agora';
                        if (diffMinutes < 60) return `${diffMinutes}m`;
                        return `${Math.floor(diffMinutes / 60)}h`;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Atualizado em tempo real via Supabase Realtime
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
