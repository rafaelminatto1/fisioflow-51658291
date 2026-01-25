#!/bin/bash
# Script para criar coleções no Firebase Firestore usando REST API
# O Firestore cria coleções automaticamente quando adicionamos documentos

set -e

# Configurações
PROJECT_ID="fisioflow-migration"
DATABASE="(default)"
BASE_URL="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/$DATABASE/documents"

# Obter o token de autenticação
echo "🔐 Obtendo token de autenticação..."
TOKEN=$(firebase login:ci 2>&1 | grep -o 'Access.*' || gcloud auth print-access-token)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "Access" ]; then
    echo "❌ Não foi possível obter o token. Tentando usar gcloud..."
    TOKEN=$(gcloud auth print-access-token 2>/dev/null || true)
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Erro: Não foi possível autenticar. Execute: firebase login"
    exit 1
fi

echo "✅ Token obtido"
echo ""

# Função para criar um documento
create_doc() {
    local collection=$1
    local doc_id=$2
    local data=$3

    echo "📝 Criando documento $collection/$doc_id..."

    curl -s -X PATCH \
        "$BASE_URL/$collection/$doc_id?access_token=$TOKEN" \
        -H "Content-Type: application/json" \
        -d "$data" \
        > /dev/null

    if [ $? -eq 0 ]; then
        echo "✅ $collection/$doc_id criado"
    else
        echo "❌ Erro ao criar $collection/$doc_id"
    fi
}

echo "🔥 Criando coleções do Firebase Firestore..."
echo ""

# Coleções críticas para "Iniciar Atendimento"
create_doc "patients" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Dados dos pacientes"}}}'
create_doc "appointments" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Agendamentos"}}}'
create_doc "soap_records" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Registros SOAP"}}}'
create_doc "treatment_sessions" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Sessões de tratamento"}}}'
create_doc "patient_goals" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Objetivos dos pacientes"}}}'
create_doc "patient_surgeries" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Cirurgias dos pacientes"}}}'
create_doc "patient_pathologies" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Patologias dos pacientes"}}}'
create_doc "evolution_measurements" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Medições de evolução"}}}'

# Gamificação
create_doc "patient_gamification" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Perfis de gamificação"}}}'
create_doc "daily_quests" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Missões diárias"}}}'
create_doc "achievements" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Conquistas disponíveis"}}}'
create_doc "achievements_log" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Conquistas desbloqueadas"}}}'
create_doc "xp_transactions" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Transações de XP"}}}'
create_doc "shop_items" "_init" '{"fields": {"_init": {"booleanValue": true}, "is_active": {"booleanValue": true}, "cost": {"integerValue": 0}, "name": {"stringValue": "_init"}}}'
create_doc "user_inventory" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Inventário dos usuários"}}}'

# Outras coleções importantes
create_doc "eventos" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Eventos financeiros"}}}'
create_doc "medical_records" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Prontuários médicos"}}}'
create_doc "prescribed_exercises" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Exercícios prescritos"}}}'
create_doc "notifications" "_init" '{"fields": {"_init": {"booleanValue": true}, "description": {"stringValue": "Notificações"}}}'

echo ""
echo "✅ Coleções criadas!"
echo ""
echo "⚠️  Para limpar os documentos _init depois, use:"
echo "   firebase firestore:delete --project $PROJECT_ID patients/_init"
