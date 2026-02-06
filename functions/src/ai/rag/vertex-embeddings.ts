import { GoogleAuth } from 'google-auth-library';
import { getLogger } from '../../lib/logger';

const logger = getLogger('ai-vertex-embeddings');

const DEFAULT_MODEL = 'text-embedding-005';
const DEFAULT_LOCATION = 'us-central1';
const DEFAULT_BATCH_SIZE = 12;

interface VertexEmbeddingPrediction {
  embeddings?: { values?: number[] };
  values?: number[];
}

function getProjectId(): string {
  return process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration';
}

function getLocation(): string {
  return process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
}

function getModel(): string {
  return process.env.RAG_EMBEDDING_MODEL || DEFAULT_MODEL;
}

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toEmbeddingVector(prediction: VertexEmbeddingPrediction | undefined): number[] {
  const rawValues = prediction?.embeddings?.values || prediction?.values || [];
  if (!Array.isArray(rawValues)) return [];
  return rawValues.filter((value) => typeof value === 'number' && Number.isFinite(value));
}

async function getAccessToken(): Promise<string | null> {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResult = await client.getAccessToken();
    const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
    return token || null;
  } catch (error) {
    logger.warn('Failed to get access token for Vertex embeddings', {
      error: (error as Error).message,
    });
    return null;
  }
}

async function requestEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const projectId = getProjectId();
  const location = getLocation();
  const model = getModel();
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: texts.map((text) => ({ content: text })),
      }),
    });

    if (!response.ok) {
      logger.warn('Vertex embedding request returned non-OK status', {
        status: response.status,
        statusText: response.statusText,
      });
      return [];
    }

    const payload = (await response.json()) as { predictions?: VertexEmbeddingPrediction[] };
    const predictions = Array.isArray(payload.predictions) ? payload.predictions : [];
    return predictions.map((prediction) => toEmbeddingVector(prediction));
  } catch (error) {
    logger.warn('Vertex embedding request failed', {
      error: (error as Error).message,
    });
    return [];
  }
}

export async function generateEmbeddingsForTexts(
  texts: string[],
  batchSize = DEFAULT_BATCH_SIZE
): Promise<number[][]> {
  const sanitizedTexts = texts.map((text) => sanitizeText(text)).filter((text) => text.length > 0);
  if (sanitizedTexts.length === 0) return [];

  const vectors: number[][] = [];

  for (let i = 0; i < sanitizedTexts.length; i += batchSize) {
    const batch = sanitizedTexts.slice(i, i + batchSize);
    const batchVectors = await requestEmbeddings(batch);

    if (batchVectors.length !== batch.length) {
      logger.warn('Embedding batch size mismatch', {
        expected: batch.length,
        received: batchVectors.length,
      });
    }

    for (const vector of batchVectors) {
      vectors.push(vector);
    }
  }

  return vectors;
}

export async function generateEmbeddingForText(text: string): Promise<number[] | null> {
  const [vector] = await generateEmbeddingsForTexts([text], 1);
  if (!vector || vector.length === 0) return null;
  return vector;
}
