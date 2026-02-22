# 🧪 Guia de Testes - App Mobile Profissional

## Data: 2026-02-21

---

## 📋 Funcionalidades para Testar

### 1. Sistema de Evoluções SOAP

#### Criar Evolução:
1. Abrir app e fazer login
2. Ir para Dashboard
3. Clicar em um agendamento
4. Clicar em "Iniciar Atendimento"
5. Preencher campos SOAP:
   - Subjetivo: "Paciente relata dor moderada"
   - Objetivo: "Amplitude de movimento reduzida"
   - Avaliação: "Melhora de 30% desde última sessão"
   - Plano: "Continuar exercícios de fortalecimento"
6. Ajustar nível de dor (ex: 5)
7. Adicionar 2-3 fotos (câmera ou galeria)
8. Clicar em "Salvar Evolução"
9. ✅ Verificar mensagem de sucesso
10. ✅ Verificar retorno para página anterior

#### Visualizar Lista de Evoluções:
1. Abrir perfil de um paciente
2. Ir para tab "Evoluções"
3. ✅ Verificar últimas 3 evoluções exibidas
4. ✅ Verificar badges de dor e anexos
5. Clicar em "Ver Todas as Evoluções"
6. ✅ Verificar gráfico de evolução da dor
7. ✅ Verificar todas as evoluções listadas
8. Pull-to-refresh
9. ✅ Verificar atualização da lista

#### Visualizar Detalhes:
1. Na lista, clicar em uma evolução
2. ✅ Verificar todos os campos SOAP exibidos
3. ✅ Verificar nível de dor
4. ✅ Verificar fotos (se houver)
5. ✅ Verificar data formatada em português

#### Editar Evolução:
1. Nos detalhes, clicar no ícone de editar
2. Modificar campo Subjetivo
3. Alterar nível de dor
4. Adicionar mais uma foto
5. Clicar em "Salvar Alterações"
6. ✅ Verificar mensagem de sucesso
7. ✅ Verificar alterações salvas

#### Excluir Evolução:
1. Nos detalhes, clicar em editar
2. Rolar até o final
3. Clicar em "Excluir Evolução"
4. ✅ Verificar confirmação
5. Confirmar exclusão
6. ✅ Verificar mensagem de sucesso
7. ✅ Verificar retorno para lista

---

### 2. Upload de Fotos

#### Tirar Foto com Câmera:
1. No formulário de evolução
2. Clicar em "Tirar Foto"
3. ✅ Verificar solicitação de permissão (primeira vez)
4. Tirar foto
5. Editar/crop (opcional)
6. Confirmar
7. ✅ Verificar preview da foto
8. ✅ Verificar contador (1/6)

#### Selecionar da Galeria:
1. Clicar em "Galeria"
2. ✅ Verificar solicitação de permissão (primeira vez)
3. Selecionar 2-3 fotos
4. ✅ Verificar todas as fotos no preview
5. ✅ Verificar contador atualizado (3/6 ou 4/6)

#### Remover Foto:
1. Clicar no X em uma foto
2. ✅ Verificar confirmação
3. Confirmar remoção
4. ✅ Verificar foto removida
5. ✅ Verificar contador atualizado

#### Limite de Fotos:
1. Adicionar 6 fotos
2. ✅ Verificar botões de adicionar desabilitados
3. ✅ Verificar contador (6/6)
4. Tentar adicionar mais uma
5. ✅ Verificar mensagem de limite atingido

---

### 3. Protocolos de Tratamento

#### Visualizar Lista:
1. Abrir menu de perfil
2. Clicar em "Protocolos de Tratamento"
3. ✅ Verificar 3 protocolos mock exibidos
4. ✅ Verificar badges de template
5. ✅ Verificar contador de exercícios
6. ✅ Verificar categorias

#### Buscar Protocolo:
1. Na lista, digitar "joelho" na busca
2. ✅ Verificar filtro funcionando
3. ✅ Verificar apenas "Reabilitação de Joelho" exibido
4. Limpar busca (X)
5. ✅ Verificar todos os protocolos voltam

#### Filtrar por Categoria:
1. Clicar em chip "Ortopedia"
2. ✅ Verificar filtro aplicado
3. ✅ Verificar apenas protocolos de Ortopedia
4. Clicar em "Todos"
5. ✅ Verificar todos os protocolos voltam

#### Criar Protocolo:
1. Clicar no botão "+"
2. Preencher nome: "Teste Protocolo"
3. Preencher descrição
4. Selecionar categoria: "Coluna"
5. Preencher condição: "Teste"
6. ✅ Verificar checkbox "Salvar como template" marcado
7. Clicar em "Adicionar" exercício
8. ✅ Verificar navegação para exercícios (mock)
9. ✅ Verificar validação (não salva sem exercícios)
10. Voltar e adicionar exercício mock
11. Clicar em "Criar Protocolo"
12. ✅ Verificar mensagem de sucesso (mock)

---

## 🐛 Casos de Teste de Erro

### Validações:

#### Evolução sem Conteúdo:
1. Abrir formulário de evolução
2. Não preencher nenhum campo
3. Clicar em "Salvar"
4. ✅ Verificar mensagem de erro
5. ✅ Verificar feedback háptico de erro

#### Protocolo sem Nome:
1. Abrir formulário de protocolo
2. Deixar nome vazio
3. Selecionar categoria
4. Clicar em "Criar"
5. ✅ Verificar mensagem de erro

#### Protocolo sem Categoria:
1. Preencher nome
2. Não selecionar categoria
3. Clicar em "Criar"
4. ✅ Verificar mensagem de erro

#### Protocolo sem Exercícios:
1. Preencher nome e categoria
2. Não adicionar exercícios
3. ✅ Verificar botão "Criar" desabilitado

---

## 📱 Testes de Dispositivo

### iOS:
- [ ] iPhone 12 ou superior
- [ ] iOS 15 ou superior
- [ ] Testar câmera
- [ ] Testar galeria
- [ ] Testar feedback háptico
- [ ] Testar tema claro/escuro

### Android:
- [ ] Android 10 ou superior
- [ ] Testar câmera
- [ ] Testar galeria
- [ ] Testar feedback háptico
- [ ] Testar tema claro/escuro

---

## 🎨 Testes de UI/UX

### Tema Claro:
1. Configurar dispositivo para tema claro
2. ✅ Verificar todas as cores corretas
3. ✅ Verificar contraste adequado
4. ✅ Verificar legibilidade

### Tema Escuro:
1. Configurar dispositivo para tema escuro
2. ✅ Verificar todas as cores corretas
3. ✅ Verificar contraste adequado
4. ✅ Verificar legibilidade

### Feedback Háptico:
1. Testar todos os botões
2. ✅ Verificar vibração leve em toques
3. ✅ Verificar vibração média em ações
4. ✅ Verificar vibração de sucesso
5. ✅ Verificar vibração de erro

### Loading States:
1. Testar salvamento de evolução
2. ✅ Verificar spinner durante salvamento
3. ✅ Verificar botão desabilitado
4. Testar pull-to-refresh
5. ✅ Verificar indicador de refresh

---

## 🔄 Testes de Navegação

### Fluxo Completo de Evolução:
1. Dashboard → Agendamento → Iniciar Atendimento
2. Formulário → Salvar → Lista
3. Lista → Detalhes → Editar
4. Editar → Salvar → Detalhes
5. Detalhes → Voltar → Lista
6. Lista → Voltar → Perfil Paciente
7. ✅ Verificar navegação fluida
8. ✅ Verificar dados persistidos

### Fluxo de Protocolos:
1. Perfil → Protocolos → Lista
2. Lista → Criar → Formulário
3. Formulário → Voltar → Lista
4. Lista → Detalhes (mock)
5. ✅ Verificar navegação fluida

---

## 📊 Testes de Performance

### Scroll Performance:
1. Lista com 20+ evoluções
2. ✅ Verificar scroll suave
3. ✅ Verificar sem lag

### Imagens:
1. Evolução com 6 fotos
2. ✅ Verificar carregamento rápido
3. ✅ Verificar preview suave

### Gráfico:
1. Lista de evoluções
2. ✅ Verificar gráfico renderiza rápido
3. ✅ Verificar animação suave

---

## ✅ Checklist de Aceitação

### Evoluções:
- [ ] Criar evolução funciona
- [ ] Visualizar lista funciona
- [ ] Ver detalhes funciona
- [ ] Editar funciona
- [ ] Excluir funciona
- [ ] Gráfico exibe corretamente
- [ ] Fotos funcionam
- [ ] Validações funcionam
- [ ] Navegação fluida
- [ ] Feedback adequado

### Upload de Fotos:
- [ ] Câmera funciona
- [ ] Galeria funciona
- [ ] Preview funciona
- [ ] Remover funciona
- [ ] Limite funciona
- [ ] Permissões funcionam
- [ ] Compressão funciona

### Protocolos:
- [ ] Lista exibe corretamente
- [ ] Busca funciona
- [ ] Filtros funcionam
- [ ] Formulário funciona
- [ ] Validações funcionam
- [ ] Mock data exibe
- [ ] Navegação fluida

---

## 🐛 Bugs Conhecidos

### Nenhum bug crítico identificado ✅

### Melhorias Futuras:
- Upload real para Firebase Storage
- Backend de protocolos
- Modo offline
- Notificações push

---

## 📝 Relatório de Testes

### Template:

```
Data: ___/___/___
Testador: ___________
Dispositivo: ___________
OS: ___________

Funcionalidade: ___________
Status: [ ] Passou [ ] Falhou
Observações: ___________

Bugs Encontrados:
1. ___________
2. ___________

Sugestões:
1. ___________
2. ___________
```

---

## 🎯 Critérios de Sucesso

### Mínimo para Produção:
- ✅ 0 crashes
- ✅ 0 erros críticos
- ✅ Todas as validações funcionando
- ✅ Navegação fluida
- ✅ Feedback adequado
- ✅ Performance aceitável

### Ideal:
- ✅ Todos os testes passando
- ✅ UX consistente
- ✅ Performance excelente
- ✅ Sem bugs conhecidos
- ✅ Documentação completa

---

**Status**: ✅ PRONTO PARA TESTES
**Próximo passo**: Executar testes e coletar feedback
