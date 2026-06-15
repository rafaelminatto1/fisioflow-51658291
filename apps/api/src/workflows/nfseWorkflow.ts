import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";
import { envioRPS, cancelamentoNFe } from "../lib/nfseSPClient";
import { sendNfseToAccounting } from "../lib/email";

export type NFSeWorkflowParams = {
  nfseId: string;
  organizationId: string;
};

export class NFSeWorkflow extends WorkflowEntrypoint<Env, NFSeWorkflowParams> {
  async run(event: WorkflowEvent<NFSeWorkflowParams>, step: WorkflowStep) {
    const { nfseId, organizationId } = event.payload;
    const pool = createPool(this.env);

    const nfseData = await step.do("fetch-data", async () => {
      const res = await pool.query(
        `SELECT n.*, cfg.cnpj_prestador AS cnpj, cfg.inscricao_municipal, cfg.municipio_codigo AS codigo_municipio,
                cfg.optante_simples, cfg.tp_opcao_simples, cfg.incentivo_fiscal,
                cfg.aliquota_iss AS aliquota_padrao, cfg.codigo_servico_padrao, cfg.cnae,
                cfg.razao_social, cfg.ambiente, cfg.contabilidade_email, cfg.contabilidade_automacao_ativa
         FROM nfse_records n
         JOIN nfse_config cfg ON cfg.organization_id = n.organization_id
         WHERE n.id = $1 AND n.organization_id = $2 LIMIT 1`,
        [nfseId, organizationId],
      );
      if (!res.rows.length) throw new Error("NFS-e not found");
      return res.rows[0];
    });

    await step.do("update-status-waiting", async () => {
      await pool.query(
        `UPDATE nfse_records SET status = 'aguardando_prefeitura', updated_at = NOW() WHERE id = $1`,
        [nfseId],
      );
    });

    const result = await step.do(
      "emit-nfse",
      {
        retries: { limit: 5, delay: "1 minute", backoff: "exponential" },
      },
      async () => {
        await pool.query(
          `UPDATE nfse_records SET tentativas_envio = tentativas_envio + 1 WHERE id = $1`,
          [nfseId],
        );

        const rpsParams = {
          numero: nfseData.numero_rps,
          serie: nfseData.serie_rps || "RPS",
          tipo: "RPS",
          dataEmissao: new Date(nfseData.data_emissao).toISOString(),
          cnpjPrestador: nfseData.cnpj?.replace(/\D/g, "") || "",
          inscricaoMunicipal: nfseData.inscricao_municipal?.replace(/\D/g, "") || "",
          tributacaoRps: "T",
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
            return { fatal: true, ...emissionResult };
          }
          return { fatal: false, ...emissionResult };
        } catch (err: any) {
          console.error(`[Workflow] Attempt failed for NFSe ${nfseId}: ${err.message}`);
          throw err;
        }
      },
      {
        rollback: async ({ output }) => {
          if (output?.numeroNfse) {
            try {
              console.log(`[Workflow] Rollback: canceling NFSe ${output.numeroNfse}`);
              await cancelamentoNFe(this.env, {
                cnpjRemetente: nfseData.cnpj?.replace(/\D/g, "") || "",
                inscricaoMunicipal: nfseData.inscricao_municipal?.replace(/\D/g, "") || "",
                numeroNfse: output.numeroNfse,
                layout: nfseData.ambiente === "V2" ? "V2" : "V1",
              });
              console.log(`[Workflow] Rollback: successfully canceled NFSe ${output.numeroNfse}`);
              this.env.ANALYTICS?.writeDataPoint({
                blobs: ["workflow_rollback", "nfse_canceled", nfseId],
                doubles: [1],
                indexes: [organizationId],
              });
            } catch (rollbackErr) {
              console.error(
                `[Workflow] Rollback failed for NFSe ${output.numeroNfse}:`,
                rollbackErr,
              );
              this.env.ANALYTICS?.writeDataPoint({
                blobs: ["rollback_failed", "nfse_cancel", nfseId],
                doubles: [1],
                indexes: [organizationId],
              });
            }
          }
        },
        rollbackConfig: {
          retries: { limit: 3, delay: "30 seconds", backoff: "linear" },
          timeout: "2 minutes",
        },
      },
    );

    if (result.success && result.numeroNfse) {
      await step.do("finalize-success", async () => {
        await pool.query(
          `UPDATE nfse_records 
           SET status = 'autorizado', numero_nfse = $1, codigo_verificacao = $2, 
               link_nfse = $3, updated_at = NOW(), ultimo_erro = NULL
           WHERE id = $4`,
          [result.numeroNfse, result.codigoVerificacao, result.linkNfse, nfseId],
        );

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
              [nfseId],
            );
          } catch (e) {
            console.error("[Workflow] Failed to send accounting email", e);
          }
        }
      });
    } else {
      await step.do("finalize-failure", async () => {
        const errorMsg =
          result.erros?.[0]?.descricao || "Falha definitiva após múltiplas tentativas";
        await pool.query(
          `UPDATE nfse_records SET status = 'falhou', ultimo_erro = $1, updated_at = NOW() WHERE id = $2`,
          [errorMsg, nfseId],
        );
      });
    }
  }
}
