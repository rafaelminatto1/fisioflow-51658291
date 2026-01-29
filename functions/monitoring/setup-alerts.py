#!/usr/bin/env python3
"""
Setup Cloud Monitoring Alert Policies for FisioFlow
Usa a API do Google Cloud Monitoring diretamente
"""

import json
import sys

try:
    from google.cloud import monitoring_v3
    from google.cloud.monitoring_v3 import AlertPolicy, NotificationChannel
    from google.protobuf import duration_pb2
    from google.cloud.monitoring_dashboard_v1 import DashboardsServiceClient
except ImportError:
    print("Instalando bibliotecas necessárias...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-cloud-monitoring", "google-cloud-monitoring-dashboards"])
    from google.cloud import monitoring_v3
    from google.cloud.monitoring_dashboard_v1 import DashboardsServiceClient

PROJECT_ID = "fisioflow-migration"
PROJECT_NAME = f"projects/{PROJECT_ID}"


def create_error_rate_alert():
    """Cria alerta de alta taxa de erro"""
    client = monitoring_v3.AlertPolicyServiceClient()

    alert_policy = {
        "display_name": "Alta Taxa de Erro - Cloud Functions",
        "documentation": {
            "content": "A taxa de erro das Cloud Functions está acima de 5%. Verifique os logs.",
            "mime_type": "text/markdown"
        },
        "conditions": [
            {
                "display_name": "High Error Rate",
                "condition_threshold": {
                    "filter": 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_count" metric.labels."execution_status"="execution_status"',
                    "comparison": "COMPARISON_GT",
                    "threshold_value": 0.05,
                    "duration": {"seconds": 300},
                    "aggregations": [
                        {
                            "alignment_period": {"seconds": 300},
                            "per_series_aligner": "ALIGN_FRACTION_TRUE",
                            "cross_series_reducer": "REDUCE_MEAN"
                        }
                    ]
                }
            }
        ],
        "enabled": True,
        "severity": "WARNING",
        "combiner": "OR"
    }

    try:
        response = client.create_alert_policy(
            request={"name": PROJECT_NAME, "alert_policy": alert_policy}
        )
        print(f"✅ Alerta de taxa de erro criado: {response.name}")
        return response
    except Exception as e:
        print(f"⚠️  Erro ao criar alerta de taxa de erro: {e}")
        return None


def create_latency_alert():
    """Cria alerta de alta latência"""
    client = monitoring_v3.AlertPolicyServiceClient()

    alert_policy = {
        "display_name": "Alta Latência - Cloud Functions",
        "documentation": {
            "content": "O tempo de execução das Cloud Functions está acima de 10 segundos (p99).",
            "mime_type": "text/markdown"
        },
        "conditions": [
            {
                "display_name": "High Latency",
                "condition_threshold": {
                    "filter": 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_times"',
                    "comparison": "COMPARISON_GT",
                    "threshold_value": 10000,
                    "duration": {"seconds": 300},
                    "aggregations": [
                        {
                            "alignment_period": {"seconds": 300},
                            "per_series_aligner": "ALIGN_PERCENTILE_99"
                        }
                    ]
                }
            }
        ],
        "enabled": True,
        "severity": "WARNING",
        "combiner": "OR"
    }

    try:
        response = client.create_alert_policy(
            request={"name": PROJECT_NAME, "alert_policy": alert_policy}
        )
        print(f"✅ Alerta de latência criado: {response.name}")
        return response
    except Exception as e:
        print(f"⚠️  Erro ao criar alerta de latência: {e}")
        return None


def create_quota_alert():
    """Cria alerta de quota excedida"""
    client = monitoring_v3.AlertPolicyServiceClient()

    alert_policy = {
        "display_name": "Quota Excedida - Cloud Functions",
        "documentation": {
            "content": "A quota de Cloud Functions foi excedida. Considere aumentar a quota.",
            "mime_type": "text/markdown"
        },
        "conditions": [
            {
                "display_name": "Quota Exceeded",
                "condition_threshold": {
                    "filter": 'resource.type="cloud_function" metric.type="cloudfunctions.googleapis.com/function/execution_count" metric.labels."response_code"="429"',
                    "comparison": "COMPARISON_GT",
                    "threshold_value": 0,
                    "duration": {"seconds": 60},
                    "aggregations": [
                        {
                            "alignment_period": {"seconds": 60},
                            "per_series_aligner": "ALIGN_COUNT"
                        }
                    ]
                }
            }
        ],
        "enabled": True,
        "severity": "CRITICAL",
        "combiner": "OR",
        "alert_strategy": {
            "auto_close": {"seconds": 1800}
        }
    }

    try:
        response = client.create_alert_policy(
            request={"name": PROJECT_NAME, "alert_policy": alert_policy}
        )
        print(f"✅ Alerta de quota criado: {response.name}")
        return response
    except Exception as e:
        print(f"⚠️  Erro ao criar alerta de quota: {e}")
        return None


def list_existing_policies():
    """Lista políticas existentes"""
    client = monitoring_v3.AlertPolicyServiceClient()

    try:
        policies = client.list_alert_policy(request={"name": PROJECT_NAME})
        print(f"\n📋 Políticas de alerta existentes ({len(policies)}):")
        for policy in policies:
            print(f"  - {policy.display_name} ({policy.name})")
            print(f"    Severity: {policy.severity}, Enabled: {policy.enabled}")
        return list(policies)
    except Exception as e:
        print(f"⚠️  Erro ao listar políticas: {e}")
        return []


def main():
    print("=" * 50)
    print("  FisioFlow - Setup de Monitoramento")
    print("=" * 50)
    print()

    # Listar políticas existentes
    existing = list_existing_policies()

    if len(existing) >= 3:
        print("\n✅ As políticas de alerta já estão configuradas!")
        return

    print("\n🔧 Criando políticas de alerta...")

    # Criar alertas
    create_error_rate_alert()
    create_latency_alert()
    create_quota_alert()

    print("\n" + "=" * 50)
    print("✅ Setup concluído!")
    print("=" * 50)
    print("\n📊 Dashboard disponível em:")
    print("   https://console.cloud.google.com/monitoring?project=fisioflow-migration")
    print("\n🔔 Alertas disponíveis em:")
    print("   https://console.cloud.google.com/monitoring/alerting?project=fisioflow-migration")


if __name__ == "__main__":
    main()
