import React, { useState, useMemo } from "react";
import { UserPlus, ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { accentIncludes } from "@/lib/utils/bilingualSearch";

interface TeamMemberPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: "assign" | "transfer";
  members: any[];
  agentsWorkload?: any[];
  onSelect: (userId: string) => void;
}

export const TeamMemberPicker: React.FC<TeamMemberPickerProps> = ({
  open,
  onOpenChange,
  title,
  icon,
  members,
  agentsWorkload = [],
  onSelect,
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return members;
    return members.filter((m) => {
      const name = m.user?.name ?? m.name ?? "";
      const email = m.user?.email ?? m.email ?? "";
      return accentIncludes(name, search) || accentIncludes(email, search);
    });
  }, [members, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon === "assign" ? (
              <UserPlus className="h-5 w-5 text-primary" />
            ) : (
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Buscar membro da equipe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full bg-muted/50"
          />
          <ScrollArea className="h-[250px]">
            {filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                Nenhum membro encontrado
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((member) => {
                  const userId = member.userId ?? member.user_id ?? member.id;
                  const name = member.user?.name ?? member.name ?? "Membro";
                  const wl = agentsWorkload.find((w) => w.agentId === userId);
                  
                  return (
                    <button
                      key={member.id}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors text-left"
                      onClick={() => onSelect(userId)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.role || "Equipe"}
                        </p>
                      </div>
                      {wl && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          wl.openConversations > 5 ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                        }`}>
                          {wl.openConversations} ativas
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
