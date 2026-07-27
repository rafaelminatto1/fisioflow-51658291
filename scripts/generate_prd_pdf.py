# -*- coding: utf-8 -*-
import os
import weasyprint

html_content = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>PRD - FisioFlow 2026</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 22mm 16mm 22mm 16mm;
            @bottom-right {
                content: "Página " counter(page) " de " counter(pages);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 8pt;
                color: #64748B;
            }
            @bottom-left {
                content: "FisioFlow 2026 — Documento de Requisitos de Produto (PRD)";
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 8pt;
                color: #64748B;
            }
        }

        @page :first {
            margin: 0;
            @bottom-right { content: none; }
            @bottom-left { content: none; }
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
            font-size: 9.5pt;
            line-height: 1.55;
            margin: 0;
            padding: 0;
        }

        /* Capa Executiva */
        .cover-page {
            width: 100%;
            height: 297mm;
            background: linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0D9488 100%);
            color: #FFFFFF;
            padding: 40mm 20mm 25mm 20mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
        }

        .cover-header {
            border-bottom: 2px solid rgba(255, 255, 255, 0.15);
            padding-bottom: 20px;
        }

        .cover-badge {
            display: inline-block;
            background: rgba(14, 165, 233, 0.2);
            border: 1px solid #0EA5E9;
            color: #38BDF8;
            font-size: 8.5pt;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 6px 14px;
            border-radius: 20px;
            margin-bottom: 20px;
        }

        .cover-title {
            font-size: 34pt;
            font-weight: 800;
            line-height: 1.15;
            margin: 0 0 15px 0;
            letter-spacing: -0.5px;
            color: #FFFFFF;
        }

        .cover-subtitle {
            font-size: 14pt;
            font-weight: 400;
            color: #94A3B8;
            margin: 0 0 30px 0;
            line-height: 1.4;
        }

        .cover-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 40px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 12px;
        }

        .cover-meta-item {
            font-size: 9pt;
        }

        .cover-meta-label {
            color: #94A3B8;
            text-transform: uppercase;
            font-size: 7.5pt;
            letter-spacing: 1px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .cover-meta-value {
            color: #F8FAFC;
            font-weight: 600;
            font-size: 10pt;
        }

        .cover-footer {
            margin-top: auto;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding-top: 20px;
            font-size: 8.5pt;
            color: #94A3B8;
            display: flex;
            justify-content: space-between;
        }

        /* Typography */
        h1 {
            font-size: 18pt;
            font-weight: 700;
            color: #0F172A;
            border-bottom: 2px solid #0D9488;
            padding-bottom: 6px;
            margin-top: 25px;
            margin-bottom: 14px;
            page-break-after: avoid;
        }

        h2 {
            font-size: 13pt;
            font-weight: 700;
            color: #0F172A;
            margin-top: 18px;
            margin-bottom: 10px;
            page-break-after: avoid;
            display: flex;
            align-items: center;
        }

        h3 {
            font-size: 10.5pt;
            font-weight: 600;
            color: #0D9488;
            margin-top: 14px;
            margin-bottom: 6px;
            page-break-after: avoid;
        }

        p {
            margin-top: 0;
            margin-bottom: 10px;
            text-align: justify;
        }

        ul, ol {
            margin-top: 0;
            margin-bottom: 12px;
            padding-left: 20px;
        }

        li {
            margin-bottom: 4px;
        }

        /* Table of Contents */
        .toc {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 18px 22px;
            margin-bottom: 25px;
        }

        .toc-title {
            font-size: 12pt;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .toc-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .toc-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dashed #CBD5E1;
            font-size: 9pt;
        }

        .toc-item:last-child {
            border-bottom: none;
        }

        .toc-name {
            font-weight: 600;
            color: #1E293B;
        }

        /* Callout Boxes */
        .callout {
            border-left: 4px solid #0D9488;
            background: #F0FDF4;
            padding: 12px 16px;
            border-radius: 0 8px 8px 0;
            margin: 14px 0;
            page-break-inside: avoid;
        }

        .callout-warning {
            border-left-color: #E11D48;
            background: #FFF1F2;
        }

        .callout-info {
            border-left-color: #0EA5E9;
            background: #F0F9FF;
        }

        .callout-title {
            font-weight: 700;
            font-size: 9.5pt;
            margin-bottom: 4px;
        }

        .callout-warning .callout-title { color: #9F1239; }
        .callout-info .callout-title { color: #0369A1; }
        .callout .callout-title { color: #115E59; }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
            font-size: 8.5pt;
            page-break-inside: avoid;
        }

        th {
            background: #0F172A;
            color: #FFFFFF;
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #0F172A;
        }

        td {
            padding: 7px 10px;
            border: 1px solid #E2E8F0;
            vertical-align: top;
        }

        tr:nth-child(even) {
            background-color: #F8FAFC;
        }

        /* Grid Cards */
        .card-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 14px 0;
            page-break-inside: avoid;
        }

        .card {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px;
            background: #FFFFFF;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .card-header {
            font-weight: 700;
            font-size: 9.5pt;
            color: #0F172A;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
        }

        .tag {
            display: inline-block;
            font-size: 7pt;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            margin-left: 6px;
        }

        .tag-edge { background: #E0F2FE; color: #0369A1; }
        .tag-ai { background: #F3E8FF; color: #6B21A8; }
        .tag-sec { background: #FEF2F2; color: #991B1B; }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

    <!-- CAPA EXECUTIVA -->
    <div class="cover-page">
        <div class="cover-header">
            <div class="cover-badge">DOCUMENTO DE REQUISITOS DE PRODUTO (PRD)</div>
            <div class="cover-title">FisioFlow 2026</div>
            <div class="cover-subtitle">Plataforma de Saúde Digital Native Edge, Inteligência Clínica por IA e Excelência Operacional para Fisioterapia Particular</div>
        </div>

        <div class="cover-grid">
            <div class="cover-meta-item">
                <div class="cover-meta-label">Região Alvo</div>
                <div class="cover-meta-value">São Paulo, SP (AWS sa-east-1 / GRU)</div>
            </div>
            <div class="cover-meta-item">
                <div class="cover-meta-label">Modelo de Atendimento</div>
                <div class="cover-meta-value">100% Particular / Out-of-Pocket</div>
            </div>
            <div class="cover-meta-item">
                <div class="cover-meta-label">Stack de Infraestrutura</div>
                <div class="cover-meta-value">Cloudflare Workers + Neon PostgreSQL</div>
            </div>
            <div class="cover-meta-item">
                <div class="cover-meta-label">Motores de IA</div>
                <div class="cover-meta-value">Google Gemini 1.5 Flash (iaStudioApi)</div>
            </div>
            <div class="cover-meta-item">
                <div class="cover-meta-label">Versão do Documento</div>
                <div class="cover-meta-value">v2.5 (Edição Executiva 2026)</div>
            </div>
            <div class="cover-meta-item">
                <div class="cover-meta-label">Data de Emissão</div>
                <div class="cover-meta-value">Julho de 2026</div>
            </div>
        </div>

        <div class="cover-footer">
            <span>FisioFlow Systems Ltd. — Todos os direitos reservados</span>
            <span>Estritamente Confidencial</span>
        </div>
    </div>

    <!-- SUMÁRIO -->
    <div class="toc">
        <div class="toc-title">Índice do Documento</div>
        <ul class="toc-list">
            <li class="toc-item"><span class="toc-name">1. Visão Geral do Produto & Proposta de Valor</span></li>
            <li class="toc-item"><span class="toc-name">2. Escopo Geográfico, Mercado e Regras Mandatórias</span></li>
            <li class="toc-item"><span class="toc-name">3. Arquitetura Técnica & Stack Infraestrutural</span></li>
            <li class="toc-item"><span class="toc-name">4. Módulos Funcionais e Capacidades Next-Gen</span></li>
            <li class="toc-item"><span class="toc-name">5. Requisitos Não-Funcionais, Segurança & LGPD</span></li>
            <li class="toc-item"><span class="toc-name">6. Modelo de Dados Relacional & Multi-tenancy</span></li>
            <li class="toc-item"><span class="toc-name">7. Roadmap de Implementação e Plano P0/P1/P2</span></li>
            <li class="toc-item"><span class="toc-name">8. Matriz de Riscos, Mitigações e KPIs de Sucesso</span></li>
        </ul>
    </div>

    <!-- 1. VISÃO GERAL -->
    <h1>1. Visão Geral do Produto & Proposta de Valor</h1>
    <p>
        O <strong>FisioFlow 2026</strong> é uma plataforma de saúde digital de próxima geração desenvolvida especificamente para clínicas de fisioterapia de alta performance localizadas na Região Metropolitana de São Paulo, SP. Operando sob o paradigma de <em>Edge Computing</em> de latência ultra-baixa (&lt;60ms), a solução integra inteligência artificial clínica avançada, automação de faturamento particular, monitoramento fisiológico contínuo e gestão preditiva de negócios.
    </p>

    <div class="callout callout-info">
        <div class="callout-title">Missão Estratégica do Produto</div>
        Transformar o conhecimento tácito da fisioterapia clínica brasileira em ciência exata de dados, aumentando o ticket médio dos tratamentos particulares, zerando a taxa de absenteísmo (no-show) e automatizando 90% da carga burocrática dos fisioterapeutas.
    </div>

    <div class="card-grid">
        <div class="card">
            <div class="card-header">Eficiência Clínica por IA <span class="tag tag-ai">IA Core</span></div>
            Transcrição por voz (Voice Scribe) para preenchimento automático do prontuário (Observação Livre) em menos de 15 segundos via Gemini 1.5 Flash.
        </div>
        <div class="card">
            <div class="card-header">Edge-Native Setup <span class="tag tag-edge">Cloudflare</span></div>
            Execução global na borda sem servidores tradicionais, garantindo carregamento instantâneo de imagens, exames e históricos de prontuários.
        </div>
        <div class="card">
            <div class="card-header">Automação de Atendimento <span class="tag tag-sec">CRM</span></div>
            AI Concierge no WhatsApp atuando 24/7 na qualificação de pacientes particulares, confirmação preventiva de horários e reativação pós-alta.
        </div>
        <div class="card">
            <div class="card-header">Gêmeo Digital (Digital Twin) <span class="tag tag-ai">Predictive</span></div>
            Algoritmos biomecânicos e preditivos para estimar semanas de alta e emitir alertas precoces de abandono de tratamento.
        </div>
    </div>

    <!-- 2. ESCOPO & REGRAS -->
    <h1>2. Escopo Geográfico, Mercado e Regras Mandatórias</h1>
    
    <h3>2.1 Foco Geográfico e Infraestrutura Dedicada</h3>
    <p>
        O FisioFlow é desenhado com foco regional exclusivo na cidade de <strong>São Paulo, SP</strong>. Para assegurar máxima conformidade e mínima latência física aos profissionais e pacientes locais, todos os recursos de banco de dados (Neon PostgreSQL) e armazenamento (Cloudflare R2) são fixados no data center de São Paulo (AWS <code>sa-east-1</code> / Cloudflare Edge <code>GRU</code>).
    </p>

    <div class="callout callout-warning">
        <div class="callout-title">REGRA DE OURO MANTIDA: Atendimento 100% Particular</div>
        O FisioFlow destina-se <strong>exclusivamente a atendimentos particulares (Out-of-Pocket)</strong>. É estritamente proibida a implementação de suporte a faturamento por guias de convênios médicos, tabelas TISS/TUSS ou trâmites administrativos com operadoras de planos de saúde.
    </div>

    <h3>2.2 Premissas de Negócio e Restrições de Operação</h3>
    <ul>
        <li><strong>Foco em Atendimento Individualizado:</strong> O produto atende clínicas de sala/consultório único. Recursos de "Turmas/Grupos" foram intencionalmente omitidos do design de interface e backend para manter uma experiência fluida e focada.</li>
        <li><strong>Gatilhos de Ciclos de 10 Sessões:</strong> O núcleo financeiro baseia-se em pacotes de tratamento particulares (geralmente ciclos de 10 sessões). Ao atingir a 10ª sessão (e múltiplos), o sistema dispara uma notificação administrativa de renovação e gera a fatura automaticamente.</li>
        <li><strong>Emissão Direta de NFS-e:</strong> Integração fiscal nativa via Certificado Digital e-CNPJ A1 com os webservices da Prefeitura de São Paulo para emissão direta de Nota Fiscal de Serviços Eletrônica, eliminando middleware terceiro.</li>
        <li><strong>Proibição de Provedores Não-Aprovados:</strong> Fica terminantemente vetado o uso de Vercel, Railway ou Firebase no projeto FisioFlow. A infraestrutura autorizada é 100% Cloudflare e Neon PostgreSQL.</li>
    </ul>

    <!-- 3. ARQUITETURA TÉCNICA -->
    <div class="page-break"></div>
    <h1>3. Arquitetura Técnica & Stack Infraestrutural</h1>
    <p>
        A arquitetura do FisioFlow segue os princípios da engenharia moderna <em>Serverless & Edge-First</em>, isolando a camada de computação na borda da Cloudflare e o armazenamento relacional escalável no Neon DB.
    </p>

    <table>
        <thead>
            <tr>
                <th>Camada do Sistema</th>
                <th>Tecnologia Selecionada</th>
                <th>Função e Detalhes de Implementação</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Frontend Web (Gestor/Clínico)</strong></td>
                <td>React 19, Vite 8, Tailwind CSS, shadcn/ui</td>
                <td>Hospedado no <strong>Cloudflare Pages</strong>. Interface ultra-rápida, modular e reativa.</td>
            </tr>
            <tr>
                <td><strong>Mobile Apps (Paciente/Fisio)</strong></td>
                <td>React Native (Native, sem Expo Go)</td>
                <td>Desenvolvimento nativo com <code>react-native-vision-camera</code> e <code>reanimated</code>. Build via GitHub Actions.</td>
            </tr>
            <tr>
                <td><strong>Backend API</strong></td>
                <td>Cloudflare Workers (Hono.js / TypeScript)</td>
                <td>API Serverless rodando em <code>apps/api</code> com roteamento tipado, validação Zod e middleware mTLS.</td>
            </tr>
            <tr>
                <td><strong>Banco de Dados Relacional</strong></td>
                <td>Neon PostgreSQL Serverless + Drizzle ORM</td>
                <td>Instância localizada em AWS <code>sa-east-1</code> (SP). Multi-tenancy via <code>organization_id</code> e Drizzle.</td>
            </tr>
            <tr>
                <td><strong>Autenticação & Identidade</strong></td>
                <td>Neon Auth (JWKS / RS256)</td>
                <td>Validação distribuída de tokens JWT nos Workers da borda sem consultar banco em cada request.</td>
            </tr>
            <tr>
                <td><strong>Aceleração DB & Pooling</strong></td>
                <td>Cloudflare Hyperdrive</td>
                <td>Pooling global de conexões PostgreSQL para eliminar custos de handshake de conexão TCP/TLS.</td>
            </tr>
            <tr>
                <td><strong>Armazenamento de Mídia</strong></td>
                <td>Cloudflare R2 (S3 API)</td>
                <td>Armazenamento seguro de vídeos de biomecânica e laudos em SP com replicação DR para EUA.</td>
            </tr>
            <tr>
                <td><strong>Motores de IA Clínica</strong></td>
                <td>Google Gemini 1.5 Flash (iaStudioApi)</td>
                <td>Processamento multimodal de voz (Voice Scribe), visão (HUD 3D) e busca vetorial no prontuário (RAG).</td>
            </tr>
        </tbody>
    </table>

    <!-- 4. MÓDULOS FUNCIONAIS -->
    <h1>4. Módulos Funcionais e Capacidades Next-Gen</h1>

    <h3>4.1 Clinical AI Studio (Inteligência Clínica Avançada)</h3>
    <ul>
        <li><strong>Scribe por Voz (Observação Livre):</strong> Captura o áudio da consulta do fisioterapeuta pelo microfone (web/mobile), converte via Whisper e estrutura a nota de evolução utilizando o modelo <code>Gemini 1.5 Flash</code> via <code>iaStudioApi</code>.</li>
        <li><strong>Patient 360° Chat (RAG Contextual):</strong> Permite ao fisioterapeuta realizar perguntas em linguagem natural sobre todo o histórico de avaliações, cirurgias e exames do paciente.</li>
        <li><strong>HUD Biomecânico 3D:</strong> Processador de quadros em tempo real para testes de corrida, marcha e amplitude articular (ROM), exibindo overlays gráficos de ângulos e vetores de força.</li>
        <li><strong>Gêmeo Digital (Digital Twin):</strong> Modelo estatístico-clínico que compara a curva de dor e amplitude do paciente com dados históricos para prever a semana exata de alta funcional.</li>
    </ul>

    <h3>4.2 Enterprise Business Intelligence & Centro de Comando</h3>
    <ul>
        <li><strong>Dashboard CAC / LTV / Payback:</strong> Painel gerencial em tempo real calculando o Custo de Aquisição de Pacientes Particulares, Lifetime Value acumulado e tempo de retorno de investimentos em marketing.</li>
        <li><strong>DRE Gerencial e Previsão de Receita:</strong> Projeção financeira automatizada para 30, 60 e 90 dias com base na taxa de renovação de pacotes de 10 sessões.</li>
        <li><strong>AI Peer-Review Clínico:</strong> Análise automatizada da qualidade dos prontuários e evoluções preenchidas pelos fisioterapeutas da equipe, garantindo padronização científica.</li>
    </ul>

    <h3>4.3 Automação Operacional e CRM WhatsApp</h3>
    <ul>
        <li><strong>AI Concierge (WhatsApp 24/7):</strong> Webhook integrado à Meta Cloud API / WhatsApp Business para atendimento automático de novos leads particulares, tirando dúvidas e realizando pré-agendamentos.</li>
        <li><strong>Confirmação Preventiva de Presença (D-2 / D-1):</strong> Disparo de mensagens interativas de confirmação com botões "[Sim] / [Não]". Respostas atualizam o status da agenda instantaneamente, reduzindo a taxa de absenteísmo (no-show) de 15% para menos de 8%.</li>
    </ul>

    <!-- 5. REQUISITOS NÃO-FUNCIONAIS -->
    <div class="page-break"></div>
    <h1>5. Requisitos Não-Funcionais, Segurança & LGPD</h1>

    <h3>5.1 Performance e Disponibilidade</h3>
    <ul>
        <li><strong>Latência na Borda:</strong> O tempo de resposta para leitura de dados clínicos e carregamento do portal não deve exceder 60ms na Grande São Paulo.</li>
        <li><strong>Resiliência Offline-First:</strong> As aplicações mobile e web devem continuar operando sem conexão com a internet. Requisições de alteração (<code>POST/PATCH/DELETE</code>) são interceptadas e salvas em IndexedDB (Web) ou AsyncStorage (Mobile), sendo sincronizadas em fila sequencial quando a rede for restabelecida.</li>
    </ul>

    <h3>5.2 Conformidade com a LGPD e Proteção de Dados de Saúde</h3>
    <div class="callout callout-warning">
        <div class="callout-title">Privacidade e Proteção de Dados Sensíveis</div>
        Dados de saúde (evoluções clínicas, imagens corporais, laudos) são classificados como dados pessoais sensíveis conforme o Art. 5º, II da LGPD.
    </div>
    <ul>
        <li><strong>Redação de PII em Logs:</strong> Qualquer Informação Pessoal Identificável (PII) deve ser sanitizada antes de gravar logs nos Cloudflare Workers.</li>
        <li><strong>Acesso Privado Mídia via Presigned URLs:</strong> Nenhuma imagem ou vídeo de biomecânica armazenado no Cloudflare R2 possui acesso público. O backend gera presigned URLs temporárias com expiração máxima de 15 minutos.</li>
        <li><strong>Imutabilidade de Laudos Assinados:</strong> Documentos de desfecho e laudos médicos com assinatura digital são selados em formato PDF/A criptografado, impedindo alterações posteriores para preservação de validade jurídica.</li>
    </ul>

    <!-- 6. MODELO DE DADOS -->
    <h1>6. Modelo de Dados Relacional & Multi-tenancy</h1>
    <p>
        O schema relacional é gerenciado via <strong>Drizzle ORM</strong> no PostgreSQL (Neon). Todas as tabelas contêm o campo <code>organization_id</code> para garantir o isolamento estrito entre diferentes clínicas.
    </p>

    <table>
        <thead>
            <tr>
                <th>Tabela Core</th>
                <th>Chaves Principais</th>
                <th>Descrição e Relacionamentos</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><code>organizations</code></td>
                <td><code>id (PK)</code>, <code>cnpj</code>, <code>name</code></td>
                <td>Cadastro da clínica tenant em São Paulo. Aloca as configurações e certificados fiscais A1.</td>
            </tr>
            <tr>
                <td><code>users</code></td>
                <td><code>id (PK)</code>, <code>org_id (FK)</code>, <code>role</code></td>
                <td>Usuários do sistema (Gestor, Fisioterapeuta, Recepcionista). Vinculados ao Neon Auth.</td>
            </tr>
            <tr>
                <td><code>patients</code></td>
                <td><code>id (PK)</code>, <code>org_id (FK)</code>, <code>cpf</code></td>
                <td>Prontuário base do paciente particular. Armazena histórico, dados de contato e consentimento LGPD.</td>
            </tr>
            <tr>
                <td><code>appointments</code></td>
                <td><code>id (PK)</code>, <code>patient_id (FK)</code>, <code>status</code></td>
                <td>Agendamentos individuais da clínica. Controla confirmações WhatsApp e presenças.</td>
            </tr>
            <tr>
                <td><code>treatment_plans</code></td>
                <td><code>id (PK)</code>, <code>session_counter</code></td>
                <td>Plano particular de tratamento. Mantém o contador de sessões e dispara renovações no múltiplo de 10.</td>
            </tr>
            <tr>
                <td><code>clinical_notes</code></td>
                <td><code>id (PK)</code>, <code>appointment_id (FK)</code></td>
                <td>Evolução clínica (Observação Livre / Voice Scribe). Contém dados estruturados e notas de IA.</td>
            </tr>
        </tbody>
    </table>

    <!-- 7. ROADMAP & FASES -->
    <h1>7. Roadmap de Implementação e Plano P0/P1/P2</h1>
    <p>
        O plano de go-live do FisioFlow é dividido em 3 horizontes prioritários para assegurar a imediata validação de valor em produção na clínica piloto.
    </p>

    <h3>7.1 Fase P0 — Bloqueios Operacionais (14 Dias - Go-Live)</h3>
    <ul>
        <li><strong>Dia 1-2:</strong> Envio dos aplicativos nativos para App Store (iOS) e Google Play (Android).</li>
        <li><strong>Dia 3-6:</strong> Finalização do Dashboard BI com métricas de CAC, LTV e Payback.</li>
        <li><strong>Dia 7-9:</strong> Webhook de confirmação automática no WhatsApp (Redução do No-Show para &lt;8%).</li>
        <li><strong>Dia 10-12:</strong> Validação em produção do AI Concierge para captação de pacientes particulares.</li>
        <li><strong>Dia 13-14:</strong> Polimento da jornada do paciente e checkout com emissão de NFS-e.</li>
    </ul>

    <h3>7.2 Fase P1 — Diferenciadores de Mercado (Semanas 3 a 4)</h3>
    <ul>
        <li>Módulo de Recuperação Pós-Alta por IA (Reativação de pacientes inativos há &gt;90 dias).</li>
        <li>Deep Linking dinâmico para abertura direta de séries de exercícios no app do paciente.</li>
        <li>Painel de integração e envio de laudos de progresso para médicos ortopedistas encaminhadores.</li>
    </ul>

    <h3>7.3 Fase P2 — Inteligência Preditiva Expandida (Mês 2+)</h3>
    <ul>
        <li>Integração com wearables (Apple HealthKit / Google Fit) para detecção de anomalias de sono e carga.</li>
        <li>Dashboard de conformidade LGPD com exclusão automatizada e portabilidade de dados.</li>
    </ul>

    <!-- 8. RISCOS E KPIS -->
    <h1>8. Matriz de Riscos, Mitigações e KPIs de Sucesso</h1>

    <table>
        <thead>
            <tr>
                <th>Risco Identificado</th>
                <th>Impacto</th>
                <th>Estratégia de Mitigação</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Falha de conectividade na clínica durante atendimento</td>
                <td>Médio</td>
                <td>Arquitetura Offline-First com salvamento local no IndexedDB/AsyncStorage e sync background.</td>
            </tr>
            <tr>
                <td>Lentidão na transcrição de áudio por voz no prontuário</td>
                <td>Baixo</td>
                <td>Uso do modelo ultra-rápido Gemini 1.5 Flash via Cloudflare AI Gateway operando na borda.</td>
            </tr>
            <tr>
                <td>Recusa do paciente em responder confirmação no WhatsApp</td>
                <td>Médio</td>
                <td>Mensagens interativas simplificadas com botões de 1-clique e disparo com 48h de antecedência.</td>
            </tr>
        </tbody>
    </table>

    <h3>8.1 Indicadores Chave de Desempenho (KPIs de Sucesso)</h3>
    <ul>
        <li><strong>Taxa de Absenteísmo (No-Show):</strong> Queda de 15% para menos de 8% nos primeiros 30 dias de operação.</li>
        <li><strong>Tempo Médio de Preenchimento de Evolução:</strong> Redução de 8 minutos para menos de 30 segundos por atendimento.</li>
        <li><strong>Taxa de Renovação de Pacotes de 10 Sessões:</strong> Aumento de 40% nas conversões devido aos lembretes automáticos.</li>
        <li><strong>Satisfação do Profissional (NPS Interno):</strong> Índice superior a 90 pontos na experiência de uso dos apps.</li>
    </ul>

    <div style="margin-top: 40px; text-align: center; font-size: 8.5pt; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 15px;">
        Documento gerado automaticamente pelo Sistema de Inteligência FisioFlow 2026 — São Paulo, SP.
    </div>

</body>
</html>
"""

pdf_path = "/home/rafael/Documents/fisioflow/fisioflow-51658291/FisioFlow_PRD_2026.pdf"
weasyprint.HTML(string=html_content).write_pdf(pdf_path)
print(f"PDF criado com sucesso no caminho: {pdf_path}")
