/**
 * useLeadConversion — orquestra a transição lead → paciente → pacote (→ NFS-e).
 *
 * Fluxo:
 *   1. Backend já cria patient automaticamente via trigger PG quando o lead
 *      vira `efetivado` (migration 0085). Aqui localizamos o paciente recém
 *      criado a partir do contact_id do lead.
 *   2. Opcional: vende pacote (usePurchasePackage existente).
 *   3. Opcional: emite NFS-e (nfseApi.generate + .send).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactsApi } from "@/api/v2/contacts";
import { nfseApi } from "@/api/v2/billing";
import { financialApi } from "@/api/v2";

export interface ConvertLeadInput {
  /** Contact id (preferencial) ou lead id — buscamos o paciente via contact 360°. */
  contactId: string;
  packageId?: string;
  packagePrice?: number;
  paymentMethod?: string;
  validityDays?: number;
  issueNfse?: boolean;
  nfseAmount?: number;
}

export interface ConvertLeadResult {
  patientId: string;
  patientPackageId?: string;
  nfseId?: string;
}

export function useLeadConversion() {
  const qc = useQueryClient();

  return useMutation<ConvertLeadResult, Error, ConvertLeadInput>({
    mutationFn: async (input) => {
      // 1. Carrega 360° do contato e descobre/cria paciente
      let contactRes = await contactsApi.get(input.contactId);
      let patientId = contactRes.data.contact.primary_patient_id as string | null;

      if (!patientId) {
        // Trigger ainda não rodou (ou lead não foi efetivado no PUT). Força.
        const convertRes = await contactsApi.convert(input.contactId);
        patientId = convertRes.data.patient_id;
      }
      if (!patientId) throw new Error("Não foi possível criar/encontrar o paciente.");

      // 2. Vende pacote
      let patientPackageId: string | undefined;
      if (input.packageId && input.packagePrice != null) {
        const sold = await financialApi.patientPackages.create({
          patient_id: patientId,
          package_id: input.packageId,
          custom_price: input.packagePrice,
          payment_method: input.paymentMethod,
          validity_days: input.validityDays,
        });
        patientPackageId = (sold.data as { id?: string })?.id;
      }

      // 3. NFS-e
      let nfseId: string | undefined;
      if (input.issueNfse) {
        const amount = input.nfseAmount ?? input.packagePrice;
        if (amount == null) throw new Error("Valor obrigatório para emitir NFS-e.");
        const gen = await nfseApi.generate({
          patient_id: patientId,
          amount,
          patient_package_id: patientPackageId,
        });
        nfseId = (gen.data as { id?: string })?.id;
        if (nfseId) {
          try {
            await nfseApi.send(nfseId);
          } catch (err) {
            console.warn("[useLeadConversion] NFS-e enviada falhou:", err);
            toast.warning("Pacote gerado, mas envio da NFS-e falhou. Tente reenviar.");
          }
        }
      }

      return { patientId, patientPackageId, nfseId };
    },
    onSuccess: (result, input) => {
      qc.invalidateQueries({ queryKey: ["contacts", input.contactId] });
      qc.invalidateQueries({ queryKey: ["patient-packages", result.patientId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-metrics"] });
      toast.success("Conversão concluída.");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao converter lead.");
    },
  });
}
