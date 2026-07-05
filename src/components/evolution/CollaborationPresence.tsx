/**
 * CollaborationPresence - Indicador de presença em tempo real
 *
 * Lê o `awareness` do provider Yjs (y-partyserver) e exibe avatares/nomes
 * dos usuários conectados na mesma sessão de evolução. Superfície sólida,
 * sem glassmorphism/backdrop-blur (regra do projeto).
 */
import React, { useEffect, useState } from "react";
import type YProvider from "y-partyserver/provider";
import { cn } from "@/lib/utils";

interface Collaborator {
  clientId: number;
  name: string;
  color: string;
}

interface CollaborationPresenceProps {
  provider: YProvider | null;
  className?: string;
}

export const CollaborationPresence: React.FC<CollaborationPresenceProps> = ({
  provider,
  className,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    if (!provider) {
      setCollaborators([]);
      return;
    }

    const readStates = () => {
      const states = provider.awareness.getStates();
      const list: Collaborator[] = [];
      states.forEach((state, clientId) => {
        const user = (state as { user?: { name?: string; color?: string } })?.user;
        if (!user?.name) return;
        list.push({ clientId, name: user.name, color: user.color || "#10b981" });
      });
      setCollaborators(list);
    };

    readStates();
    provider.awareness.on("change", readStates);
    return () => {
      provider.awareness.off("change", readStates);
    };
  }, [provider]);

  if (collaborators.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5",
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[11px] font-semibold text-emerald-800">
        {collaborators.length === 1
          ? "1 pessoa editando agora"
          : `${collaborators.length} pessoas editando agora`}
      </span>
      <div className="flex -space-x-2">
        {collaborators.slice(0, 5).map((collaborator) => (
          <div
            key={collaborator.clientId}
            title={collaborator.name}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.name.slice(0, 1).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
};
