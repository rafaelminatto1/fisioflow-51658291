# Correções para Build do EAS com Monorepo

## Problemas Identificados e Corrigidos

### 1. Prioridade de Extensões Nativas (`metro.config.js`)
**Problema:** O Metro Bundler não estava priorizando arquivos `.native.tsx` sobre `.tsx`, resultando no código web sendo incluído no bundle.

**Solução:** Reorganizou `config.resolver.sourceExts` para colocar `.native.*` no topo da lista:
```javascript
config.resolver.sourceExts = [
  'native.ts',
  'native.tsx',
  'native.js',
  'native.jsx',
  // ... extensões restantes
];
```

### 2. Transpilação do packages/ui (`babel.config.js`)
**Problema:** O código TypeScript do `packages/ui` não estava sendo transpilado para o bundle, causando erros de sintaxe JSX.

**Solução:** Adicionou overrides para transpilar especificamente o `packages/ui`:
```javascript
overrides: [
  {
    test: /\.tsx?$/,
    include: [packagesUiRoot],
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  },
],
```

### 3. Stub para framer-motion (`stubs/framer-motion.js`)
**Problema:** O `framer-motion` (biblioteca de animação web) estava sendo incluído no bundle mobile, causando erros.

**Solução:** Criou um stub vazio que redireciona todas as importações de `framer-motion` para uma versão mobile-safe.

### 4. Configuração de exports do packages/ui (`packages/ui/package.json`)
**Problema:** O campo `exports` não especificava a condição `react-native`, dificultando a resolução correta.

**Solução:** Adicionou a condição `react-native` às exports:
```json
"exports": {
  ".": {
    "react-native": "./src/index.ts",
    // ...
  }
}
```

### 5. Watch Folders refinadas (`metro.config.js`)
**Problema:** A configuração anterior incluía a raiz inteira do monorepo, o que podia causar processamento desnecessário de código web.

**Solução:** Alterou para incluir apenas o `packages/ui`:
```javascript
config.watchFolders = [packagesUiRoot];
```

## Arquivos Modificados

1. `professional-app/metro.config.js` - Configuração do Metro Bundler
2. `professional-app/babel.config.js` - Configuração do Babel
3. `professional-app/package.json` - Adicionado `lucide-react-native` e pnpm overrides
4. `packages/ui/package.json` - Adicionada condição `react-native` nas exports
5. `professional-app/stubs/framer-motion.js` - NOVO: Stub para framer-motion

## Passos para Testar

### 1. Limpar caches e reinstalar dependências

```bash
cd professional-app

# Limpar cache do Metro
rm -rf node_modules/.cache

# Limpar cache do Expo
npx expo start --clear

# Se ainda houver problemas, limpar tudo:
rm -rf node_modules
cd ..
pnpm install
cd professional-app
```

### 2. Testar build local

```bash
# Testar com Expo Development Build
npx expo run:ios

# Ou testar o bundle com:
npx expo export
```

### 3. Verificar o bundle

```bash
# Verificar quais arquivos estão sendo incluídos no bundle
npx expo export --output-dir dist

# Analisar o bundle
cat dist/main.jsbundle | head -100
```

### 4. Testar build do EAS

```bash
# Development build (para testar antes do production)
eas build --profile development --platform ios

# Preview build
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform ios
```

## Verificações Importantes

### 1. Verificar se arquivos .native.tsx estão sendo usados

No log de build, procure por linhas como:
```
transforming packages/ui/src/components/MotionCard.native.tsx
```

Se você vir apenas `.tsx` sem `.native`, há um problema com a resolução.

### 2. Verificar se framer-motion está no bundle

Procure no bundle por:
```
require('framer-motion')
```

Se encontrar, o stub não está funcionando.

### 3. Verificar se lucide-react está no bundle

Se você encontrar `require('lucide-react')` no bundle, significa que o código web está sendo usado.

## Solução de Problemas

### Erro: "Cannot find module 'framer-motion'"

O stub pode não estar sendo resolvido corretamente. Verifique:
- O arquivo `stubs/framer-motion.js` existe
- O caminho no alias está correto

### Erro: "SyntaxError: Unexpected token <"

Isso indica que o TypeScript/JSX não está sendo transpilado. Verifique:
- O `babel.config.js` está correto
- O caminho `packagesUiRoot` aponta para o local correto

### Erro: "Module not found: Can't resolve '@fisioflow/ui'"

Verifique:
- O symlink foi criado corretamente pelo pnpm
- O `package.json` do packages/ui tem o campo `main` apontando para o local correto

## Próximos Passos

Se o build ainda falhar após essas correções:

1. Capture o log completo do build do EAS
2. Procure por linhas contendo "Bundling" ou "transforming"
3. Verifique se há erros de sintaxe ou módulos não encontrados
4. Ajuste a configuração conforme necessário
