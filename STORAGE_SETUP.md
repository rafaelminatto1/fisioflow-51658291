# 📦 Configuração de Storage - FisioFlow

## Buckets Necessários

Você precisa criar os seguintes buckets no Dashboard do Supabase:

### 1. **comprovantes** (privado)
- **Uso**: Comprovantes de pagamento de eventos
- **Público**: Não
- **Limite de tamanho**: 5MB
- **Tipos permitidos**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

### 2. **prontuarios** (privado)
- **Uso**: Anexos de prontuários médicos
- **Público**: Não
- **Limite de tamanho**: 10MB
- **Tipos permitidos**: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `video/mp4`, `video/quicktime`

### 3. **evolucao** (privado)
- **Uso**: Fotos de evolução (antes/depois)
- **Público**: Não
- **Limite de tamanho**: 10MB
- **Tipos permitidos**: `image/jpeg`, `image/png`, `image/webp`

### 4. **avatars** (público)
- **Uso**: Fotos de perfil dos usuários
- **Público**: Sim
- **Limite de tamanho**: 2MB
- **Tipos permitidos**: `image/jpeg`, `image/png`, `image/webp`

---

## Como Criar os Buckets

1. Acesse o **Dashboard do Supabase**
2. Vá em **Storage** → **Create bucket**
3. Para cada bucket acima:
   - Informe o nome exato (ex: `comprovantes`)
   - Configure se é público ou privado
   - Defina os limites conforme especificado

---

## Políticas RLS (Row Level Security)

Depois de criar os buckets, você precisa configurar as políticas de acesso:

### Bucket: `comprovantes`

```sql
-- Upload: apenas admins e fisioterapeutas
CREATE POLICY "Admins e fisios podem fazer upload de comprovantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes' AND
  (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'fisioterapeuta')
);

-- Download: apenas admins e fisioterapeutas
CREATE POLICY "Admins e fisios podem ver comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes' AND
  (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'fisioterapeuta')
);

-- Delete: apenas admins e fisioterapeutas
CREATE POLICY "Admins e fisios podem deletar comprovantes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comprovantes' AND
  (auth.jwt() ->> 'user_role' = 'admin' OR auth.jwt() ->> 'user_role' = 'fisioterapeuta')
);
```

### Bucket: `prontuarios`

```sql
-- Upload: terapeutas e estagiários
CREATE POLICY "Terapeutas podem fazer upload em prontuários"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'prontuarios' AND
  auth.jwt() ->> 'user_role' IN ('admin', 'fisioterapeuta', 'estagiario')
);

-- Download: terapeutas veem todos, pacientes veem apenas os próprios
CREATE POLICY "Terapeutas veem todos os prontuários"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'prontuarios' AND
  auth.jwt() ->> 'user_role' IN ('admin', 'fisioterapeuta')
);

CREATE POLICY "Pacientes veem seus próprios arquivos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'prontuarios' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: apenas terapeutas
CREATE POLICY "Terapeutas podem deletar arquivos de prontuário"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'prontuarios' AND
  auth.jwt() ->> 'user_role' IN ('admin', 'fisioterapeuta')
);
```

### Bucket: `evolucao`

```sql
-- Upload: terapeutas e estagiários
CREATE POLICY "Terapeutas podem fazer upload de fotos de evolução"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evolucao' AND
  auth.jwt() ->> 'user_role' IN ('admin', 'fisioterapeuta', 'estagiario')
);

-- Download: terapeutas veem todos, pacientes veem apenas os próprios
CREATE POLICY "Terapeutas veem todas as fotos de evolução"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evolucao' AND
  auth.jwt() ->> 'user_role' IN ('admin', 'fisioterapeuta')
);

CREATE POLICY "Pacientes veem suas próprias fotos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evolucao' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: apenas terapeutas
CREATE POLICY "Terapeutas podem deletar fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'evolucao' AND
  auth.jwt() ->> 'user_role' IN ('admin', 'fisioterapeuta')
);
```

### Bucket: `avatars`

```sql
-- Upload: usuários podem fazer upload do próprio avatar
CREATE POLICY "Usuários podem fazer upload do próprio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Download: avatares são públicos
CREATE POLICY "Avatares são públicos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Update: apenas o próprio usuário
CREATE POLICY "Usuários podem atualizar próprio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete: apenas o próprio usuário
CREATE POLICY "Usuários podem deletar próprio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Estrutura de Pastas

Os arquivos devem seguir esta estrutura:

```
comprovantes/
  └── {evento_id}/
      └── {timestamp}_{filename}

prontuarios/
  └── {user_id}/
      └── {patient_id}/
          └── {timestamp}_{filename}

evolucao/
  └── {user_id}/
      └── {patient_id}/
          └── {measurement_id}/
              └── {timestamp}_{filename}

avatars/
  └── {user_id}/
      └── avatar.{ext}
```

---

## Testando o Storage

Após configurar tudo, teste o upload com este código:

```typescript
import { supabase } from '@/integrations/supabase/client';

// Testar upload de avatar
const testAvatarUpload = async (file: File) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const filePath = `${user.id}/avatar.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Upload failed:', error);
  } else {
    console.log('Upload success:', data);
  }
};
```

---

## Troubleshooting

### Erro: "new row violates row-level security policy"
- Verifique se as políticas RLS foram criadas corretamente
- Confirme que o usuário tem o role necessário
- Verifique se o caminho do arquivo segue a estrutura correta

### Erro: "File size exceeds maximum allowed"
- Verifique o limite de tamanho do bucket
- Comprima imagens antes do upload se necessário

### Erro: "Invalid mime type"
- Verifique se o tipo de arquivo está na lista de tipos permitidos
- Adicione o tipo necessário no bucket se apropriado

---

## Próximos Passos

Depois de configurar os buckets:
1. ✅ Atualizar `useFileUpload` hook para usar storage real
2. ✅ Integrar upload de comprovantes em Financeiro
3. ✅ Integrar upload de fotos em Evolução
4. ✅ Integrar upload de avatar em Perfil
