# Especificação Técnica: Colaboração Real-time com CRDTs (Fase 4)

## Introdução
Esta fase implementa a colaboração em tempo real (estilo Google Docs/Notion) no editor de evolução clínica, eliminando conflitos de edição e permitindo que múltiplos profissionais (ou o mesmo profissional em múltiplos dispositivos) editem a mesma ficha simultaneamente.

## Arquitetura e Tecnologias

1.  **Yjs (CRDT):** Biblioteca de tipos de dados replicados sem conflitos. Gerencia o estado do documento de forma que alterações concorrentes sejam fundidas automaticamente.
2.  **Tiptap Collaboration:** Extensão oficial do Tiptap que integra o editor ao ecossistema Yjs.
3.  **Cloudflare Durable Objects (DO):** Servidor de estado persistente e "Single Source of Truth" para cada sessão de evolução.
4.  **WebSockets:** Protocolo de comunicação bidirecional entre o cliente e o Durable Object.
5.  **y-websocket:** Provider que sincroniza o documento Yjs via WebSockets.

## Componentes do Sistema

### 1. Backend: `EvolutionCollaboration` (Durable Object)
*   **Identidade:** Cada DO será identificado pelo `soap_record_id`.
*   **Responsabilidades:**
    *   Manter a conexão WebSocket com todos os clientes ativos na evolução.
    *   Sincronizar os `update` do Yjs entre os clientes.
    *   Manter o estado "Awareness" (quem está online, posição do cursor).
    *   Persistência: Periodicamente (ou ao fechar todos os sockets) salvar o snapshot consolidado no Neon PostgreSQL (banco principal).

### 2. API Entry Point: `apps/api/src/routes/sessions.ts`
*   Nova rota: `GET /api/sessions/:id/collaboration`
*   Verifica autenticação e permissão de acesso ao paciente.
*   Encaminha a requisição (Upgrade para WebSocket) para o Durable Object correspondente.

### 3. Frontend: `RichTextEditor.tsx` & `CollaborationProvider`
*   **Yjs Document:** Inicializar um `new Y.Doc()` para a evolução.
*   **WebSocket Provider:** Conectar ao endpoint da API usando `y-websocket`.
*   **Tiptap Extensions:**
    *   `Collaboration`: Vincula o `Y.XmlFragment` do Yjs ao editor.
    *   `CollaborationCursor`: Exibe os cursores e nomes dos outros usuários.

## Fluxo de Dados

1.  O usuário abre a página de evolução.
2.  O frontend solicita conexão WebSocket para a sala daquela evolução.
3.  O Durable Object carrega o conteúdo atual do banco (se for a primeira conexão).
4.  O Yjs sincroniza o estado inicial.
5.  A cada tecla digitada:
    *   Yjs gera um diff pequeno.
    *   O provider envia via WebSocket para o DO.
    *   O DO replica para os outros clientes conectados.
6.  O DO salva o estado final no Neon após inatividade ou encerramento da sessão.

## Plano de Implementação

### Passo 1: Infraestrutura (Backend)
- [ ] Adicionar `EVOLUTION_COLLABORATION` como um novo binding de Durable Object no `wrangler.toml`.
- [ ] Criar a classe `EvolutionCollaboration` em `apps/api/src/agents/EvolutionCollaboration.ts`.
- [ ] Implementar o roteamento de WebSocket em `apps/api/src/routes/sessions.ts`.

### Passo 2: Editor (Frontend)
- [ ] Instalar dependências: `yjs`, `y-websocket`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor`.
- [ ] Atualizar o `RichTextEditor.FC` para aceitar um `collaborationId` (opcional).
- [ ] Implementar a lógica de conexão Yjs dentro do editor ou via Context.

### Passo 3: Persistência e Transição
- [ ] Garantir que o autosave tradicional (HTTP POST) seja desativado/suspenso enquanto a colaboração via WebSocket estiver ativa para evitar race conditions com o banco.
- [ ] Implementar o "Flush" do Durable Object para o Neon.

## Riscos e Mitigações
*   **Custos de DO:** Durable Objects são cobrados por requisição e tempo de CPU. Mitigação: Usar apenas em evoluções ativas; fechar o DO após 5 min de inatividade.
*   **Conexão Instável:** O y-websocket possui reconexão automática e buffer local. O rascunho local (localStorage) continuará existindo como fallback extremo.
