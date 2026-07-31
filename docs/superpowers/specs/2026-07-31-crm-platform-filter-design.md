# Filtro visível de plataforma no CRM

## Objetivo

Permitir que a equipe filtre rapidamente as conversas do CRM por plataforma, sem depender de descobrir o ícone de filtros avançados.

## Experiência

Na coluna de conversas do CRM, abaixo dos filtros de estágio do funil, será exibida uma linha compacta de chips:

- `Todas`
- `WhatsApp` (`whatsapp`)
- `Instagram` (`instagram`)
- `Site` (`webchat`)

`Todas` será o estado inicial. Cada chip de plataforma mostrará a contagem das conversas daquele canal dentro do estágio de funil selecionado. A seleção troca imediatamente a lista exibida e preserva a seleção de estágio, busca e filtros avançados. A conversa que estiver aberta permanece aberta, mesmo que deixe de constar na lista filtrada.

O filtro avançado existente no ícone de funil permanece disponível. Seu filtro de canal continuará sendo aplicado em conjunto com o chip de plataforma, sem mudar os contratos de API nem os dados armazenados.

## Componentes e fluxo

- `CrmWhatsApp.tsx` mantém um estado local de plataforma selecionada e renderiza os novos chips.
- A lista aplica o estágio, a busca, o chip de plataforma e os `InboxFilters` existentes antes da ordenação.
- As contagens são calculadas das conversas já carregadas, respeitando apenas o estágio selecionado para que sejam compreensíveis e não exijam nova consulta.

## Estados e acessibilidade

- O chip ativo recebe o estilo primário já usado nos filtros de estágio.
- Os controles serão botões com rótulos claros e poderão ser usados por teclado.
- Sem conversas em uma plataforma, o chip segue visível com contador zero e a lista mostra o estado vazio habitual.

## Verificação

- Confirmar que cada chip retorna somente conversas do canal correspondente.
- Confirmar que `Todas` restaura a lista.
- Confirmar a composição com estágio, busca e filtros avançados.
- Executar as verificações de tipo/lint e os testes existentes relacionados a filtros de inbox, se disponíveis.
