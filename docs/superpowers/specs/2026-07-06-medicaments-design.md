# Módulo de Medicamentos

## Visão Geral
Adição de um sistema de controle farmacológico integrado à anamnese clínica e ao dicionário da plataforma.

## Objetivos
1. Permitir que o fisioterapeuta adicione medicamentos na avaliação do paciente.
2. Centralizar os dados dos medicamentos (Resumo e Efeitos Colaterais) no Dicionário da clínica.
3. Automatizar a extração e preenchimento de resumos usando IA, tanto no Dicionário quanto na criação "on-the-fly".

## Componentes

### 1. Dicionário de Medicamentos
- **Nova Categoria:** Adicionar `medicament` às categorias no `PhysioDictionaryView`.
- **Campos Estendidos:**
  - O Dicionário existente já possui `descriptionPt` e `descriptionEn`.
  - Serão utilizados para "Resumo" (`descriptionPt`) e "Efeitos Colaterais" (`descriptionEn`), ou adicionaremos campos específicos no payload do DB caso exista uma estrutura de metadata.
- **Integração com IA:**
  - No `DictionaryTermModal`, adicionar um botão "Gerar com IA" que consuma um endpoint de IA (ex: `/api/ai/generate-medication-info`) para gerar o resumo e efeitos colaterais.

### 2. Seção na Anamnese
- **Novo Componente:** `MedicationsSection` que será inserido na tela de avaliação/anamnese.
- **Funcionamento:**
  - Campo de busca (Autocomplete/Combobox) que consome os termos do dicionário filtrando por `category: 'medicament'`.
  - Ao selecionar um medicamento, os dados (Resumo, Efeitos Colaterais) são apresentados num Card.
  - Campos adicionais (opcionais): "Dosagem" e "Frequência".
  - Se o usuário digitar um nome inexistente e confirmar, o componente deve acionar a criação do termo no Dicionário (em background) e, idealmente, acionar a geração via IA para já enriquecer o banco de dados.

## Modelagem de Dados
- **Avaliação (Patient Evaluation):**
  - O JSON da anamnese precisa suportar o array `medications`:
    ```json
    {
      "medications": [
        {
          "dictionaryTermId": "uuid",
          "name": "Xarelto",
          "dosage": "15mg",
          "frequency": "1x ao dia"
        }
      ]
    }
    ```
- **Dicionário (DictionaryTerm):**
  - Categoria: `medicament`
  - `pt`: Nome do medicamento
  - `descriptionPt`: Resumo / Indicação
  - `descriptionEn`: Efeitos Colaterais (ou uso de um campo de metadata mais apropriado se existir).

## Próximos Passos (Plano de Implementação)
1. Ajustar Categorias no `PhysioDictionaryView` e no Backend (se for um Enum restrito).
2. Modificar o Modal do Dicionário para suportar o layout de medicamentos e o botão de Geração por IA.
3. Criar o endpoint de IA (ou função de servidor) para retornar o resumo farmacológico.
4. Criar o componente `MedicationsSection` e integrá-lo no formulário de Anamnese.
5. Garantir o salvamento "on-the-fly" no Dicionário caso o medicamento não exista.
