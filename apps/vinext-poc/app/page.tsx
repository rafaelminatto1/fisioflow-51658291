export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Bem-vindo ao FisioFlow Vinext PoC</h1>
      <p>
        Este é um ambiente experimental utilizando <strong>vinext</strong> (Vite + API do Next.js)
        hospedado no Cloudflare Workers.
      </p>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2>Objetivos da PoC:</h2>
        <ul>
          <li>Testar Server-Side Rendering (SSR) e React Server Components (RSC) com Vite.</li>
          <li>Validar conexão Edge (Cloudflare Workers) com Neon DB através da API consolidada (Hono).</li>
          <li>Avaliar compatibilidade com `@neondatabase/auth`.</li>
        </ul>
        <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#666' }}>
          O repositório principal do FisioFlow (SPA Vite) permanece inalterado para garantir estabilidade em produção.
        </p>
      </div>
    </div>
  )
}
