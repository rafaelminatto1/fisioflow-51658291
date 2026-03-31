import { neon } from '@neondatabase/serverless';

async function getPatientsCount() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return "DATABASE_URL não configurada no .env";
  }

  // Utilizando o driver serverless oficial do Neon (já instalado no repo principal)
  // que suporta execução na edge via WebSocket/HTTP sem depender do módulo `net` do Node.
  const sql = neon(connectionString);

  try {
    const result = await sql`SELECT COUNT(*) as count FROM patients`;
    return result[0].count;
  } catch (error) {
    console.error("Erro na consulta DB:", error);
    return `Erro ao conectar: ${error.message}`;
  }
}

export default async function Home() {
  const patientsCount = await getPatientsCount();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>FisioFlow Vinext PoC</h1>
      <p>
        Este é um ambiente experimental utilizando <strong>vinext</strong> (Vite + API do Next.js)
        hospedado no Cloudflare Workers.
      </p>

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f0f9ff',
        color: '#0369a1'
      }}>
        <h2>🔥 Teste de Server Component com Neon DB</h2>
        <p>
          Este dado foi buscado <strong>diretamente no servidor</strong> (SSR) conectando no seu banco Neon sem expor a string de conexão:
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          Total de Pacientes no Banco: {patientsCount}
        </p>
      </div>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Variáveis Carregadas do .env:</h2>
        <ul>
          <li><strong>API URL:</strong> {process.env.VITE_WORKERS_API_URL}</li>
          <li><strong>Ambiente:</strong> {process.env.VITE_ENVIRONMENT}</li>
          <li><strong>Neon Auth URL:</strong> {process.env.VITE_NEON_AUTH_URL}</li>
        </ul>
      </div>
    </div>
  )
}
