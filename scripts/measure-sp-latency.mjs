import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const API_BASE_URL = 'https://api-pro.moocafisio.com.br/api';
const ENDPOINTS = [
  { name: 'Health Ready (Edge)', path: '/health/ready' },
  { name: 'Health DB (Neon SP)', path: '/health/db' }
];

const ITERATIONS = 5;

async function measureLatency(name, path) {
  console.log(`\n--- Medindo: ${name} ---`);
  const latencies = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'User-Agent': 'FisioFlow-Latency-Tester' }
      });
      const end = performance.now();
      const duration = end - start;
      
      if (response.ok) {
        latencies.push(duration);
        console.log(`  Tentativa ${i + 1}: ${duration.toFixed(2)}ms (Status: ${response.status})`);
      } else {
        console.log(`  Tentativa ${i + 1}: FALHOU (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`  Tentativa ${i + 1}: ERRO (${error.message})`);
    }
  }

  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    console.log(`  Estatísticas: Média: ${avg.toFixed(2)}ms | Mín: ${min.toFixed(2)}ms | Máx: ${max.toFixed(2)}ms`);
  }
}

async function run() {
  console.log('🚀 Iniciando teste de latência FisioFlow (Foco São Paulo)');
  console.log(`📍 Base URL: ${API_BASE_URL}`);
  
  for (const endpoint of ENDPOINTS) {
    await measureLatency(endpoint.name, endpoint.path);
  }
  
  console.log('\n✅ Teste concluído.');
}

run();
