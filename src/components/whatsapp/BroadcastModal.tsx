import { useEffect, useState } from "react";
import { Megaphone, Loader2, Send, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { fetchContacts, sendBroadcast, type Contact } from "@/services/whatsapp-api";

interface BroadcastModalProps {
  open: boolean;
  onClose: () => void;
}

export function BroadcastModal({ open, onClose }: BroadcastModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const t = window.setTimeout(async () => {
      setLoadingContacts(true);
      try {
        const res = await fetchContacts({
          search: contactSearch || undefined,
          limit: 50,
        });
        if (active) setContacts(res.data);
      } catch {
        if (active) setContacts([]);
      } finally {
        if (active) setLoadingContacts(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [open, contactSearch]);

  const handleClose = () => {
    setStep(1);
    setSelectedIds(new Set());
    setMessage("");
    setResult(null);
    setContactSearch("");
    onClose();
  };

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!message.trim() || selectedIds.size === 0) return;
    setSending(true);
    try {
      const res = await sendBroadcast([...selectedIds], message.trim());
      setResult(res);
      setStep(3);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Megaphone className="h-5 w-5" />
            Campanha WhatsApp
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-muted" />
              <div className="flex-1 h-1.5 rounded-full bg-muted" />
            </div>
            <p className="text-sm text-muted-foreground">
              Selecione os contatos que receberão a mensagem ({selectedIds.size} selecionados)
            </p>
            <Input
              placeholder="Buscar contato..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="rounded-full bg-muted/50"
            />
            <ScrollArea className="h-[280px] border rounded-xl bg-muted/10 px-2 py-2">
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nenhum contato encontrado
                </div>
              ) : (
                <div className="space-y-1">
                  {contacts.map((c) => {
                    const sel = selectedIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleContact(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${sel ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"}`}
                      >
                        <div
                          className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "bg-primary border-primary" : "border-border"}`}
                        >
                          {sel && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.phone || "Sem telefone"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button onClick={() => setStep(2)} disabled={selectedIds.size === 0}>
                Próximo ({selectedIds.size})
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-muted" />
            </div>
            <p className="text-sm text-muted-foreground">
              Escreva a mensagem para enviar a <strong>{selectedIds.size} contato(s)</strong>
            </p>
            <Textarea
              placeholder="Digite a mensagem da campanha..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              A mensagem será enviada individualmente para cada contato selecionado.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleSend} disabled={!message.trim() || sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar campanha
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-4 py-4 text-center">
            <div className="flex items-center gap-2 justify-center">
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
              <div className="flex-1 h-1.5 rounded-full bg-primary" />
            </div>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Campanha enviada!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {result.sent} enviadas · {result.failed} falhas · {result.total} total
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
