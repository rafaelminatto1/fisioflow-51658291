# Rebranding: Configurações da Agenda

## 1. O Problema Atual
O layout atual das configurações da agenda está confuso. Segundo o usuário:
- Cards muito grandes para conteúdos pequenos (desperdício de espaço, sensação de "vazio").
- Mal distribuído (provavelmente a navegação vs conteúdo está desbalanceada).
- Necessidade de um "rebranding", ou seja, uma nova identidade visual, mais moderna, premium e memorável.

## 2. Deep Design Thinking (Anti-Safe Harbor)

### Context Analysis
- **Setor:** Saúde / Clínica de Fisioterapia (FisioFlow).
- **Emoção Desejada:** Confiança, Eficiência, Premium, Organização.
- **O que evitar:** O "Safe Split" (sidebar na esquerda com 25% e conteúdo na direita com 75%), Bento Grids genéricos, Glassmorphism sem bordas sólidas, "Blue Trap" (azul genérico de SaaS).

### Topological Hypothesis (O que faremos diferente)
Ao invés do tradicional "Settings Sidebar", podemos usar:
- **Asymmetric Tension (90/10) ou Minimalismo Tipográfico:** Reduzir drásticamente os containeres. Remover os "cards grandes" e adotar um layout "borderless" (sem caixas), onde as seções são separadas puramente por tipografia massiva e linhas finas (hairlines).
- **Navigation:** Mudar a navegação de abas (tabs) ou sidebar para um "Sticky Header" minimalista ou um índice fixo ultra-compacto com "Scroll Spy", tornando a rolagem fluida como um documento contínuo (Continuous Stream).

### Design Commitment
- **Estilo Radical:** Swiss Punk Minimalista (Brutalismo Funcional focado em Tipografia).
- **Topological Choice:** Romper as "caixas". Em vez de colocar opções dentro de `SectionCard` com bordas e sombras gigantes, remover os cards. Os controles (switches, selects) flutuam num espaço negativo com tipografia forte definindo a hierarquia.
- **Risco:** Ausência de cards tradicionais pode desafiar quem está acostumado com SaaS padrão, mas traz um visual absurdamente limpo e focado no conteúdo (reduz a poluição visual).
- **Cores/Geometria:** Fim do "rounded-md" genérico. Usaremos bordas agudas (sharp) ou pílulas extremas apenas nos controles, num fundo de alto contraste (off-white limpo com tipografia muito escura, almost black).

## 3. Perguntas Socráticas para o Usuário
1. Sobre a remoção de "caixas": O que acha de removermos totalmente o conceito de "cards com borda" e adotarmos um layout limpo, focado puramente em tipografia e linhas finas (estilo documento premium), para resolver a sensação de "espaço vazio"?
2. Sobre a navegação: Prefere que as opções fiquem todas em uma página única de rolagem fluida (com um menu rápido grudado no topo/lateral) em vez de precisar clicar em abas separadas?
3. Há alguma preferência radical de cor de destaque para este novo painel, fugindo do azul padrão? (ex: Verde Ácido, Laranja Sinal, ou Preto e Branco puro?)
