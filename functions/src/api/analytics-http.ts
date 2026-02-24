/**
 * BigQuery Analytics HTTP Endpoints
 */

import { onRequest } from 'firebase-functions/v2/https';
import { CORS_ORIGINS } from '../lib/cors';
import {
  setupBigQuery,
  getDashboardMetrics,
  getPatientEvolution,
  getOrganizationStats,
  getTopExercises,
  getPainMapAnalysis,
  getGamificationStats,
  predictChurnRisk,
  getUsageStats,
  runCustomQuery,
} from '../lib/bigquery';

const HTTP_OPTS = {
  region: 'southamerica-east1',
  cors: CORS_ORIGINS,
};

export const setupAnalytics = onRequest(HTTP_OPTS, async (req, res) => {
  await setupBigQuery();
  res.json({ success: true });
});

export const dashboardMetrics = onRequest(HTTP_OPTS, async (req, res) => {
  const { organizationId } = req.query;
  const metrics = await getDashboardMetrics(String(organizationId));
  res.json(metrics);
});

export const patientEvolution = onRequest(HTTP_OPTS, async (req, res) => {
  const { patientId } = req.query;
  const data = await getPatientEvolution(String(patientId));
  res.json(data);
});

export const organizationStats = onRequest(HTTP_OPTS, async (req, res) => {
  const { organizationId } = req.query;
  const data = await getOrganizationStats(String(organizationId));
  res.json(data);
});

export const topExercises = onRequest(HTTP_OPTS, async (req, res) => {
  const { organizationId } = req.query;
  const data = await getTopExercises(String(organizationId));
  res.json(data);
});

export const painMapAnalysis = onRequest(HTTP_OPTS, async (req, res) => {
  const { organizationId } = req.query;
  const data = await getPainMapAnalysis(String(organizationId));
  res.json(data);
});

export const gamificationStats = onRequest(HTTP_OPTS, async (req, res) => {
  const { organizationId } = req.query;
  const data = await getGamificationStats(String(organizationId));
  res.json(data);
});

export const churnPrediction = onRequest(HTTP_OPTS, async (req, res) => {
  const { organizationId } = req.query;
  const data = await predictChurnRisk(String(organizationId));
  res.json(data);
});

export const usageStats = onRequest(HTTP_OPTS, async (req, res) => {
  const data = await getUsageStats();
  res.json(data);
});

export const customQuery = onRequest(HTTP_OPTS, async (req, res) => {
  const { query, params } = req.body;
  const data = await runCustomQuery(query, params);
  res.json(data);
});
