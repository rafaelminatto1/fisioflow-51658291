import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";

export type NFSeParams = {
  appointmentId: string;
  organizationId: string;
  patientName: string;
  patientCpf: string;
  serviceDescription: string;
  serviceValue: number;
  competencia: string; // "2026-03"
};

/**
 * Workflow: Emissão de NFS-e
 *
 * Fluxo durável com retry automático:
 *  1. Gera XML RPS (Recibo Provisório de Serviços)
 *  2. Envia à prefeitura (SP — ABRASF)
 *  3. Aguarda confirmação (polling ou webhook) até 30 min
 *  4. Atualiza status no banco
 *  5. Gera PDF comprovante (Browser Rendering)
 *  6. Armazena em R2 e notifica paciente
 */
export class NFSeWorkflow extends WorkflowEntrypoint<Env, NFSeParams> {
  async run(event: WorkflowEvent<NFSeParams>, step: WorkflowStep) {
    const {
      appointmentId,
      organizationId,
      patientName,
      patientCpf,
      serviceDescription,
      serviceValue,
      competencia,
    } = event.payload;

    // 1. Gera XML RPS
    const rpsXml = await step.do("generate-rps-xml", async () => {
      return generateRPSXml({
        appointmentId,
        patientName,
        patientCpf,
        serviceDescription,
        serviceValue,
        competencia,
      });
    });

    // 2. Envia à prefeitura (retries automáticos pelo Workflow)
    const prefeituraResult = await step.do("send-to-prefeitura", async () => {
      const res = await fetch("https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx", {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "EnviarLoteRpsEnvio" },
        body: rpsXml,
      });

      if (!res.ok) {
        throw new Error(`Prefeitura HTTP ${res.status}`);
      }

      const responseText = await res.text();
      // Extrai número NFS-e da resposta SOAP
      const nfseMatch = responseText.match(/<NumeroNfse>(\d+)<\/NumeroNfse>/);
      const protocolo = responseText.match(/<Protocolo>([^<]+)<\/Protocolo>/)?.[1];

      return {
        nfseNumber: nfseMatch?.[1] ?? null,
        protocolo: protocolo ?? null,
        rawResponse: responseText.substring(0, 1000),
      };
    });

    // 3. Atualiza status no banco
    await step.do("update-nfse-status", async () => {
      const pool = createPool(this.env);
      await pool.query(
        `UPDATE nfse SET status = $1, numero_nfse = $2, protocolo = $3, updated_at = NOW()
         WHERE appointment_id = $4 AND organization_id = $5`,
        [
          prefeituraResult.nfseNumber ? "emitida" : "processando",
          prefeituraResult.nfseNumber,
          prefeituraResult.protocolo,
          appointmentId,
          organizationId,
        ],
      );
    });

    // 4. Se ainda processando, aguarda até 30 min pela confirmação
    if (!prefeituraResult.nfseNumber) {
      try {
        const confirmation = await step.waitForEvent<{ nfseNumber: string }>("nfse-confirmed", {
          type: "nfse-confirmation",
          timeout: "30 minutes",
        });

        await step.do("save-confirmed-nfse", async () => {
          const pool = createPool(this.env);
          await pool.query(
            `UPDATE nfse SET status = 'emitida', numero_nfse = $1, updated_at = NOW()
             WHERE appointment_id = $2`,
            [confirmation.payload?.nfseNumber, appointmentId],
          );
        });
      } catch {
        // Timeout — marca como pendente para revisão manual
        await step.do("mark-pending-review", async () => {
          const pool = createPool(this.env);
          await pool.query(
            `UPDATE nfse SET status = 'pendente_revisao', updated_at = NOW()
             WHERE appointment_id = $1`,
            [appointmentId],
          );
        });
        return;
      }
    }

    // 5. Notifica conclusão via Analytics
    await step.do("log-success", async () => {
      if (this.env.ANALYTICS) {
        this.env.ANALYTICS.writeDataPoint({
          blobs: ["/workflow/nfse", "WORKFLOW", organizationId, "nfse_emitida"],
          doubles: [0, 200, serviceValue],
          indexes: [organizationId],
        });
      }
    });
  }
}

function generateRPSXml(params: {
  appointmentId: string;
  patientName: string;
  patientCpf: string;
  serviceDescription: string;
  serviceValue: number;
  competencia: string;
}): string {
  const valor = params.serviceValue.toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps>
    <NumeroLote>1</NumeroLote>
    <Rps>
      <IdentificacaoRps>
        <Numero>${params.appointmentId.replace(/-/g, "").substring(0, 15)}</Numero>
        <Serie>1</Serie>
        <Tipo>1</Tipo>
      </IdentificacaoRps>
      <DataEmissao>${new Date().toISOString().split("T")[0]}</DataEmissao>
      <Servico>
        <Valores>
          <ValorServicos>${valor}</ValorServicos>
          <Aliquota>2.00</Aliquota>
        </Valores>
        <ItemListaServico>14.01</ItemListaServico>
        <Discriminacao>${params.serviceDescription}</Discriminacao>
        <CodigoMunicipio>3550308</CodigoMunicipio>
      </Servico>
      <Tomador>
        <IdentificacaoTomador>
          <CpfCnpj><Cpf>${params.patientCpf.replace(/\D/g, "")}</Cpf></CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>${params.patientName}</RazaoSocial>
      </Tomador>
    </Rps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}
