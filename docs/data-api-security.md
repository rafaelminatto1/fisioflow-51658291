# Segurança da Data API (Portal do Paciente)

Este documento descreve a arquitetura de segurança da integração da Data API com o Portal do Paciente, garantindo conformidade com a LGPD e o isolamento dos dados.

## 1. Como o RLS (Row Level Security) Protege os Dados

A integração utiliza as funcionalidades nativas do PostgreSQL e do Neon para garantir o acesso restrito aos dados de cada paciente.
Ao invés de realizar a filtragem apenas na camada da aplicação, aplicamos políticas diretamente no banco de dados utilizando um role específico chamado `patient_portal`.

### Escopo das Políticas de Acesso
- **`patients`**: O paciente só consegue acessar os registros onde o seu `id` seja igual à variável de sessão `app.patient_id`.
- **`appointments`**: O paciente só visualiza agendamentos cujo `patient_id` seja igual ao seu.
- **`sessions`**: O acesso ao histórico de sessões, progresso e planos de exercícios em casa é estritamente restrito através do `patient_id`.
- **`exercises`**: A leitura de exercícios pela Data API está restrita a exercícios públicos globais e àqueles próprios da clínica que o paciente frequenta.
- **`payments` / `financial_accounts`**: O acesso aos dados financeiros é validado conferindo a relação do paciente com o pagamento.

## 2. Bloqueio de Escritas via Data API

Para garantir a integridade do banco de dados, da lógica de negócio clínica (Prontuário) e financeira:
- **O Data API Client funciona exclusivamente em modo somente leitura**.
- O role `patient_portal` recebeu exclusivamente acessos do tipo `GRANT SELECT`. 
- Todas as operações de escrita (INSERT, UPDATE, DELETE) provenientes de interações do paciente deverão obrigatoriamente passar pela API principal em Hono, que cuidará de validar as restrições, acionar webhooks e manter o log de auditoria.

## 3. Trilha de Auditoria

Durante o uso da Data API do Neon via chamadas HTTPS, cada comando é envelopado em uma transação com os parâmetros do usuário. O client da aplicação sempre executa:
```sql
SET ROLE patient_portal;
SELECT set_config('app.patient_id', 'ID_DO_PACIENTE', true);
```
Isso assegura que todo o acesso executado pela transação adota os privilégios exatos desse usuário e qualquer anomalia será facilmente identificável nos logs da plataforma Neon.

## 4. Conformidade com a LGPD

O design reflete princípios de **Privacy by Design**:
- A privacidade é imposta na camada mais profunda de armazenamento; se a aplicação cometer um erro ao não enviar os filtros em um SELECT, o banco de dados silenciará as linhas proibidas, evitando um vazamento massivo de prontuários.
- Como o canal é fechado para modificações, a integridade do prontuário (responsabilidade do fisioterapeuta/clínica) fica resguardada. Apenas dados autorizados (receituários, agendas e cobranças) fluem para a interface final.
