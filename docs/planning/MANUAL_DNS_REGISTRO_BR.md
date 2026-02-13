# Guia de Atualização de DNS - Registro.br 
## Domínio: moocafisio.com.br
## Destino: Firebase Hosting (fisioflow-migration)

Para conectar seu domínio ao novo projeto, configure os seguintes registros no painel do **Registro.br**.

### 1. Limpeza (Remover)
Remova estes registros antigos se existirem:
- A: `216.150.1.1`
- A: `216.150.16.1`

### 2. Adicionar Novos Registros

**Mude para o Modo Avançado** no Registro.br para editar registros individuais.

| Tipo | Nome (Host) | Valor (Dados) |
|:---:|:---:|:---|
| **A** | *(deixe em branco)* | `199.36.158.100` |
| **TXT** | *(deixe em branco)* | `hosting-site=fisioflow-migration` |
| **TXT** | `_acme-challenge` | `cSkosmqwNqz77zOS5C1--JmbzALgSC9q1sNcHZypFz4` |

### 3. Subdomínio WWW
Para que `www.moocafisio.com.br` funcione:

1. **No Registro.br**: Adicione um CNAME.
| Tipo | Nome | Valor |
|:---:|:---:|:---|
| **CNAME** | `www` | `fisioflow-migration.web.app` |

*(Se der erro com CNAME, use o mesmo registro A: Nome `www`, Valor `199.36.158.100`)*

2. **No Firebase Console**:
   - Vá em Hosting > Adicionar domínio personalizado.
   - Digite `www.moocafisio.com.br`.
   - Selecione "Redirecionar para um domínio existente" -> `moocafisio.com.br`.

### 4. Conclusão
Após salvar, aguarde a propagação (pode levar alguns minutos ou mais). O certificado SSL será gerado automaticamente pelo Google.
