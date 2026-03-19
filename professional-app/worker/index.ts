import { Hono } from 'hono';
import * as schema from '../db/schema';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('*', cors());

app.post('/api/patients/check-duplicate', async (c) => {
  try {
    const { name, organizationId } = await c.req.json();
    
    if (!name || name.trim().length < 3) {
      return c.json({ duplicateExists: false });
    }

    const db = c.env.DB;
    const result = await db.run("SELECT EXISTS (SELECT 1 FROM patients WHERE name = '" + name + "' AND professional_id = '" + organizationId + "' AND is_active = true)");
    const duplicateExists = !!result;
    
    return c.json({ duplicateExists });
  } catch (error) {
    console.error('Erro ao verificar nome duplicado:', error);
    return c.json({ error: 'Erro ao verificar nome duplicado', details: error.message });
  }
});
