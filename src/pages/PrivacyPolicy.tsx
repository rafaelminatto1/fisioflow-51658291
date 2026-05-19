import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Politica de Privacidade — exige aprovacao juridica antes de publicacao oficial.
 * Texto base referencia o parecer DPO 2026-05-19 (S6.2).
 */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Política de Privacidade
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Versão 1.0 · vigente desde 19 de maio de 2026
          </p>
        </header>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4">
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm">
            <section>
              <h2 className="text-xl font-bold">1. Quem somos</h2>
              <p>
                FisioFlow é uma plataforma de gestão clínica operada por Mooca Fisio Ltda.,
                inscrita no CNPJ sob nº [a completar]. Atuamos como{" "}
                <strong>controlador de dados pessoais</strong> nos termos do art. 5º, VI da Lei
                Geral de Proteção de Dados — LGPD (Lei 13.709/2018).
              </p>
              <p>
                <strong>Encarregado de Proteção de Dados (DPO)</strong>: Rafael Minatto
                <br />
                <strong>Canal de contato LGPD</strong>: dpo@moocafisio.com.br
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">2. Quais dados tratamos</h2>
              <ul>
                <li>
                  <strong>Dados cadastrais</strong>: nome, e-mail, telefone, CPF, endereço — usados
                  para identificação e contato.
                </li>
                <li>
                  <strong>Dados clínicos (sensíveis)</strong>: prontuário, evoluções de
                  atendimento, escalas funcionais (EVA, DASH, Oswestry etc.), exames, fotos
                  clínicas, áudio de transcrição assistida — usados exclusivamente para tutela da
                  sua saúde.
                </li>
                <li>
                  <strong>Dados financeiros</strong>: histórico de pagamentos e notas fiscais.
                </li>
                <li>
                  <strong>Dados de uso da plataforma</strong>: logs técnicos, IP, navegador — para
                  segurança e auditoria.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">3. Base legal para tratamento</h2>
              <ul>
                <li>
                  <strong>Tutela da saúde (art. 11, II, “f” da LGPD)</strong>: para prontuário,
                  evolução clínica, exames e comunicações sobre seu tratamento.
                </li>
                <li>
                  <strong>Cumprimento de obrigação legal (art. 11, II, “a” e art. 16, II)</strong>:
                  retenção de prontuário pelo prazo legal estabelecido pela Lei 13.787/2018 e
                  Resolução COFFITO 415/2012.
                </li>
                <li>
                  <strong>Consentimento (art. 7º, I e art. 11, I)</strong>: comunicações de
                  marketing, lembretes promocionais, pesquisas de satisfação.
                </li>
                <li>
                  <strong>Legítimo interesse (art. 7º, IX)</strong>: logs de acesso, prevenção a
                  fraude, melhoria operacional sem identificação direta.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">4. Prazo de retenção</h2>
              <p>
                <strong>
                  Seus dados clínicos (prontuário, evoluções, exames) são mantidos por no mínimo 20
                  anos contados do último atendimento
                </strong>
                , conforme exigido pela Lei 13.787/2018 art. 6º e Resolução COFFITO 415/2012 art.
                6º. Esta guarda é uma obrigação legal e independe de seu consentimento.
              </p>
              <ul>
                <li>
                  <strong>Prontuário e evoluções</strong>: 20 anos do último atendimento (mínimo).
                </li>
                <li>
                  <strong>Dados cadastrais ativos</strong>: enquanto durar a relação clínica + 5
                  anos.
                </li>
                <li>
                  <strong>Logs de acesso a prontuário</strong>: 2 anos.
                </li>
                <li>
                  <strong>Dados de marketing</strong>: até a revogação do consentimento.
                </li>
              </ul>
              <p>
                Após o prazo de guarda obrigatória, os dados podem ser eliminados a seu pedido ou
                descartados pela clínica. Dados podem ser arquivados em armazenamento de longo
                prazo (Cloudflare R2), mantendo nível de segurança equivalente (criptografia
                AES-256 em repouso, TLS 1.3 em trânsito, controle de acesso por organização).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">5. Seus direitos (art. 18 LGPD)</h2>
              <ul>
                <li>Confirmação de tratamento dos seus dados</li>
                <li>Acesso e cópia integral do prontuário e demais dados</li>
                <li>Correção de dados incompletos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Revogação de consentimento (para tratamentos baseados em consentimento)</li>
                <li>Informação sobre uso compartilhado</li>
              </ul>
              <p className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-amber-900 dark:text-amber-100">
                <strong>Importante:</strong> o direito de eliminação{" "}
                <strong>não se aplica</strong> aos dados clínicos durante o prazo legal de guarda
                obrigatória (20 anos). Pedidos de eliminação total serão respondidos com
                manutenção do prontuário sob base legal do art. 16, II da LGPD, mas dados
                cadastrais e de marketing podem ser excluídos a qualquer momento.
              </p>
              <p>
                Para exercer qualquer direito, envie e-mail para{" "}
                <a href="mailto:dpo@moocafisio.com.br" className="text-blue-600 underline">
                  dpo@moocafisio.com.br
                </a>{" "}
                ou abra solicitação no portal do paciente. Responderemos em até 15 dias úteis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">6. Compartilhamento de dados</h2>
              <p>Não vendemos seus dados. Compartilhamos apenas com:</p>
              <ul>
                <li>
                  <strong>Profissionais de saúde</strong> envolvidos diretamente no seu
                  atendimento.
                </li>
                <li>
                  <strong>Operadores tecnológicos</strong> contratados sob DPA (Data Processing
                  Agreement) compatível com LGPD: Cloudflare (infraestrutura), Neon (banco de
                  dados), WhatsApp (mensageria sob autorização).
                </li>
                <li>
                  <strong>Autoridades públicas</strong> mediante obrigação legal ou determinação
                  judicial.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">7. Segurança da informação</h2>
              <ul>
                <li>Criptografia em trânsito (TLS 1.3) e em repouso (AES-256)</li>
                <li>Controle de acesso por perfil e autenticação multifator</li>
                <li>Logs de auditoria de acesso a prontuário (retidos por 2 anos)</li>
                <li>Backup com retenção PITR de 7 dias</li>
                <li>Resposta a incidentes conforme Resolução ANPD nº 15/2024</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold">8. Cookies</h2>
              <p>
                Usamos cookies essenciais para autenticação e sessão. Cookies analíticos
                (PostHog) são utilizados sob consentimento explícito.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">9. Alterações nesta política</h2>
              <p>
                Esta política pode ser revisada periodicamente. Mudanças materiais serão
                comunicadas por e-mail e exibidas no portal antes de entrar em vigor.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold">10. Contato</h2>
              <p>
                <strong>Encarregado (DPO)</strong>: Rafael Minatto —{" "}
                <a href="mailto:dpo@moocafisio.com.br" className="text-blue-600 underline">
                  dpo@moocafisio.com.br
                </a>
                <br />
                <strong>ANPD</strong>:{" "}
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  gov.br/anpd
                </a>
              </p>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
