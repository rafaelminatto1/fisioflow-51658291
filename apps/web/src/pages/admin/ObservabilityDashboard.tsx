import React, { useEffect, useState } from "react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// Assuming generic UI components exist or using standard HTML for mockup

export default function ObservabilityDashboard() {
  const [costData, setCostData] = useState<any>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulando fetch aos endpoints criados
    Promise.all([
      fetch("/api/admin/observability/ai-cost", { headers: { "x-organization-id": "org-1" } }),
      fetch("/api/admin/observability/jobs", { headers: { "x-organization-id": "org-1" } })
    ])
    .then(async ([resCost, resJobs]) => {
      setCostData(await resCost.json());
      setJobData(await resJobs.json());
      setLoading(false);
    })
    .catch(console.error);
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando Observabilidade...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4">Painel de Custo e Observabilidade de IA</h1>

      {/* Alertas Ativos */}
      {costData?.alerts?.map((alert: any, idx: number) => (
        <div key={idx} className={`p-4 rounded-lg mb-6 ${alert.type === 'info' ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
          {alert.message}
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Custo Total */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700">Custo IA (Hoje)</h3>
          <p className="text-4xl font-bold text-green-600 mt-2">R$ {costData.metrics.costTodayBrl.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Uso no mês: R$ {costData.metrics.costMonthBrl.toFixed(2)}</p>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
            <div 
              className={`h-2.5 rounded-full ${costData.metrics.budgetUtilizationPercent > 80 ? 'bg-red-500' : 'bg-blue-600'}`} 
              style={{ width: `${Math.min(costData.metrics.budgetUtilizationPercent, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{costData.metrics.budgetUtilizationPercent}% do orçamento consumido</p>
        </div>

        {/* Estatísticas do AI Gateway */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700">Tráfego AI Gateway</h3>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li className="flex justify-between"><span>Requisições Totais:</span> <strong>{costData.metrics.totalRequests}</strong></li>
            <li className="flex justify-between"><span>Cache Hits (Economia):</span> <strong className="text-green-500">{costData.metrics.cacheHits}</strong></li>
            <li className="flex justify-between"><span>Bloqueios por Orçamento:</span> <strong className="text-red-500">{costData.metrics.blockedByBudget}</strong></li>
            <li className="flex justify-between"><span>Latência Média:</span> <strong>{costData.metrics.avgLatencyMs} ms</strong></li>
          </ul>
        </div>

        {/* Saúde de Jobs e Filas */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700">Workflows e Queues</h3>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li className="flex justify-between"><span>Processados Hoje:</span> <strong>{jobData.metrics.totalProcessedToday}</strong></li>
            <li className="flex justify-between"><span>Taxa de Sucesso:</span> <strong>{jobData.metrics.successRate}%</strong></li>
            <li className="flex justify-between"><span>Falhas Críticas:</span> <strong className="text-red-500">{jobData.metrics.failedJobs}</strong></li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Custos por Rota/Tarefa */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Custo por Task Type</h3>
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr><th className="px-4 py-2">Task Type</th><th className="px-4 py-2 text-right">Custo Acumulado</th></tr>
            </thead>
            <tbody>
              {costData.costByTaskType.map((task: any, idx: number) => (
                <tr key={idx} className="border-b"><td className="px-4 py-2">{task.taskType}</td><td className="px-4 py-2 text-right text-gray-800">R$ {task.costBrl.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Custos por Modelo */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Custo por Modelo</h3>
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr><th className="px-4 py-2">Modelo</th><th className="px-4 py-2 text-right">Custo Acumulado</th></tr>
            </thead>
            <tbody>
              {costData.costByModel.map((mod: any, idx: number) => (
                <tr key={idx} className="border-b"><td className="px-4 py-2">{mod.model}</td><td className="px-4 py-2 text-right text-gray-800">R$ {mod.costBrl.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
