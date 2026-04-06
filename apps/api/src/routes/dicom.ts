import { Hono } from 'hono';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

const DICOM_DEPRECATED_MESSAGE =
  'O fluxo DICOM/PACS foi descontinuado para esta clinica. Use o hub biomecanico com imagens, videos e PDFs comuns.';

app.all('*', (c) => {
  return c.json(
    {
      error: DICOM_DEPRECATED_MESSAGE,
      deprecated: true,
      replacement: {
        hub: '/biomechanics',
        acceptedFormats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'pdf'],
      },
    },
    410,
  );
});

export { app as dicomRoutes };
