/**
 * Inngest API Route
 *
 * This route handles all Inngest webhooks and function execution.
 * Vercel will automatically route requests here based on the Inngest integration.
 *
 * Route: /api/inngest
 */

import { GET, POST, PUT } from '../../src/lib/inngest/serve.js';

export { GET, POST, PUT };

// Edge runtime configuration
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
