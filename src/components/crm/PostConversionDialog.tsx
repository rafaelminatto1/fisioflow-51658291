/**
 * PostConversionDialog — abre logo após o lead ser movido para `efetivado`.
 * Sugere um pacote (match heurístico por `interesse`), permite ajustar valor
 * e marcar para emitir NFS-e em seguida.
 */
import { useEffect, useMemo, useState } from "react";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Package, Sparkles } from "lucide-react";
import { useSessionPackages } from "@/hooks/usePackages";
import { useLeadConversion } from "@/hooks/useLeadConversion";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Lead } from "@/hooks/useLeads";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
}

function matchPackage(
  packages: Array<{ id: string; name: string; price: number }>,
  interesse: string | null | undefined,
): string | undefined {
  if (!interesse || !packages.length) return packages[0]?.id;
  const needle = interesse.toLowerCase();
  const hit = packages.find((p) => p.name.toLowerCase().includes(needle));
  return (hit ?? packages[0]).id;
}

export function PostConversionDialog({ open, onClose, lead }: Props) {
  const isMobile = useIsMobile();
  const { data: packages = [], isLoading: loadingPackages } = useSessionPackages();
  const conversion = useLeadConversion();

  const [packageId, setPackageId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [issueNfse, setIssueNfse] = useState(false);

  const selected = useMemo(
    () => packages.find((p) => p.id === packageId),
    [packages, packageId],
  );

  // Sugestão inicial quando abre
  useEffect(() => {
    if (!open || !lead || !packages.length) return;
    const suggested = matchPackage(
      packages as Array<{ id: string; name: string; price: number }>,
      lead.interesse,
    );
    if (suggested) {
      setPackageId(suggested);
      const pkg = packages.find((p) => p.id === suggested);
      if (pkg) setPrice(String(pkg.price));
    }
  }, [open, lead, packages]);

  if (!lead) return null;

  const contactId = (lead as Lead & { contact_id?: string }).contact_id;

  const handleConfirm = async () => {
    if (!contactId) return;
    await conversion.mutateAsync({
      contactId,
      packageId: packageId || undefined,
      packagePrice: price ? Number(price) : undefined,
      paymentMethod,
      issueNfse,
      nfseAmount: price ? Number(price) : undefined,
    });
    onClose();
  };

  const handleSkip = () => onClose();

  const canConfirm = !!contactId && !conversion.isPending;

  return (
    <CustomModal open={open} onOpenChange={(v) => !v && onClose()} isMobile={isMobile}>
      <CustomModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <CustomModalTitle>Lead efetivado — finalizar conversão</CustomModalTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {lead.nome} agora é paciente. Vincule um pacote e, se quiser, emita a NFS-e.
        </p>
      </CustomModalHeader>

      <CustomModalBody className="space-y-4">
        {!contactId && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Lead sem contact_id. Atualize o cadastro antes de converter.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pkg">Pacote sugerido</Label>
          {loadingPackages ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando catálogo…
            </div>
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum pacote cadastrado. Pule esta etapa.
            </p>
          ) : (
            <Select
              value={packageId}
              onValueChange={(v) => {
                setPackageId(v);
                const pkg = packages.find((p) => p.id === v);
                if (pkg) setPrice(String(pkg.price));
              }}
            >
              <SelectTrigger id="pkg">
                <SelectValue placeholder="Selecione um pacote" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {p.name} — R$ {Number(p.price).toFixed(2)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selected && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="price">Valor cobrado (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pm">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="pm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credito">Cartão crédito</SelectItem>
                  <SelectItem value="debito">Cartão débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border bg-slate-50 p-3">
          <Checkbox
            id="nfse"
            checked={issueNfse}
            onCheckedChange={(v) => setIssueNfse(!!v)}
          />
          <div className="space-y-0.5">
            <Label htmlFor="nfse" className="cursor-pointer font-medium">
              Emitir NFS-e em seguida
            </Label>
            <p className="text-xs text-muted-foreground">
              Gera e envia automaticamente à prefeitura usando a configuração da clínica.
            </p>
          </div>
        </div>
      </CustomModalBody>

      <CustomModalFooter>
        <Button variant="ghost" onClick={handleSkip} disabled={conversion.isPending}>
          Pular
        </Button>
        <Button onClick={handleConfirm} disabled={!canConfirm}>
          {conversion.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando…
            </>
          ) : (
            "Concluir conversão"
          )}
        </Button>
      </CustomModalFooter>
    </CustomModal>
  );
}
