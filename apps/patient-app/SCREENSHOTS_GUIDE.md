# Guia de Screenshots - FisioFlow Patient App

## Especificações Técnicas

### iPhone (Requisitos)
| Dispositivo | Tamanho | Formato |
|-------------|---------|---------|
| iPhone 14/15 Pro Max (6.7") | 1290 x 2796 px | PNG ou JPEG |
| iPhone 14/15 Pro (6.1") | 1179 x 2556 px | PNG ou JPEG |
| iPhone SE (3ª geração) | 1210 x 2692 px | PNG ou JPEG |

**Mínimo obrigatório**: 3 screenshots por dispositivo
**Recomendado**: 6 screenshots por dispositivo

### iPad (Opcional)
| Dispositivo | Tamanho | Formato |
|-------------|---------|---------|
| iPad Pro 12.9" | 2048 x 2732 px | PNG ou JPEG |
| iPad Pro 11" | 2388 x 1668 px | PNG ou JPEG |

## Screenshots Sugeridos

### 1. Dashboard (Tela Inicial)
**Mostra**: Visão geral do app
- Saudação personalizada
- Exercícios de hoje (preview)
- Cards de estatísticas
- Próxima consulta em destaque

**Texto**: "Acompanhe seu progresso diariamente"

### 2. Exercícios
**Mostra**: Lista de exercícios com vídeos
- Exercícios do plano atual
- Checkbox para marcar conclusão
- Botão de vídeo
- Progress bar

**Texto**: "Exercícios com vídeos demonstrativos"

### 3. Player de Vídeo
**Mostra**: Modal de vídeo reproduzindo
- Video player com controles
- Velocidade de playback
- Descrição do exercício

**Texto**: "Veja como executar cada exercício corretamente"

### 4. Consultas
**Mostra**: Lista de agendamentos
- Próximas consultas
- Consultas anteriores
- Badges de status coloridos
- Detalhes (data, horário, tipo)

**Texto**: "Gerencie suas consultas facilmente"

### 5. Progresso/Evoluções
**Mostra**: Gráfico de evolução
- Gráfico de nível de dor
- Timeline de evoluções SOAP
- Estatísticas (sessões, dias, melhora)
- Filtro de período

**Texto**: "Visualize sua evolução ao longo do tempo"

### 6. Perfil e Configurações
**Mostra**: Tela de perfil
- Avatar e dados do usuário
- Configurações de notificação
- Menu de opções
- Botão de logout

**Texto**: "Personalize sua experiência"

## Ferramentas para Captura

### iPhone Simulator + Xcode
```bash
# 1. Abra o app no simulator
xcrun simctl boot iPhone_15_Pro_Max

# 2. Execute o app
npm start

# 3. Capture usando Xcode
# Xcode > File > New Screen Shot
```

### Expo Simulator Screenshots
```bash
# Pressione: Cmd + Shift + 4
# Selecione a área do simulator
```

### Dispositivo Físico
```bash
# Pressione: Power + Volume Up
# Ou: Power + Home (modelos antigos)
```

### Screely (mockups)
- Site: https://www.screely.com/
- Cria mockups bonitos automaticamente

## Templates de Design

### Cores do App
- **Primary**: #22c55e (verde saúde)
- **Secondary**: #3b82f6 (azul info)
- **Background**: #FFFFFF / #0D0D0D (dark)
- **Text**: #0D0D0D / #FFFFFF (dark)
- **Success**: #22c55e
- **Warning**: #f59e0b
- **Error**: #EF4444

### Elementos a incluir em cada screenshot
1. ✅ Status bar realista (hora, bateria, sinal)
2. ✅ Home indicator
3. ✅ Indicadores de Tabs na parte inferior
4. ✅ Conteúdo relevante para a funcionalidade
5. ❌ Sem watermarks
6. ❌ Sem números de versão
7. ❌ Sem indicadores de debug

## Checklist de Qualidade

### Antes de salvar:
- [ ] Resolução correta para o dispositivo
- [ ] Formato PNG (para qualidade)
- [ ] Sem artefatos de compressão
- [ ] Texto legível
- [ ] Cores vibrantes e precisas
- [ ] Interface limpa e organizada

### Validação:
- [ ] Testar em iPhone 14/15 Pro Max (1290x2796)
- [ ] Testar em iPhone SE (1210x2692)
- [ ] Verificar que não há informações sensíveis
- [ ] Confirmar que o app está atualizado

## Ferramenta Automatizada (Expo)

```bash
# Instalar expo-screenshots
npm install -D expo-screenshots

# Configurar no app.json
{
  "expo": {
    "plugins": [
      [
        "expo-screenshots",
        {
          "apple": {
            "iPhone": [
              "1290x2796",
              "1179x2556"
            ]
          }
        }
      ]
    ]
  }
}

# Executar captura automatizada
npx expo-screenshots
```

## Dicas de Design

### Composição:
1. **Foco no conteúdo**: Mostre a funcionalidade principal
2. **Espaço em branco**: Não sobrecarregue o visual
3. **Hierarquia**: Elementos mais importantes maiores
4. **Consistência**: Mantenha estilo em todos os screenshots

### Texto sobreposto (opcional):
- Use fontes limpas e legíveis
- Contraste suficiente com o background
- Máximo de 2-3 linhas de texto
- Português claro e direto

### Exemplo de textos para sobrepor:
1. "Seus exercícios, onde estiver"
2. "Acompanhe sua recuperação"
3. "Nunca perca uma consulta"
4. "Vídeos para cada exercício"
5. "Progresso visual e motivador"

## Armazenamento e Organização

### Estrutura sugerida:
```
screenshots/
├── iphone-6-7/
│   ├── 1-dashboard.png
│   ├── 2-exercises.png
│   ├── 3-video-player.png
│   ├── 4-appointments.png
│   ├── 5-progress.png
│   └── 6-profile.png
└── iphone-se/
    ├── 1-dashboard.png
    ├── 2-exercises.png
    └── ...
```

## Processo de Validação na App Store

1. **Upload via App Store Connect**
   - App Information > Screenshots
   - Arraste os arquivos para o dispositivo correto
   - Aguarde processamento

2. **Pré-visualização**
   - Verifique como aparecem na loja
   - Teste em diferentes dispositivos
   - Ajuste se necessário

3. **Aprovação**
   - Screenshots são revisados junto com o app
   - Rejeições comuns: texto inadequado, informações enganosas

## Problemas Comuns e Soluções

### Screenshot escuro/claro incorreto
**Solução**: Capture com o tema correto ativado

### Texto ilegível
**Solução**: Aumente o tamanho da fonte ou simplifique o conteúdo

### Resolução incorreta
**Solução**: Use ferramenta online para redimensionar

### Bordas pretas
**Solução**: Crop para excluir áreas fora da tela

## Recursos Adicionais

- **Apple Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/app-store/
- **Expo Screenshots Plugin**: https://docs.expo.dev/versions/latest/sdk/screenshots/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

---

**Última atualização**: Fevereiro de 2026
