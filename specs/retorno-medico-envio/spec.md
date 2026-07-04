# Retorno Médico — alerta na coluna 3 e envio ao médico

## User stories
- **P1** Como fisioterapeuta, ao registrar um retorno médico quero vê-lo na coluna direita da evolução (junto ao EVA), em **vermelho enquanto o relatório não foi enviado** e verde depois, para não esquecer a pendência.
- **P1** Como fisioterapeuta, quero **anexar o pedido médico** no formulário de retorno.
- **P1** Como fisioterapeuta, quero um botão **Enviar ao médico via WhatsApp** com **texto padrão editável** antes do envio: "Olá Dr(a). {médico}! Sou Dr(a). {fisioterapeuta}, do(a) paciente {paciente}. Segue o relatório de fisioterapia referente ao retorno de {data}. {link do pedido}". Ao enviar, `report_sent = true`.
- **P2** Como clínica, quero um **template aprovado na Meta** (`relatorio_fisioterapia`, pt_BR, UTILITY) com o mesmo texto em variáveis, para envio automático pelo número da clínica (texto fixo — só variáveis mudam).

## Acceptance
1. Retorno com `report_sent=false` → card vermelho na coluna 3; `true` → verde. Clique abre o modal de edição.
2. Upload PDF/JPG/PNG do pedido → URL pública estável (R2 media, mesmo padrão das fotos de evolução) salva em `patient_medical_returns.request_attachment_url`.
3. Botão wa.me abre WhatsApp do médico com o texto editado; sistema marca enviado.
4. Envio automático usa o template; se não aprovado ainda, erro claro da Meta é exibido.

## Fora de escopo
E-mail; template configurável em settings; envio de documento como anexo nativo do template (fase 2).
