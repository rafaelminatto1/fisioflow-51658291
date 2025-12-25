import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  successResponse,
  errorResponse,
  createdResponse,
  optionsResponse,
  createSupabaseClient,
  validateAuth,
  isValidUUID,
  methodNotAllowed,
  parseJsonBody,
  logRequest,
  handleSupabaseError,
} from '../_shared/api-helpers.ts';
import { painMapCreateSchema, validateSchema } from '../_shared/schemas.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limit.ts';

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  logRequest(req, 'Pain Maps API');

  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(req, 'api-pain-maps', { maxRequests: 100, windowMinutes: 1 });
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, {});
  }

  // Autenticação
  const { user, error: authError } = await validateAuth(req);
  if (authError) return authError;

  const supabase = createSupabaseClient(req);

  try {
    // Rota: GET /api-pain-maps/compare?patientId=xxx&mapIds=id1,id2
    if (pathname.includes('/compare')) {
      return await comparePainMaps(url, supabase, user!.organization_id);
    }

    // Rota: GET/POST /api-pain-maps/session/:sessionId
    const sessionMatch = pathname.match(/\/session\/([^/]+)/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      if (!isValidUUID(sessionId)) {
        return errorResponse('ID de sessão inválido', 400);
      }

      if (req.method === 'GET') {
        return await listPainMapsBySession(supabase, sessionId, user!.organization_id);
      }
      if (req.method === 'POST') {
        return await createPainMap(req, supabase, sessionId, user!);
      }
      return methodNotAllowed(['GET', 'POST']);
    }

    // Rota: GET /api-pain-maps/:id
    const painMapMatch = pathname.match(/\/api-pain-maps\/([^/]+)$/);
    if (painMapMatch) {
      const painMapId = painMapMatch[1];
      if (!isValidUUID(painMapId)) {
        return errorResponse('ID de mapa de dor inválido', 400);
      }

      if (req.method === 'GET') {
        return await getPainMap(supabase, painMapId, user!.organization_id);
      }
      return methodNotAllowed(['GET']);
    }

    return errorResponse('Rota não encontrada', 404);
  } catch (error) {
    console.error('Pain Maps API Error:', error);
    return errorResponse('Erro interno do servidor', 500);
  }
});

// ========== LIST PAIN MAPS BY SESSION ==========
async function listPainMapsBySession(supabase: any, sessionId: string, organizationId?: string) {
  let query = supabase
    .from('pain_maps')
    .select(`
      *,
      points:pain_map_points(*)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  return successResponse(data || []);
}

// ========== GET PAIN MAP ==========
async function getPainMap(supabase: any, painMapId: string, organizationId?: string) {
  let query = supabase
    .from('pain_maps')
    .select(`
      *,
      points:pain_map_points(*),
      session:sessions(
        id,
        patient_id,
        therapist_id,
        started_at,
        patient:patients(id, name)
      )
    `)
    .eq('id', painMapId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      return errorResponse('Mapa de dor não encontrado', 404);
    }
    return handleSupabaseError(error);
  }

  return successResponse(data);
}

// ========== CREATE PAIN MAP ==========
async function createPainMap(req: Request, supabase: any, sessionId: string, user: { id: string; organization_id?: string }) {
  const { data: body, error: parseError } = await parseJsonBody(req);
  if (parseError) return parseError;

  const validation = validateSchema(painMapCreateSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const { view, points } = validation.data;

  // Verificar se sessão existe
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, patient_id')
    .eq('id', sessionId)
    .eq('organization_id', user.organization_id)
    .single();

  if (sessionError || !session) {
    return errorResponse('Sessão não encontrada', 404);
  }

  // Criar mapa de dor
  const { data: painMap, error: mapError } = await supabase
    .from('pain_maps')
    .insert({
      session_id: sessionId,
      patient_id: session.patient_id,
      view,
      organization_id: user.organization_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (mapError) {
    return handleSupabaseError(mapError);
  }

  // Criar pontos de dor
  const pointsData = points.map((point: any) => ({
    pain_map_id: painMap.id,
    region_code: point.region_code,
    region: getRegionName(point.region_code),
    intensity: point.intensity,
    pain_type: point.pain_type,
    notes: point.notes,
  }));

  const { data: createdPoints, error: pointsError } = await supabase
    .from('pain_map_points')
    .insert(pointsData)
    .select();

  if (pointsError) {
    // Rollback - deletar mapa criado
    await supabase.from('pain_maps').delete().eq('id', painMap.id);
    return handleSupabaseError(pointsError);
  }

  return createdResponse({
    ...painMap,
    points: createdPoints,
  });
}

// ========== COMPARE PAIN MAPS ==========
async function comparePainMaps(url: URL, supabase: any, organizationId?: string) {
  const patientId = url.searchParams.get('patientId');
  const mapIdsParam = url.searchParams.get('mapIds');

  if (!patientId || !mapIdsParam) {
    return errorResponse('patientId e mapIds são obrigatórios', 400);
  }

  const mapIds = mapIdsParam.split(',');
  if (mapIds.length !== 2) {
    return errorResponse('Exatamente 2 IDs de mapas são necessários para comparação', 400);
  }

  // Buscar os dois mapas
  let query = supabase
    .from('pain_maps')
    .select(`
      *,
      points:pain_map_points(*),
      session:sessions(started_at)
    `)
    .in('id', mapIds)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: maps, error } = await query;

  if (error) {
    return handleSupabaseError(error);
  }

  if (!maps || maps.length !== 2) {
    return errorResponse('Mapas de dor não encontrados', 404);
  }

  // Calcular evolução
  const [olderMap, newerMap] = maps;
  const evolution = calculateEvolution(olderMap, newerMap);

  return successResponse({
    maps,
    evolution,
  });
}

// ========== HELPER FUNCTIONS ==========

function getRegionName(regionCode: string): string {
  const regionNames: Record<string, string> = {
    // Frente
    'head_front': 'Cabeça (Frente)',
    'neck_front': 'Pescoço (Frente)',
    'chest_left': 'Peito (Esquerdo)',
    'chest_right': 'Peito (Direito)',
    'abdomen_upper': 'Abdômen Superior',
    'abdomen_lower': 'Abdômen Inferior',
    'shoulder_left_front': 'Ombro Esquerdo (Frente)',
    'shoulder_right_front': 'Ombro Direito (Frente)',
    'arm_left_front': 'Braço Esquerdo (Frente)',
    'arm_right_front': 'Braço Direito (Frente)',
    'forearm_left_front': 'Antebraço Esquerdo (Frente)',
    'forearm_right_front': 'Antebraço Direito (Frente)',
    'hand_left': 'Mão Esquerda',
    'hand_right': 'Mão Direita',
    'hip_left_front': 'Quadril Esquerdo (Frente)',
    'hip_right_front': 'Quadril Direito (Frente)',
    'thigh_left_front': 'Coxa Esquerda (Frente)',
    'thigh_right_front': 'Coxa Direita (Frente)',
    'knee_left': 'Joelho Esquerdo',
    'knee_right': 'Joelho Direito',
    'calf_left_front': 'Panturrilha Esquerda (Frente)',
    'calf_right_front': 'Panturrilha Direita (Frente)',
    'ankle_left': 'Tornozelo Esquerdo',
    'ankle_right': 'Tornozelo Direito',
    'foot_left': 'Pé Esquerdo',
    'foot_right': 'Pé Direito',
    // Costas
    'head_back': 'Cabeça (Costas)',
    'neck_back': 'Pescoço (Costas)',
    'upper_back_left': 'Costas Superior (Esquerda)',
    'upper_back_right': 'Costas Superior (Direita)',
    'middle_back_left': 'Costas Média (Esquerda)',
    'middle_back_right': 'Costas Média (Direita)',
    'lower_back_left': 'Lombar (Esquerda)',
    'lower_back_right': 'Lombar (Direita)',
    'shoulder_left_back': 'Ombro Esquerdo (Costas)',
    'shoulder_right_back': 'Ombro Direito (Costas)',
    'arm_left_back': 'Braço Esquerdo (Costas)',
    'arm_right_back': 'Braço Direito (Costas)',
    'forearm_left_back': 'Antebraço Esquerdo (Costas)',
    'forearm_right_back': 'Antebraço Direito (Costas)',
    'glute_left': 'Glúteo Esquerdo',
    'glute_right': 'Glúteo Direito',
    'thigh_left_back': 'Coxa Esquerda (Costas)',
    'thigh_right_back': 'Coxa Direita (Costas)',
    'calf_left_back': 'Panturrilha Esquerda (Costas)',
    'calf_right_back': 'Panturrilha Direita (Costas)',
  };

  return regionNames[regionCode] || regionCode;
}

function calculateEvolution(olderMap: any, newerMap: any): {
  improvementPercentage: number;
  regionsImproved: string[];
  regionsWorsened: string[];
  regionsSame: string[];
} {
  const olderPoints = olderMap.points || [];
  const newerPoints = newerMap.points || [];

  // Criar mapa de intensidades por região
  const olderIntensities: Record<string, number> = {};
  const newerIntensities: Record<string, number> = {};

  olderPoints.forEach((p: any) => {
    olderIntensities[p.region_code] = p.intensity;
  });

  newerPoints.forEach((p: any) => {
    newerIntensities[p.region_code] = p.intensity;
  });

  // Todas as regiões
  const allRegions = [...new Set([...Object.keys(olderIntensities), ...Object.keys(newerIntensities)])];

  const regionsImproved: string[] = [];
  const regionsWorsened: string[] = [];
  const regionsSame: string[] = [];

  let totalOlder = 0;
  let totalNewer = 0;

  allRegions.forEach(region => {
    const older = olderIntensities[region] || 0;
    const newer = newerIntensities[region] || 0;
    totalOlder += older;
    totalNewer += newer;

    if (newer < older) {
      regionsImproved.push(getRegionName(region));
    } else if (newer > older) {
      regionsWorsened.push(getRegionName(region));
    } else if (older > 0) {
      regionsSame.push(getRegionName(region));
    }
  });

  // Calcular % de melhora (redução na intensidade total)
  const improvementPercentage = totalOlder > 0 
    ? Math.round(((totalOlder - totalNewer) / totalOlder) * 100)
    : 0;

  return {
    improvementPercentage,
    regionsImproved,
    regionsWorsened,
    regionsSame,
  };
}

