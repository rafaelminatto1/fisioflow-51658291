import { Container } from "@cloudflare/containers";
import type { Env } from "../types/env";

/**
 * Container que reextrai pose do vídeo guardado no R2.
 *
 * Existe por dois motivos concretos:
 *
 * 1. Sem ele, todo Android sem o plugin MLKit linkado e toda sessão em Expo Go
 *    é um beco sem saída — o vídeo sobe e nunca vira análise.
 * 2. A extração no aparelho sofre com throttling térmico e frames descartados.
 *    Aqui o vídeo é lido em resolução plena, sem pressa, então o resultado é a
 *    estimativa de maior qualidade e vira a fonte de verdade para laudos novos.
 *
 * Uma instância por job (`getContainer(env.BIOMECHANICS_POSE, jobId)`): o
 * próprio identificador serve de deduplicação, então dois pedidos para o mesmo
 * job não geram duas extrações.
 *
 * `standard-4` (4 vCPU / 12 GiB) porque a conta é decode de 1080p mais uma
 * passada de MediaPipe por quadro. Em 4 vCPU um clipe de 10 s sai em segundos e
 * um de 30 s em cerca de um minuto. Metade disso dobraria a espera para
 * economizar pouco — trade ruim numa ferramenta cujo valor inteiro é o número
 * do laudo ser real.
 */
export class BiomechanicsPoseContainer extends Container<Env> {
  defaultPort = 8080;

  /**
   * Extração longa não pode ser interrompida por ociosidade de requisição: o
   * trabalho roda em segundo plano e responde por callback, então o container
   * fica sem tráfego justamente enquanto trabalha.
   */
  sleepAfter = "15m";

  override onStart() {
    console.log("[BiomechanicsPose] container iniciado");
  }

  override onStop() {
    console.log("[BiomechanicsPose] container encerrado");
  }

  override onError(error: unknown) {
    console.error("[BiomechanicsPose] erro no container:", error);
  }
}
