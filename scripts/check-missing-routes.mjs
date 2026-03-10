import fs from 'fs';
import path from 'path';

const workerClientPath = 'src/lib/api/workers-client.ts';
const routesDir = 'workers/src/routes';

function getEndpointsFromClient() {
  const content = fs.readFileSync(workerClientPath, 'utf-8');
  const regex = /request<.*?>\(\s*[`'](.*?)[`']/g;
  const endpoints = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    let endpoint = match[1];
    // Limpeza melhorada: remove query strings e trata templates do Vite
    endpoint = endpoint.split('?')[0].split('$')[0];
    endpoint = endpoint.replace(/\$\{.*?\}/g, ':id').replace(/\/:id/g, '/:id');
    if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
    if (endpoint) endpoints.add(endpoint);
  }
  return Array.from(endpoints);
}

function getImplementedRoutes() {
  const routes = new Set();
  const files = fs.readdirSync(routesDir);
  
  files.forEach(file => {
    if (!file.endsWith('.ts')) return;
    const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
    
    let baseRoute = '/api/' + file.replace('.ts', '').replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    if (file === 'auditRoutes.ts') baseRoute = '/api/audit-logs';
    if (file === 'precadastro.ts') baseRoute = '/api/precadastro';
    if (file === 'media.ts') baseRoute = '/api/media';
    if (file === 'knowledge.ts') baseRoute = '/api/knowledge';
    if (file === 'goalProfiles.ts') baseRoute = '/api/goal-profiles';
    if (file === 'organizationMembers.ts') baseRoute = '/api/organization-members';
    if (file === 'notificationPreferences.ts') baseRoute = '/api/notification-preferences';
    if (file === 'pushSubscriptions.ts') baseRoute = '/api/push-subscriptions';
    if (file === 'exerciseVideos.ts') baseRoute = '/api/exercise-videos';
    if (file === 'exerciseSessions.ts') baseRoute = '/api/exercise-sessions';
    if (file === 'timeEntries.ts') baseRoute = '/api/time-entries';
    if (file === 'imageProcessor.ts') baseRoute = '/api/exercise-image';
    if (file === 'publicBooking.ts') baseRoute = '/api/public';
    if (file === 'satisfactionSurveys.ts') baseRoute = '/api/satisfaction-surveys';
    if (file === 'documentSignatures.ts') baseRoute = '/api/document-signatures';
    if (file === 'treatmentCycles.ts') baseRoute = '/api/treatment-cycles';
    if (file === 'evolutionVersions.ts') baseRoute = '/api/evolution-versions';
    if (file === 'exercisePlans.ts') baseRoute = '/api/exercise-plans';
    if (file === 'activityLab.ts') baseRoute = '/api/activity-lab';
    if (file === 'medicalRequests.ts') baseRoute = '/api/medical-requests';
    if (file === 'evaluationForms.ts') baseRoute = '/api/evaluation-forms';
    if (file === 'fcmTokens.ts') baseRoute = '/api/fcm-tokens';
    
    const methodRegex = /app\.(get|post|put|patch|delete)\(['"](.*?)['"]/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      let subRoute = match[2];
      if (subRoute === '/') subRoute = '';
      let full = (baseRoute + subRoute).replace(/\/+/g, '/');
      if (full.endsWith('/')) full = full.slice(0, -1);
      routes.add(full);
    }
  });
  
  return Array.from(routes);
}

const clientEndpoints = getEndpointsFromClient();
const implementedRoutes = getImplementedRoutes();

console.log('--- MISSING ROUTES IN BACKEND (Refined) ---');
clientEndpoints.forEach(endpoint => {
  const isImplemented = implementedRoutes.some(route => {
    const routePattern = route.replace(/:[a-zA-Z0-9]+/g, '[^/]+');
    const routeRegex = new RegExp('^' + routePattern + '$');
    return routeRegex.test(endpoint);
  });
  
  if (!isImplemented) {
    console.log(endpoint);
  }
});
