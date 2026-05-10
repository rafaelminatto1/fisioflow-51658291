import React, { useState, useEffect } from "react";
import { MessageSquare, Search, Loader2, User, Plus } from "lucide-react";
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
import { fetchContacts, findOrCreateConversation } from "@/services/whatsapp-api";
import { toast } from "sonner";
import type { Contact } from "@/services/whatsapp-api";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (id: string) => void;
}

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onOpenChange,
  onConversationCreated,
}) => {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchContacts({ search: search || undefined, limit: 50 });
        setContacts(result.data);
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [open, search]);

  const handleStart = async (contact: Contact) => {
    if (!contact.phone) {
      toast.error("Contato sem telefone cadastrado");
      return;
    }
    setCreatingId(contact.id);
    try {
      const conv = await findOrCreateConversation(contact.phone, contact.patientId);
      onConversationCreated(conv.id);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao iniciar conversa");
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Nova conversa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full bg-muted/50"
          />
          <ScrollArea className="h-[320px] rounded-2xl border bg-muted/10 px-2 py-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Buscando contatos...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 text-muted-foreground">
                <User className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm font-medium text-foreground">Nenhum contato encontrado</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    className="w-full flex items-center gap-3 rounded-xl border border-transparent bg-background px-3 py-3 text-left transition-colors hover:bg-muted/60"
                    onClick={() => handleStart(contact)}
                    disabled={creatingId !== null}
                  >
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                    </div>
                    {creatingId === contact.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
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
