// Script para extrair dados de TODOS os pacientes do ZenFisio
// Executar no console do navegador (F12)
// Este script navega por cada paciente, extrai o histórico e salva em JSON

(async () => {
  const results = [];
  let processed = 0;
  let errors = 0;
  
  // Lista de pacientes já processados
  const done = new Set(['3200139','2916336','3722159','3149165','3388357','2963533','4875550','4793242','2772547','4116234','4936355','5137801','3555430','4596318','2760870','2999973','4919128','3446014','2966539','3383041','5147502','3305735','4086689','4607479','4827526','4713452','4824367','4761304']);
  
  // Função para buscar pacientes na API
  async function fetchPatients(page = 1, perPage = 50) {
    const resp = await fetch(`/api/contacts/patients?page=${page}&per_page=${perPage}`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error('Failed to fetch patients');
    return resp.json();
  }
  
  // Função para buscar histórico de um paciente
  async function fetchHistory(slug) {
    const resp = await fetch(`/api/patients/history/${slug}/history/2010-01-01/2030-12-31/desc`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) throw new Error('Failed to fetch history for ' + slug);
    return resp.json();
  }
  
  // Função para extrair detalhes de um evento
  async function fetchEventDetail(appointmentId) {
    const resp = await fetch(`/api/appointments/details/${appointmentId}`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!resp.ok) return null;
    return resp.json();
  }
  
  console.log('Iniciando extração automática...');
  console.log('Pacientes já processados:', done.size);
  
  // Buscar lista de pacientes
  let page = 1;
  let allPatients = [];
  let hasMore = true;
  
  while (hasMore) {
    try {
      const data = await fetchPatients(page, 50);
      if (data.patients) {
        allPatients = allPatients.concat(data.patients);
        hasMore = data.patients.length === 50;
      } else if (Array.isArray(data)) {
        allPatients = allPatients.concat(data);
        hasMore = data.length === 50;
      } else {
        hasMore = false;
      }
      page++;
    } catch (e) {
      console.error('Erro ao buscar pacientes:', e);
      hasMore = false;
    }
  }
  
  console.log('Total de pacientes encontrados:', allPatients.length);
  
  // Processar cada paciente
  for (const patient of allPatients) {
    const id = String(patient.id);
    if (done.has(id)) continue;
    
    try {
      const slug = patient.slug || patient.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      console.log(`Processando ${patient.name} (${id})...`);
      
      const history = await fetchHistory(slug);
      results.push({
        id,
        name: patient.name,
        slug,
        history
      });
      
      processed++;
      console.log(`✓ ${patient.name} processado (${processed} total)`);
      
      // Salvar progresso a cada 10 pacientes
      if (processed % 10 === 0) {
        const fs = require('fs');
        fs.writeFileSync(
          `/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export/_progress.json`,
          JSON.stringify({ processed, total: allPatients.length, results }, null, 2)
        );
      }
      
    } catch (e) {
      console.error(`Erro ao processar ${patient.name}:`, e);
      errors++;
    }
  }
  
  console.log(`\nExtração concluída!`);
  console.log(`Processados: ${processed}`);
  console.log(`Erros: ${errors}`);
  
  // Salvar resultado final
  const fs = require('fs');
  fs.writeFileSync(
    `/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/zenfisio-scraper/data/zenfisio-export/_all_patients.json`,
    JSON.stringify(results, null, 2)
  );
  
  return results;
})();
