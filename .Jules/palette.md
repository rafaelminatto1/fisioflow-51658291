
## 2024-04-09 - [Acessibilidade de Botões de Ícone]
**Learning:** Muitos componentes que utilizam o padrão de `Button` do shadcn/ui com `variant="ghost"` e `size="icon"` omitiam o `aria-label`, o que tornava a navegação ininteligível para usuários de leitores de tela. Um detalhe crítico que notei é que esses botões frequentemente incluem `<Badge>` para indicar contagens (ex: notificações não lidas) com leitura confusa se o botão inteiro não disser o que ele faz.
**Action:** Ao adicionar ou revisar botões de ícone (<Button size="icon">), sempre garantir a presença do `aria-label` descritivo na mesma língua da interface (PT-BR) de forma proativa. O mesmo se aplica a componentes interativos como o `<Switch>`.
