# FisioFlow Design System

> Sistema de design para o **FisioFlow** — plataforma web + mobile de gestão clínica e análise biomecânica de pacientes operada pela clínica **Activity Fisioterapia** (Mooca Fisio, São Paulo).

FisioFlow é uma plataforma de **alta performance** voltada para o uso diário em ambiente clínico e esportivo. A interface prioriza **eficiência, acessibilidade e clareza de dados**: botões de ação bem definidos, visualização precisa de análises de performance e tabelas robustas para gestão de pacientes. A paleta é **neutra para reduzir fadiga visual em jornadas de 8h+ na clínica**, reservando o **azul Activity** apenas para ações primárias e destaques de dados críticos.

---

## Produtos cobertos por este sistema

| Surface                                 | Stack                                     | Audiência                                |
| --------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| **Web app — FisioFlow Clínica**         | React 19 + Vite + Tailwind v4 + shadcn/ui | Fisioterapeutas, estagiários, admin      |
| **App mobile — Patient App**            | Expo / React Native                       | Pacientes (exercícios, evolução, agenda) |
| **App profissional — Professional App** | Expo / Capacitor                          | Fisios em atendimento, biomecânica       |

---

## Index — arquivos deste sistema

```
README.md                  → este arquivo (foundations, content, visual, iconography)
SKILL.md                   → entry point para Claude / Agent Skills
colors_and_type.css        → tokens (cores, tipografia, espaçamento, sombras)
fonts/                     → vag-rounded.otf (apenas logotipo)
assets/                    → logos Activity (.svg, .png) + screenshots de referência
preview/                   → cards do Design System tab (cores, type, componentes)
ui_kits/web/               → kit do web app (Sidebar, PageHeader, AgendaView, PatientList, ExerciseLibrary, Login)
                             + telas: evolucao-clinica, crm-whatsapp, avaliacao-inicial (anamnese),
                             paciente-detalhe (prontuário), protocolos, testes-clinicos, boards,
                             financeiro, wiki-clinica, configuracoes (shell comum: screen-shell.css)
ui_kits/patient-app/       → kit mobile do paciente (home: agenda, pain log, protocolo do dia)
ui_kits/professional-app/  → app do fisio (rail + 1280×880): dashboard (painel), capture (nova captura),
                             index (análise biomecânica), comparison (antes/depois), report (laudo), tests (biblioteca)
```

---

## Sources / proveniência

Este sistema foi destilado a partir das seguintes fontes (não assuma que o leitor tem acesso; armazenar referência):

- **Repo:** `github.com/rafaelminatto1/fisioflow-51658291` (monorepo Turbo: `apps/web`, `apps/patient-app`, `apps/professional-app`, `apps/api`)
- **Fonte de verdade dos tokens:** `apps/web/src/styles/index.css` (`@theme` + `@layer base`) e `DESIGN_SYSTEM.md` na raiz do repo
- **Variantes CVA:** `apps/web/src/lib/ui-variants.ts`
- **Logo oficial:** `uploads/logo.svg` (Activity Fisioterapia, runner azul + wordmark cinza)
- **Screenshots de referência:** Agenda (`moocafisio.com.br/agenda`) e Biblioteca de Exercícios (`moocafisio.com.br/exercises`) capturados em 12/05/2026
- **Fontes brand:** VAG Rounded (logo Activity) — `fonts/vag-rounded.otf`; Futura Condensed Bold Oblique (tagline "FISIOTERAPIA") — `fonts/futura-condensed-bold-oblique.otf`

---

## Index — arquivos neste sistema

```
README.md                  ← este arquivo (foundations completas)
SKILL.md                   ← skill cross-compatível para Claude Code
colors_and_type.css        ← tokens CSS (cores, type, radius, shadow, spacing)
fonts/                     ← webfonts (.otf) — VAG Rounded
assets/                    ← logos PNG/SVG, screenshots de referência
preview/                   ← cards individuais para o Design System tab
ui_kits/
  web/                     ← UI kit do FisioFlow Clínica (web app)
    index.html             ← prototype clicável (Login → Agenda → Paciente)
    Sidebar.jsx, AgendaView.jsx, PatientList.jsx, ...
  patient-app/             ← UI kit do app mobile do paciente
    index.html             ← prototype clicável em moldura iOS
    Home.jsx, ExerciseDetail.jsx, ...
```

---

## CONTENT FUNDAMENTALS

**Idioma:** Português (Brasil) em 100% da interface. Termos técnicos em inglês só quando consagrados (`Dashboard`, `Login`, `Hub`, `Boards`).

**Voz e tom**

- **Clínica e direta.** Sem floreios, sem "vamos lá!", sem entusiasmo artificial. A UI fala como um colega fisio competente: rápido, preciso, sem desperdiçar tokens cognitivos.
- **Você** (informal) em prompts ao usuário ("Adicione o primeiro paciente para começar."). Nunca "tu", nunca "vós". Nunca "nós" — o produto não se posiciona como entidade.
- **Imperativo afirmativo** para CTAs: `Agendar`, `Salvar`, `Excluir`, `Iniciar Sessão`, `Reengajar`. Não `Agendar agora`, não `Clique para salvar`.
- **Sem emoji** na UI do produto. Emoji só aparece no README do monorepo (🏥). Iconografia é resolvida por **lucide-react**.

**Casing**

- **Sidebar / nav primária:** `MAIÚSCULAS` em uppercase letter-spaced (AGENDA, PACIENTES, WHATSAPP, EXERCÍCIOS, PROTOCOLOS).
- **Section headers / agrupadores de sidebar:** `MAIÚSCULAS` em cinza claro com tracking (ATENDIMENTO, CLÍNICA, INTELIGÊNCIA & IA, GESTÃO & OPERAÇÃO).
- **Títulos de página / cards:** `Title Case` em PT-BR ("Biblioteca de Exercícios", "Hub de Inteligência").
- **Body / descrições:** `Sentence case` ("Fortalecimento do reto abdominal com foco em flexão torácica.").
- **Badges de status:** `MAIÚSCULAS` curtas (CONSULTA, NOVO, PRO, VÍDEO, SEM VÍDEO).
- **Botões:** `Title Case` curto (`+ AGENDAR`, `+ Novo Exercício`, `📤 Upload Vídeo` → na prática, sem emoji: `Upload Vídeo`).

**Densidade**

- Headers de página combinam **título grande** + **subtítulo com contadores numéricos** ("351 exercícios · 211 com vídeo (60%) · 50 templates · 55 protocolos"). Números são informação.
- Listagens preferem **chips/badges enxutos** a parágrafos descritivos.

**Microcopy — exemplos reais**

- Pendência ativa: `5 pacientes sem retorno` (acompanhado de ícone de alerta âmbar)
- Status live: `● REAL-TIME ACTIVE` (verde)
- Empty state: `Nenhum paciente — Adicione o primeiro paciente para começar.`
- Confirmação destrutiva: `Excluir? Dados serão removidos permanentemente.`
- Toast de sucesso: `Sessão salva com sucesso`
- Toast de erro: `Erro ao salvar`
- Placeholder input: `Buscar paciente...` / `paciente@email.com`

**O que evitar**

- Exclamações ("Bem-vindo!", "Salvo!") — substituir por estados visuais.
- "Por favor" — desperdício de tokens; a interface é uma ferramenta de trabalho.
- Anglicismos desnecessários (`schedule` → `agendar`, `feedback` → `retorno`).
- Frases longas em botões — máximo 2 palavras quando possível.

---

## VISUAL FOUNDATIONS

### Filosofia visual

**Calma clínica + precisão de dados.** Fundo neutro frio (quase branco com 2% de azul), tipografia sans-serif limpa, blocos de cor sólida sem ornamento. O azul Activity (`#0080FF`) é **escasso e intencional**: aparece em CTAs primários, focus rings, e indicadores de "ativo/selecionado". O verde (teal `#10b981`) sinaliza "confirmado/ok". O sistema NUNCA usa gradientes decorativos em fundos largos — o único gradiente permitido é o `variant="medical"` do Button (sutil, vertical).

### Color vibe

- **Base:** neutros frios em escala HSL com matiz 220° (cinza azulado, não cinza puro).
- **Brand accent:** azul puro `211° 100% 50%` — saturado, mas usado em pequenas doses.
- **Domínio clínico:** mapa de dor (verde → amarelo → laranja → vermelho → vinho `#7f1d1d`), e status de agendamento (verde/âmbar/vermelho/azul).
- **Sem cores quentes em backgrounds.** Laranja/âmbar é exclusivamente para alertas e pendências.

### Type

- **Primary family:** `Nunito` — substituto aprovado pela marca para VAG Rounded (2026-05-12). **Totalmente self-hosted** (`fonts/Nunito-*.ttf`, pesos 200–900). Usada tanto em body quanto display, mantendo o caractere rounded do logotipo. Sem dependência de CDN.
- **Brand wordmark:** `VAG Rounded` usada apenas no SVG do logotipo Activity (não na UI digital).
- **Brand tagline:** `Futura Condensed Bold Oblique` (self-hosted em `fonts/futura-condensed-bold-oblique.otf`, token `--font-futura`) — exclusiva da tagline "FISIOTERAPIA" do lockup. Não usar na UI.
- **Numerais:** sempre tabulares em tabelas de horários, doses, KPIs. `font-variant-numeric: tabular-nums`.

### Spacing & layout

- **Escala:** padrões Tailwind (`4px → 8 → 12 → 16 → 24 → 32 → 48 → 64`). Cards usam padding `24px` (`p-6`); inputs `12px 16px`.
- **Layout shell:** sidebar fixa `240px` (web, com agrupadores em uppercase) + content area scrolável. Header de página com **título + contadores + barra de ações** alinhada à direita.
- **Densidade:** alta — uma sessão de fisio mostra 6 dias × 12 horários sem scroll lateral em viewport 1440px.

### Backgrounds

- **Sem imagens de fundo.** Sem padrões. Sem texturas. Sem ilustrações decorativas.
- **Fundo de página:** `hsl(210 20% 98%)` (light) / `hsl(222.2 47.4% 7%)` (dark).
- **Cards/surfaces:** branco puro (light) / azul-marinho `hsl(222.2 47.4% 9%)` (dark).
- **Imagens existem apenas onde funcionais:** thumbnails de exercícios (anatomia 3D realista, fundo branco neutro), avatares de paciente, screenshots de protocolos.

### Animação

- **Easing padrão:** `ease-out` para entradas, `ease-in-out` para loops.
- **Durações:** rapidíssimas — `200ms` (accordion), `300ms` (entrada), `400ms` (stagger). Nada acima de `500ms` em UI funcional.
- **Permitido:** fade + slide curto (4–8px), `pulse-subtle` em loaders, `pulse-ring` em indicadores live, `stagger-in` em listas.
- **Proibido:** bouncing exagerado, parallax, transições de página longas. `wiggle` e `bounce-subtle` são reservados para **gamificação** (mobile) e nunca aparecem em fluxos clínicos.

### Hover states

- **Botões primários:** escurecer 8% (`hover:bg-primary/90`).
- **Botões ghost / sidebar:** fundo `hsl(220 13% 95%)` (cinza claro).
- **Linhas de tabela:** fundo `hsl(220 14% 96%)`.
- **Cards clicáveis:** elevar de `shadow-none` para `shadow-md` + leve translação vertical `-translate-y-px`.

### Press states

- **Não usar shrink/scale.** O sistema é direto: o botão muda de cor (cor um nível mais escura) sem feedback de "press". Apenas em mobile (gamificação) há um leve `scale-95` em tap.

### Borders

- **Espessura:** `1px` em todo lugar. Nunca `2px` em borders estruturais (apenas em focus ring).
- **Cor:** `hsl(220 13% 91%)` — quase invisível, separa sem competir.
- **Focus ring:** `2px solid hsl(211 100% 50%)` com `outline-offset: 2px`.

### Inner/outer shadow system

- **Shadows aplicadas com moderação.** Cards padrão são **flat** (border-only). Shadow só aparece em:
  - Popovers / dropdowns: `0 10px 38px -10px rgba(22,23,24,0.35), 0 10px 20px -15px rgba(22,23,24,0.2)`
  - Dialog overlay: `0 20px 25px -5px rgba(0,0,0,0.1)`
  - Botão `glow` (variant `medical` ou `neon`): `0 0 0 4px rgba(0,128,255,0.15)`
- **Sem inner shadows.** O sistema não usa neumorfismo.

### Glassmorphism

- Disponível via `.glass-panel` (rgba branco 70% + blur 12px) e `.glass-card` (40% + blur 4px).
- **Uso restrito:** painéis flutuantes sobre conteúdo denso (ex: header da agenda em scroll). **Não** usar em formulários ou tabelas.

### Layout rules

- **Sidebar fixa** (`240px`, scroll independente). Logo no topo, agrupadores em uppercase, item ativo com fundo azul-claro `hsl(211 100% 96%)` + texto azul `hsl(211 100% 40%)` + borda esquerda azul `3px`.
- **Header de página fixo** (`64–72px`), com breadcrumbs/título à esquerda, ações primárias à direita.
- **Largura máxima de conteúdo:** sem cap — tabelas usam toda a largura disponível.

### Transparency / blur

- Quase nada usa transparência exceto:
  - Overlay de dialog: `bg-black/50 backdrop-blur-sm`
  - `.glass-panel` / `.glass-card` (ver acima)
  - Hover states sutis (`bg-primary/10`)

### Imagery vibe

- **Anatomia médica realista** (renders 3D, fundo branco) para biblioteca de exercícios. Cool, factual, sem estilização.
- **Avatares de paciente:** foto real circular OU fallback com iniciais sobre fundo azul claro.
- **Sem ilustrações decorativas.** Sem stock illustrations. Sem mascotes.

### Corner radii

- Sistema base **generoso**: `--radius: 16px`. Cards, modais, botões grandes → `16px`. Inputs/selects → `14px`. Badges/chips → `12px`. Avatars → `50%` (pill/círculo).
- Combinação produz um look **friendly clinical** — arredondado o suficiente para parecer humano, sem cair em "infantil".

### Cards

- **Default:** `border 1px var(--border) + background var(--card) + radius 16px + padding 24px`. Sem shadow.
- **Hover (clicável):** ganha `shadow-md` + `-translate-y-px`.
- **Premium variant** (`Button premium`): brilho sutil + borda gradient (raro, só em planos pagos).

---

## ICONOGRAPHY

**Sistema:** [`lucide-react`](https://lucide.dev) v1.x — biblioteca oficial. Linha única, stroke `2px`, cantos arredondados, geometria limpa. Combina com o radius generoso e o tom clínico-amigável da marca.

**Como usar**

- Tamanho padrão: `size-4` (16px) em buttons/menus; `size-5` (20px) em headers; `size-8` (32px) em empty states.
- Cor: herda `currentColor` do parent — usar `text-muted-foreground` para neutralidade, `text-primary` para destaque.
- Sempre par com **label de texto** — ícone-only só com `aria-label` explícito.

**Ícones de domínio usados** (extraídos das telas reais)

- `Calendar` / `CalendarDays` — Agenda
- `Users` / `UserPlus` — Pacientes
- `MessageCircle` — WhatsApp
- `Dumbbell` / `Activity` — Exercícios
- `FileText` / `ClipboardList` — Protocolos, Prontuário
- `FlaskConical` — Testes Clínicos
- `ClipboardCheck` — Avaliações
- `Camera` / `Video` — Biomecânica, vídeo
- `Sparkles` / `Brain` — IA Studio, Hub de Inteligência
- `CalendarClock` — Eventos
- `LayoutDashboard` — Boards
- `Database` — Cadastros
- `BookOpen` — Wiki Clínica
- `LogOut` — Sair
- `Search` — Buscar
- `Bell` — Notificações
- `Settings` — Configurações
- `MoreHorizontal` — Menu de ações em linha
- `Trash2` — Excluir
- `Plus` — Adicionar
- `AlertTriangle` — Alertas (pendências, dor)
- `Info` — Tooltips

**Carregamento via CDN** (para HTML estático fora do build): usamos `https://unpkg.com/lucide@latest` com `lucide.createIcons()`. Documentado em `ui_kits/web/index.html`.

**Brand mark — ícone do produto**

- O **runner azul** isolado (sem wordmark) é o "favicon"/sigla do produto. Disponível em `assets/activity-logo.svg`. Pode aparecer sozinho em splash screens, app icon, favicon.

**Emoji**

- **Nunca** na UI funcional. **Permitido** apenas em READMEs e documentação técnica (🏥, 🚀, 🛠).

**Unicode chars**

- `·` separadores em meta-info (`351 exercícios · 211 com vídeo`)
- `→` em CTAs textuais raros
- `●` indicador de status live (sempre acompanhado de texto)
- Setas Unicode evitadas — preferir `ChevronRight` lucide.

**Substituições e flags**

- **Logo PNG raster** (`assets/activity-logo.png`) deve ser preferido apenas em contextos onde SVG não funciona (impressão, e-mail). UI digital sempre usa SVG.
- A **fonte Futura Condensed Bold Oblique** do wordmark "FISIOTERAPIA" está self-hosted em `fonts/futura-condensed-bold-oblique.otf` e exposta via token `--font-futura`. Uso restrito ao lockup da marca.
- **VAG Rounded** (logo "Activity") está em `fonts/vag-rounded.otf`.

---

## CAVEATS

1. **Repo monorepo é majoritariamente stub** — o repo `rafaelminatto1/fisioflow-51658291` tem `DESIGN_SYSTEM.md` rico, mas os diretórios `apps/web/src/components/` e `apps/patient-app/components/` estavam quase vazios na inspeção. Os componentes UI foram reconstruídos a partir do `DESIGN_SYSTEM.md` (que é detalhado) cruzado com os screenshots reais do produto em produção.
2. **Discrepância de cor primária nos screenshots** — o screenshot da agenda mostra um botão `+ AGENDAR` em **roxo**, não no azul Activity definido como `--primary`. Tratamos como override pontual ou A/B test; o sistema canônico permanece azul `#0080FF`. Vale confirmar.
3. **Sidebar do screenshot usa "FisioFlow" (não Activity)** — o app real é white-labeled como "FisioFlow" com sub-label "MOOCA FISIO". Mantivemos os dois lockups no kit (Activity logo + FisioFlow wordmark).
