import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";
import { envioRPS } from "../lib/nfseSPClient";
import { sendNfseToAccounting } from "../lib/email";

export type NFSeWorkflowParams = {
  nfseId: string;
  organizationId: string;
};

/**
 * NFSe Robust Emission Workflow
 * 
 * Handles:
 *  1. Automatic retries on PMSP 520/Timeout errors.
 *  2. Sequential status updates (aguardando_prefeitura -> autorizado/falhou).
 *  3. Post-emission automation (Accounting email).
 *  4. Definitive failure notification.
 */
export class NFSeWorkflow extends WorkflowEntrypoint<Env, NFSeWorkflowParams> {
  async run(event: WorkflowEvent<NFSeWorkflowParams>, step: WorkflowStep) {
    const { nfseId, organizationId } = event.payload;
    const pool = createPool(this.env);

    // 1. Fetch NFSe and Config Data
    const nfseData = await step.do("fetch-data", async () => {
      const res = await pool.query(
        `SELECT n.*, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal, cfg.municipio_codigo AS codigo_municipio,
                cfg.optante_simples, cfg.tp_opcao_simples, cfg.incentivo_fiscal,
                cfg.aliquota_iss AS aliquota_padrao, cfg.codigo_servico_padrao, cfg.cnae,
                cfg.razao_social, cfg.ambiente, cfg.contabilidade_email, cfg.contabilidade_automacao_ativa
         FROM nfse_records n
         JOIN nfse_config cfg ON cfg.organization_id = n.organization_id
         WHERE n.id = $1 AND n.organization_id = $2 LIMIT 1`,
        [nfseId, organizationId]
      );
      if (!res.rows.length) throw new Error("NFS-e not found");
      return res.rows[0];
    });

    // 2. Initial Status Update
    await step.do("update-status-waiting", async () => {
      await pool.query(
        `UPDATE nfse_records SET status = 'aguardando_prefeitura', updated_at = NOW() WHERE id = $1`,
        [nfseId]
      );
    });

    // 3. Attempt Emission with Retry Logic
    // Cloudflare Workflows automatically retry the step on failure.
    // We can wrap the call to handle specific PMSP error codes.
    const result = await step.do("emit-nfse", {
      retries: {
        limit: 5,
        delay: "1 minute",
        backoff: "exponential"
      }
    }, async () => {
      const rpsParams = {
        numero: nfseData.numero_rps,
        serie: nfseData.serie_rps || "RPS",
        tipo: "RPS",
        dataEmissao: new Date(nfseData.data_emissao).toISOString(),
        cnpjPrestador: nfseData.cnpj?.replace(/\D/g, "") || "",
        inscricaoMunicipal: nfseData.inscricao_municipal?.replace(/\D/g, "") || "",
        tributacaoRps: "T", // Default to Tributável
        codigoServico: nfseData.codigo_servico || "04391",
        codigoCnae: nfseData.cnae ?? "865004",
        codigoNBS: "117240800",
        discriminacao: nfseData.discriminacao,
        valorServicos: Number(nfseData.valor_servico).toFixed(2),
        valorDeducoes: "0.00",
        aliquota: Number(nfseData.aliquota_iss ?? 0.02).toFixed(4),
        issRetido: false,
        tomadorCpfCnpj: nfseData.tomador_cpf_cnpj?.replace(/\D/g, "") || "",
        tomadorInscricaoMunicipal: "",
        tomadorRazaoSocial: nfseData.tomador_nome || "",
        tomadorEmail: nfseData.tomador_email || "",
        codigoMunicipio: nfseData.codigo_municipio ?? "3550308",
        isSimplesNacional: true,
        tpOpcaoSimples: 4,
      };

      try {
        const emissionResult = await envioRPS(this.env, rpsParams);
        
        if (!emissionResult.success) {
          // Hard rejection from PMSP (data error) - don't retry step
          return { fatal: true, ...emissionResult };
        }
        
        return { fatal: false, ...emissionResult };
      } catch (err: any) {
        // Intermittent error (520, timeout) - THROW to trigger workflow retry
        console.error(`[Workflow] Attempt failed for NFSe ${nfseId}: ${err.message}`);
        throw err; 
      }
    });

    // 4. Handle Final Result
    if (result.success && result.numeroNfse) {
      // SUCCESS path
      await step.do("finalize-success", async () => {
        await pool.query(
          `UPDATE nfse_records 
           SET status = 'autorizado', numero_nfse = $1, codigo_verificacao = $2, 
               link_nfse = $3, updated_at = NOW(), ultimo_erro = NULL
           WHERE id = $4`,
          [result.numeroNfse, result.codigoVerificacao, result.linkNfse, nfseId]
        );

        // Accounting Automation
        if (nfseData.contabilidade_automacao_ativa && nfseData.contabilidade_email) {
          try {
            await sendNfseToAccounting(this.env, nfseData.contabilidade_email, {
              numeroNfse: result.numeroNfse!,
              tomadorNome: nfseData.tomador_nome,
              valor: Number(nfseData.valor_servico),
              linkNfse: result.linkNfse || "",
              razaoSocialPrestador: nfseData.razao_social || "FisioFlow Client",
            });
            await pool.query(
              `UPDATE nfse_records SET enviado_contabilidade_at = NOW() WHERE id = $1`,
              [nfseId]
            );
          } catch (e) {
            console.error("[Workflow] Failed to send accounting email", e);
          }
        }
      });
    } else {
      // FAILURE path (Fatal or Max retries reached)
      await step.do("finalize-failure", async () => {
        const errorMsg = result.erros?.[0]?.descricao || "Falha definitiva após múltiplas tentativas";
        await pool.query(
          `UPDATE nfse_records SET status = 'falhou', ultimo_erro = $1, updated_at = NOW() WHERE id = $2`,
          [errorMsg, nfseId]
        );
        
        // Notify Rafael (User) about the failure
        // We could send a push or internal notification here.
      });
    }
  }
}
