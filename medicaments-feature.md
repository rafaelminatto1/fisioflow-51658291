# Módulo de Medicamentos

## Goal
Implementar o módulo de medicamentos integrando o Dicionário de Clínica com a interface de Anamnese, suportando geração automática de dados farmacológicos por IA.

## Tasks
- [ ] Task 1: Adicionar a categoria `medicament` no array `CATEGORIES` de `src/features/wiki/components/PhysioDictionaryView.tsx` e garantir suporte no banco (se restrito) → Verify: Categoria "Medicamentos" aparece no Dicionário.
- [ ] Task 2: Modificar `src/features/wiki/components/DictionaryTermModal.tsx` para incluir um botão "✨ Gerar com IA" quando a categoria for `medicament` → Verify: Botão é renderizado ao selecionar categoria Medicamentos.
- [ ] Task 3: Criar serviço/endpoint na API (`generateMedicationInfo`) para buscar resumo e efeitos colaterais com IA → Verify: Endpoint retorna JSON com `summary` e `sideEffects`.
- [ ] Task 4: Integrar a chamada da IA no botão do `DictionaryTermModal` para preencher os campos automaticamente → Verify: Clicar no botão preenche os campos "Resumo" (pt) e "Efeitos" (en).
- [ ] Task 5: Criar o componente `MedicationsSection.tsx` com ComboBox para buscar no Dicionário (filtrado por `medicament`) → Verify: Componente renderiza campo de busca e encontra termos.
- [ ] Task 6: Implementar suporte a Dosagem/Frequência e salvar novo medicamento "on-the-fly" no `MedicationsSection` caso não exista → Verify: Medicamento não cadastrado é salvo automaticamente ao ser adicionado.
- [ ] Task 7: Integrar `MedicationsSection` na página/fluxo de Anamnese (`src/pages/AvaliacaoInicial.tsx` ou formulário dinâmico) → Verify: Seção aparece na Anamnese e medicamentos selecionados compõem o payload final.

## Done When
- [ ] É possível cadastrar um medicamento via Dicionário usando a IA para gerar resumo e efeitos colaterais.
- [ ] É possível adicionar medicamentos durante a Anamnese, buscando do Dicionário ou criando novos na hora.
- [ ] Testes básicos de interface funcionam sem erros.
