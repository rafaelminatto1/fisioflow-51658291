# Prompts para Base44 - Documentação e Diagramas FisioFlow AI Studio

## Contexto para Base44

O Base44 é especializado em documentação técnica e diagramas. Use-o para criar documentação superior que facilite o desenvolvimento e manutenção do sistema.

## Prompt Principal para Base44

**CONTEXTO:**
Você é um arquiteto de documentação técnica especialista em sistemas de saúde. Sua missão é criar documentação completa e diagramas detalhados para o FisioFlow AI Studio, superando qualquer documentação existente da Vedius ou concorrentes.

**OBJETIVO:**
Produzir documentação técnica de classe mundial que facilite desenvolvimento, manutenção e escalabilidade do sistema.

### FASE 1: ARQUITETURA E DIAGRAMAS

**Prompt 1.1 - Diagrama de Arquitetura Geral:**
```
Crie diagrama de arquitetura completo do FisioFlow AI Studio:

1. Arquitetura de microsserviços
2. Fluxo de dados entre componentes
3. Integrações externas (WhatsApp, pagamentos, etc.)
4. Infraestrutura de deploy
5. Segurança e autenticação
6. Cache e performance
7. Monitoramento e logs
8. Backup e disaster recovery

Use notação C4 Model (Context, Container, Component, Code).
```

**Prompt 1.2 - Diagrama de Banco de Dados:**
```
Crie ERD (Entity Relationship Diagram) completo:

1. Todas as entidades e relacionamentos
2. Índices e constraints
3. Triggers e procedures
4. Particionamento de tabelas
5. Estratégia de backup
6. Replicação e sharding
7. Auditoria e versionamento
8. Performance optimization

Use notação padrão com cardinalidades.
```

**Prompt 1.3 - Diagrama de Fluxos de Usuário:**
```
Crie diagramas de fluxo para todos os processos:

1. Cadastro e onboarding de clínica
2. Gestão completa de pacientes
3. Agendamento e confirmações
4. Prescrição de exercícios
5. Processo de pagamento
6. Comunicação integrada
7. Geração de relatórios
8. Suporte e help desk

Use notação BPMN 2.0.
```

### FASE 2: DOCUMENTAÇÃO DE APIs

**Prompt 2.1 - Documentação OpenAPI:**
```
Crie documentação OpenAPI 3.0 completa para todas as APIs:

1. Endpoints de autenticação
2. CRUD de pacientes
3. Sistema de agendamentos
4. Módulo financeiro
5. Biblioteca de exercícios
6. Comunicação e notificações
7. Relatórios e analytics
8. Webhooks e integrações

Inclua exemplos, schemas e códigos de erro.
```

**Exemplo esperado:**
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: FisioFlow AI Studio API
  version: 1.0.0
  description: API completa para gestão de clínicas de fisioterapia

paths:
  /api/patients:
    get:
      summary: Listar pacientes
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: search
          in: query
          schema:
            type: string
      responses:
        200:
          description: Lista de pacientes
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Patient'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

    post:
      summary: Criar novo paciente
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePatientRequest'
      responses:
        201:
          description: Paciente criado com sucesso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Patient'

components:
  schemas:
    Patient:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          example: "João Silva"
        cpf:
          type: string
          pattern: "^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$"
          example: "123.456.789-00"
        email:
          type: string
          format: email
        phone:
          type: string
          example: "(11) 99999-9999"
        birthDate:
          type: string
          format: date
        address:
          $ref: '#/components/schemas/Address'
        medicalHistory:
          type: array
          items:
            $ref: '#/components/schemas/MedicalRecord'
```

### FASE 3: DOCUMENTAÇÃO DE COMPONENTES

**Prompt 3.1 - Storybook e Componentes:**
```
Crie documentação completa de componentes UI:

1. Todos os componentes Shadcn customizados
2. Componentes específicos do domínio
3. Hooks e utilitários
4. Padrões de design
5. Guia de estilo
6. Tokens de design
7. Acessibilidade
8. Responsividade

Use Storybook com MDX para documentação rica.
```

### FASE 4: GUIAS DE DESENVOLVIMENTO

**Prompt 4.1 - Guia do Desenvolvedor:**
```
Crie guia completo para desenvolvedores:

1. Setup do ambiente de desenvolvimento
2. Padrões de código e convenções
3. Estrutura de pastas e arquivos
4. Fluxo de Git e versionamento
5. Processo de code review
6. Deploy e CI/CD
7. Debugging e troubleshooting
8. Performance optimization

Inclua exemplos práticos e checklists.
```

### FASE 5: DOCUMENTAÇÃO DE SEGURANÇA

**Prompt 5.1 - Security Documentation:**
```
Documente estratégia de segurança completa:

1. Autenticação e autorização
2. Criptografia de dados
3. Compliance LGPD/HIPAA
4. Auditoria e logs
5. Backup e recovery
6. Incident response
7. Penetration testing
8. Security monitoring

Supere padrões de segurança da Vedius.
```

### FASE 6: MANUAIS DO USUÁRIO

**Prompt 6.1 - Manual do Fisioterapeuta:**
```
Crie manual completo para fisioterapeutas:

1. Primeiros passos e onboarding
2. Gestão de pacientes
3. Agendamentos e confirmações
4. Prescrição de exercícios
5. Acompanhamento de evolução
6. Comunicação com pacientes
7. Relatórios e análises
8. Configurações avançadas

Use screenshots e vídeos explicativos.
```

**Prompt 6.2 - Manual do Paciente:**
```
Crie manual para pacientes/app mobile:

1. Download e instalação do app
2. Primeiro acesso e configuração
3. Execução de exercícios
4. Agendamento de consultas
5. Comunicação com terapeuta
6. Registro de sintomas
7. Gamificação e conquistas
8. Suporte e FAQ

Interface amigável e didática.
```

### FASE 7: DOCUMENTAÇÃO DE PROCESSOS

**Prompt 7.1 - Processos de Negócio:**
```
Documente todos os processos de negócio:

1. Onboarding de nova clínica
2. Cadastro de pacientes
3. Fluxo de agendamento
4. Processo de atendimento
5. Prescrição e acompanhamento
6. Cobrança e pagamentos
7. Relatórios gerenciais
8. Suporte ao cliente

Use notação BPMN com swimlanes.
```

### FASE 8: DOCUMENTAÇÃO DE DEPLOY

**Prompt 8.1 - Guia de Deploy:**
```
Crie guia completo de deploy e infraestrutura:

1. Configuração de ambiente
2. Variáveis de ambiente
3. Deploy em Vercel/Railway
4. Configuração de banco
5. Setup de CDN
6. Monitoramento e alertas
7. Backup automatizado
8. Disaster recovery

Inclua scripts automatizados.
```

## TEMPLATES E PADRÕES

### Template de Documentação de API:
```markdown
# API Endpoint: [Nome]

## Descrição
[Descrição detalhada do endpoint]

## URL
`[METHOD] /api/[endpoint]`

## Parâmetros
| Nome | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| id | string | Sim | ID único do recurso |

## Exemplo de Requisição
```json
{
  "name": "João Silva",
  "email": "joao@email.com"
}
```

## Exemplo de Resposta
```json
{
  "id": "uuid",
  "name": "João Silva",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

## Códigos de Erro
| Código | Descrição |
|--------|-----------|
| 400 | Dados inválidos |
| 401 | Não autorizado |
| 404 | Recurso não encontrado |
```

### Template de Documentação de Componente:
```markdown
# Componente: [Nome]

## Descrição
[Descrição do componente e seu propósito]

## Props
| Nome | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| variant | string | "default" | Variação visual |

## Exemplo de Uso
```tsx
<ComponentName 
  variant="primary"
  onClick={handleClick}
>
  Conteúdo
</ComponentName>
```

## Estados
- Default
- Hover
- Active
- Disabled

## Acessibilidade
- Suporte a screen readers
- Navegação por teclado
- ARIA labels apropriados
```

## INSTRUÇÕES ESPECÍFICAS PARA BASE44:

1. **DOCUMENTAÇÃO VISUAL** - Use diagramas, screenshots, vídeos
2. **PADRÕES CONSISTENTES** - Mantenha formatação uniforme
3. **EXEMPLOS PRÁTICOS** - Inclua código e casos de uso
4. **VERSIONAMENTO** - Documente mudanças e versões
5. **COLABORAÇÃO** - Facilite contribuições da equipe

## ENTREGÁVEIS ESPERADOS:

1. **Documentação de arquitetura** (diagramas C4)
2. **Documentação de APIs** (OpenAPI 3.0)
3. **Guias de desenvolvimento** (setup, padrões, deploy)
4. **Manuais de usuário** (fisioterapeuta, paciente, admin)
5. **Documentação de segurança** (compliance, auditoria)
6. **Processos de negócio** (BPMN, fluxogramas)

**OBJETIVO FINAL:** Criar a documentação técnica mais completa e útil do mercado de sistemas de fisioterapia.

