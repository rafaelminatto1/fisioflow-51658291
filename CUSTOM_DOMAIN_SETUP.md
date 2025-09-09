# Configuração de Domínio Personalizado - FisioFlow

## Visão Geral
Este guia detalha como configurar um domínio personalizado para o FisioFlow na Vercel, incluindo configurações de DNS, SSL e otimizações.

## Pré-requisitos
- [ ] Domínio registrado (ex: fisioflow.com.br)
- [ ] Acesso ao painel de controle do registrador de domínio
- [ ] Projeto deployado na Vercel
- [ ] Acesso administrativo ao projeto na Vercel

## Passo 1: Configuração na Vercel

### 1.1 Adicionar Domínio no Dashboard
```bash
# Via Vercel CLI (opcional)
vercel domains add fisioflow.com.br
vercel domains add www.fisioflow.com.br
```

### 1.2 Configuração via Dashboard Web
1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Selecione o projeto FisioFlow
3. Vá para **Settings** → **Domains**
4. Clique em **Add Domain**
5. Digite seu domínio: `fisioflow.com.br`
6. Clique em **Add**

### 1.3 Configurar Subdomínio WWW
1. Adicione também: `www.fisioflow.com.br`
2. Configure redirecionamento de `www` para domínio principal

## Passo 2: Configuração de DNS

### 2.1 Registros DNS Necessários

#### Para Domínio Principal (fisioflow.com.br)
```dns
# Registro A (IPv4)
Type: A
Name: @
Value: 76.76.19.19
TTL: 3600

# Registro AAAA (IPv6)
Type: AAAA
Name: @
Value: 2606:4700:10::6816:1313
TTL: 3600

# Alternativa: Registro CNAME (se suportado pelo registrador)
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

#### Para Subdomínio WWW
```dns
# Registro CNAME para www
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### 2.2 Configuração por Registrador

#### Registro.br (domínios .br)
1. Acesse o painel do Registro.br
2. Vá em **DNS** → **Zona DNS**
3. Adicione os registros acima
4. Aguarde propagação (até 48h)

#### Cloudflare
1. Acesse o dashboard do Cloudflare
2. Selecione seu domínio
3. Vá em **DNS** → **Records**
4. Adicione os registros A/AAAA ou CNAME
5. **Importante**: Desative o proxy (nuvem cinza) inicialmente

#### GoDaddy
1. Acesse o painel GoDaddy
2. Vá em **Meus Produtos** → **DNS**
3. Adicione os registros necessários
4. Salve as alterações

## Passo 3: Verificação e SSL

### 3.1 Verificar Propagação DNS
```bash
# Verificar registros A
nslookup fisioflow.com.br

# Verificar registros CNAME
nslookup www.fisioflow.com.br

# Ferramenta online alternativa
# https://dnschecker.org/
```

### 3.2 Certificado SSL Automático
- A Vercel provisiona SSL automaticamente via Let's Encrypt
- Processo leva de 5 minutos a algumas horas
- Certificado renova automaticamente

### 3.3 Forçar HTTPS
```json
// vercel.json - já configurado
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

## Passo 4: Configurações Avançadas

### 4.1 Redirecionamentos
```json
// vercel.json - configurar redirecionamentos
{
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "permanent": true
    },
    {
      "source": "/app",
      "destination": "/",
      "permanent": false
    }
  ]
}
```

### 4.2 Configurar Múltiplos Domínios
```bash
# Adicionar domínios alternativos
vercel domains add app.fisioflow.com.br
vercel domains add sistema.fisioflow.com.br
```

### 4.3 Configuração de Email (opcional)
```dns
# Registros MX para email
Type: MX
Name: @
Value: 10 mail.fisioflow.com.br
TTL: 3600

# Registro SPF
Type: TXT
Name: @
Value: "v=spf1 include:_spf.google.com ~all"
TTL: 3600
```

## Passo 5: Testes e Validação

### 5.1 Checklist de Verificação
- [ ] Domínio resolve corretamente
- [ ] WWW redireciona para domínio principal
- [ ] SSL certificado ativo (cadeado verde)
- [ ] HTTPS forçado funcionando
- [ ] Todas as páginas carregam corretamente
- [ ] Performance mantida

### 5.2 Ferramentas de Teste
```bash
# Teste de conectividade
curl -I https://fisioflow.com.br

# Teste de SSL
openssl s_client -connect fisioflow.com.br:443

# Teste de performance
# https://pagespeed.web.dev/
# https://gtmetrix.com/
```

### 5.3 Monitoramento
```javascript
// Adicionar ao monitoring.ts
const domainChecks = {
  primary: 'https://fisioflow.com.br',
  www: 'https://www.fisioflow.com.br',
  api: 'https://fisioflow.com.br/api/health'
};

export async function checkDomainHealth() {
  const results = {};
  
  for (const [name, url] of Object.entries(domainChecks)) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      results[name] = {
        status: response.status,
        ok: response.ok,
        ssl: url.startsWith('https')
      };
    } catch (error) {
      results[name] = {
        status: 0,
        ok: false,
        error: error.message
      };
    }
  }
  
  return results;
}
```

## Passo 6: Otimizações Pós-Configuração

### 6.1 CDN e Cache
- Vercel CDN ativo automaticamente
- Cache headers já configurados no `vercel.json`
- Edge locations globais

### 6.2 Analytics de Domínio
```javascript
// Configurar analytics específicos do domínio
const domainAnalytics = {
  domain: window.location.hostname,
  protocol: window.location.protocol,
  referrer: document.referrer
};
```

### 6.3 SEO e Meta Tags
```html
<!-- Adicionar ao index.html -->
<link rel="canonical" href="https://fisioflow.com.br" />
<meta property="og:url" content="https://fisioflow.com.br" />
<meta name="robots" content="index, follow" />
```

## Troubleshooting

### Problemas Comuns

#### DNS não propaga
- Aguardar até 48h para propagação completa
- Verificar TTL dos registros (menor = propagação mais rápida)
- Usar ferramentas como `dig` ou `nslookup`

#### SSL não ativa
- Verificar se DNS está correto
- Aguardar propagação DNS completa
- Contatar suporte Vercel se persistir

#### Redirecionamento não funciona
- Verificar configuração no `vercel.json`
- Limpar cache do navegador
- Testar em modo incógnito

### Comandos Úteis
```bash
# Verificar status do domínio
vercel domains ls

# Remover domínio
vercel domains rm fisioflow.com.br

# Verificar certificados
vercel certs ls

# Logs de deploy
vercel logs
```

## Considerações de Segurança

### Headers de Segurança
```json
// Já configurado no vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Monitoramento de Segurança
- Configurar alertas para certificados expirados
- Monitorar tentativas de acesso malicioso
- Implementar rate limiting se necessário

## Próximos Passos

1. **Configurar domínio de desenvolvimento**: `dev.fisioflow.com.br`
2. **Implementar subdomínios por funcionalidade**: `api.fisioflow.com.br`
3. **Configurar email corporativo**: `contato@fisioflow.com.br`
4. **Implementar CDN adicional** se necessário
5. **Configurar backup de DNS** em múltiplos provedores

---

**Nota**: Este processo pode levar de algumas horas a 48h para ser completamente funcional devido à propagação DNS. Mantenha backups das configurações antigas até confirmar que tudo está funcionando corretamente.