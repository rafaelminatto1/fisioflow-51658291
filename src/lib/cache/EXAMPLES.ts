/**
 * Exemplos de uso do KVCacheService
 *
 * Este arquivo mostra como integrar o cache distribuído nas suas chamadas de API
 */

import { PatientCache, AppointmentCache, getCache, setCache } from './KVCacheService';
import { supabase } from '../supabase/client';

// ========================================
// EXEMPLO 1: Buscar paciente com cache
// ========================================

export async function getPatientWithCache(patientId: string) {
  // Tentar buscar do cache primeiro
  const cached = await PatientCache.get(patientId);

  if (cached) {
    console.log('✅ Cache HIT - Retornando dados do cache');
    return cached;
  }

  console.log('❌ Cache MISS - Buscando do banco');
  // Cache miss - buscar do banco
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) throw error;

  // Salvar no cache para próximas requisições
  await PatientCache.set(patientId, data);

  return data;
}

// ========================================
// EXEMPLO 2: Lista de exercícios com cache
// ========================================

export async function getExercisesWithCache(organizationId: string) {
  const cacheKey = `exercises:${organizationId}`;

  // Tentar cache
  const cached = await getCache<any[]>(cacheKey);

  if (cached) {
    console.log('✅ Cache HIT - Exercícios');
    return cached;
  }

  // Buscar do banco
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) throw error;

  // Salvar no cache por 2 horas
  await setCache(cacheKey, data, { ttl: 7200 });

  return data;
}

// ========================================
// EXEMPLO 3: Invalidar cache ao atualizar
// ========================================

export async function updatePatient(patientId: string, updates: any) {
  // Atualizar no banco
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', patientId)
    .select()
    .single();

  if (error) throw error;

  // Invalidar cache do paciente
  await PatientCache.invalidate(patientId);

  console.log('✅ Paciente atualizado e cache invalidado');

  return data;
}

// ========================================
// EXEMPLO 4: Appointments de um paciente
// ========================================

export async function getPatientAppointments(patientId: string) {
  // Tentar cache
  const cached = await AppointmentCache.getByPatient(patientId);

  if (cached) {
    console.log('✅ Cache HIT - Appointments');
    return cached;
  }

  // Buscar do banco
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: true });

  if (error) throw error;

  // Salvar no cache (30 minutos)
  await AppointmentCache.setByPatient(patientId, data);

  return data;
}

// ========================================
// EXEMPLO 5: Criar appointment - invalidar cache
// ========================================

export async function createAppointment(appointment: any) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) throw error;

  // Invalidar caches relacionados
  await AppointmentCache.invalidatePatient(data.patient_id);
  await AppointmentCache.invalidate(data.id);

  // Também invalidar cache do paciente (força refresh de dados completos)
  await PatientCache.invalidate(data.patient_id);

  console.log('✅ Appointment criado, caches invalidados');

  return data;
}

// ========================================
// EXEMPLO 6: Usar com React Query
// ========================================

import { useQuery } from '@tanstack/react-query';

export function usePatient(patientId: string) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientWithCache(patientId),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useExercises(organizationId: string) {
  return useQuery({
    queryKey: ['exercises', organizationId],
    queryFn: () => getExercisesWithCache(organizationId),
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
}

// ========================================
// EXEMPLO 7: Busca semântica com cache
// ========================================

export async function searchExercisesWithCache(
  query: string,
  organizationId: string
) {
  const cacheKey = `search:${organizationId}:${query}`;

  // Tentar cache
  const cached = await getCache<any[]>(cacheKey);

  if (cached) {
    console.log('✅ Cache HIT - Busca semântica');
    return cached;
  }

  // Buscar usando Supabase Vector
  const { data, error } = await supabase.rpc('search_exercises_semantic', {
    query_embedding: await generateEmbedding(query),
    match_threshold: 0.75,
    match_count: 10,
    organization_id_param: organizationId,
  });

  if (error) throw error;

  // Salvar no cache por 1 hora
  await setCache(cacheKey, data, { ttl: 3600 });

  return data;
}

// Helper function para gerar embedding
async function generateEmbedding(_text: string): Promise<number[]> {
  // Implementação da função de embedding
  // Pode usar OpenAI ou outro serviço
  return [];
}

// ========================================
// EXEMPLO 8: Dashboard com múltiplos caches
// ========================================

export async function getDashboardData(organizationId: string) {
  // Buscar múltiplas entidades em paralelo com cache
  const [patients, appointments, exercises, protocols] = await Promise.all([
    getCache(`patients:${organizationId}`),
    getCache(`appointments:${organizationId}`),
    getCache(`exercises:${organizationId}`),
    getCache(`protocols:${organizationId}`),
  ]);

  // Se todos estiverem em cache, retornar imediatamente
  if (patients && appointments && exercises && protocols) {
    console.log('✅ Cache HIT - Dashboard completo');
    return { patients, appointments, exercises, protocols };
  }

  // Caso contrário, buscar do que está faltando
  const [freshPatients, freshAppointments, freshExercises, freshProtocols] = await Promise.all([
    patients ? Promise.resolve(patients) : getPatientsFromDB(organizationId),
    appointments ? Promise.resolve(appointments) : getAppointmentsFromDB(organizationId),
    exercises ? Promise.resolve(exercises) : getExercisesWithCache(organizationId),
    protocols ? Promise.resolve(protocols) : getProtocolsFromDB(organizationId),
  ]);

  return {
    patients: freshPatients,
    appointments: freshAppointments,
    exercises: freshExercises,
    protocols: freshProtocols,
  };
}

async function getPatientsFromDB(organizationId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) throw error;

  await setCache(`patients:${organizationId}`, data, { ttl: 1800 });
  return data;
}

async function getAppointmentsFromDB(organizationId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('date', new Date().toISOString());

  if (error) throw error;

  await setCache(`appointments:${organizationId}`, data, { ttl: 600 });
  return data;
}

async function getProtocolsFromDB(organizationId: string) {
  const { data, error } = await supabase
    .from('protocols')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) throw error;

  await setCache(`protocols:${organizationId}`, data, { ttl: 7200 });
  return data;
}

// ========================================
// EXEMPLO 9: Rate limiting para API
// ========================================

import { rateLimit } from './KVCacheService';

export async function apiHandler(userId: string) {
  // Verificar rate limit (100 requisições por minuto)
  const limit = await rateLimit(userId, 100, 60);

  if (!limit.success) {
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((limit.reset - Date.now()) / 1000)} seconds`);
  }

  // Continuar com a lógica da API
  console.log(`✅ Request allowed. Remaining: ${limit.remaining}`);

  // ...
}

// ========================================
// EXEMPLO 10: Cache com invalidação automática
// ========================================

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // Tentar cache
  const cached = await getCache<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Buscar dados
  const data = await fetchFn();

  // Salvar no cache
  await setCache(key, data, { ttl });

  return data;
}

// Uso:
// const patient = await getCachedOrFetch(
//   `patient:${patientId}`,
//   () => supabase.from('patients').select('*').eq('id', patientId).single(),
//   3600
// );
