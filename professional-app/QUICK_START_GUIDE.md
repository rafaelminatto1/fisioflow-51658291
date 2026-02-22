# 🚀 Guia Rápido de Início - App Mobile Profissional

## 📱 Sobre o App

App mobile para profissionais de fisioterapia gerenciarem pacientes, agendamentos, evoluções SOAP e protocolos de tratamento.

**Status Atual**: 89% completo | **Pronto para**: Beta Testing

---

## 🛠️ Setup Inicial

### Pré-requisitos:
```bash
- Node.js 18+
- npm ou yarn
- Expo CLI
- Expo Go app (para testes)
- Firebase/Firestore configurado
```

### Instalação:
```bash
# Clonar repositório
git clone [repo-url]

# Navegar para o app
cd professional-app

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm start
```

### Variáveis de Ambiente:
Criar arquivo `.env` com:
```
FIREBASE_API_KEY=your_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_APP_ID=your_app_id
```

---

## 📁 Estrutura do Projeto

```
professional-app/
├── app/                    # Páginas (Expo Router)
│   ├── (auth)/            # Autenticação
│   ├── (tabs)/            # Tabs principais
│   ├── patient/           # Pacientes
│   ├── evolution-*.tsx    # Evoluções SOAP
│   ├── protocol-*.tsx     # Protocolos
│   └── apply-protocol.tsx # Aplicar protocolo
├── components/            # Componentes reutilizáveis
│   ├── evolution/        # Componentes de evolução
│   ├── calendar/         # Componentes de calendário
│   └── ui/               # Componentes base
├── hooks/                # Custom hooks
├── lib/                  # Utilitários e configs
├── store/                # Estado global
├── types/                # TypeScript types
└── utils/                # Funções auxiliares
```

---

## 🎯 Funcionalidades Principais

### ✅ Implementadas (Prontas):

#### 1. Evoluções SOAP (95%)
**Arquivos**:
- `app/evolution-form.tsx` - Criar
- `app/evolution-detail.tsx` - Ver/Editar
- `app/evolutions-list.tsx` - Lista
- `components/evolution/SOAPForm.tsx`
- `components/evolution/PainLevelSlider.tsx`
- `components/evolution/PhotoUpload.tsx`

**Como usar**:
```typescript
import { useEvolutions } from '@/hooks';

const { evolutions, create, update, delete } = useEvolutions(patientId);
```

#### 2. Upload de Fotos (100%)
**Arquivo**: `components/evolution/PhotoUpload.tsx`

**Como usar**:
```typescript
import { PhotoUpload } from '@/components/evolution/PhotoUpload';

<PhotoUpload
  photos={photos}
  onPhotosChange={setPhotos}
  colors={colors}
/>
```

#### 3. Protocolos (60% - UI completa)
**Arquivos**:
- `app/protocols.tsx` - Lista
- `app/protocol-form.tsx` - Criar/Editar
- `app/protocol-detail.tsx` - Detalhes
- `app/apply-protocol.tsx` - Aplicar

**Status**: UI pronta, backend pendente

---

## 🔧 Próximas Implementações

### 1. Backend de Protocolos (4-6h)

**Criar hook**: `hooks/useProtocols.ts`
```typescript
export function useProtocols() {
  // Implementar CRUD com Firestore
  return {
    protocols,
    create,
    update,
    delete,
    duplicate,
  };
}
```

**Firestore Collection**: `treatment_protocols`
```typescript
{
  id: string
  name: string
  description: string
  category: string
  exercises: ProtocolExercise[]
  professional_id: string
  is_template: boolean
  created_at: timestamp
}
```

### 2. Modo Offline (8-10h)

**Implementar**: `lib/offline-storage.ts`
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveOffline(key, data) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function getOffline(key) {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}
```

### 3. Upload Firebase Storage (3-4h)

**Implementar**: `lib/storage.ts`
```typescript
import { storage } from '@/lib/firebase';

export async function uploadPhoto(uri: string, path: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ref = storage.ref(path);
  await ref.put(blob);
  return await ref.getDownloadURL();
}
```

---

## 📚 Documentação Importante

### Leia Primeiro:
1. `FINAL_IMPLEMENTATION_REPORT.md` - Relatório completo
2. `APP_ANALYSIS_AND_ROADMAP.md` - Análise e roadmap
3. `EXECUTIVE_SUMMARY.md` - Resumo executivo

### Para Desenvolvimento:
4. `TESTING_GUIDE.md` - Guia de testes
5. `PROTOCOLS_COMPLETE.md` - Protocolos detalhado
6. `IMPLEMENTATION_COMPLETE.md` - Evoluções detalhado

---

## 🐛 Debug e Troubleshooting

### Erros Comuns:

#### 1. Firestore Permission Denied
```typescript
// Verificar em lib/firestore-fallback.ts
// Usar fallback sem Cloud Functions
const useCloudFunctions = false;
```

#### 2. Expo Image Picker não funciona
```bash
# Instalar dependência
npx expo install expo-image-picker

# Verificar permissões em app.json
"permissions": ["CAMERA", "MEDIA_LIBRARY"]
```

#### 3. TypeScript Errors
```bash
# Limpar cache
npm run clean

# Reinstalar
rm -rf node_modules
npm install
```

---

## 🧪 Testes

### Rodar Testes:
```bash
# Testes unitários
npm test

# Testes com UI
npm run test:ui

# Coverage
npm run test:coverage
```

### Testar no Dispositivo:
```bash
# Iniciar Expo
npm start

# Escanear QR code com Expo Go
# Ou pressionar 'i' para iOS / 'a' para Android
```

---

## 📝 Convenções de Código

### Nomenclatura:
- **Componentes**: PascalCase (`PatientCard.tsx`)
- **Hooks**: camelCase com `use` (`usePatients.ts`)
- **Tipos**: PascalCase (`Patient`, `Appointment`)
- **Funções**: camelCase (`formatDate`, `validateForm`)

### Estrutura de Componente:
```typescript
import { useState } from 'react';
import { View, Text } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

interface Props {
  title: string;
}

export function MyComponent({ title }: Props) {
  const colors = useColors();
  const [state, setState] = useState('');

  const handleAction = () => {
    // Handler logic
  };

  return (
    <View>
      <Text style={{ color: colors.text }}>{title}</Text>
    </View>
  );
}
```

### Imports:
```typescript
// Externos primeiro
import { useState } from 'react';
import { View } from 'react-native';

// Internos depois
import { useColors } from '@/hooks/useColorScheme';
import { Patient } from '@/types';
```

---

## 🎨 Temas e Cores

### Usar Hook de Cores:
```typescript
import { useColors } from '@/hooks/useColorScheme';

const colors = useColors();

// Cores disponíveis:
colors.primary      // Cor primária
colors.background   // Fundo
colors.surface      // Cards
colors.text         // Texto principal
colors.textSecondary // Texto secundário
colors.border       // Bordas
colors.success      // Verde
colors.error        // Vermelho
colors.warning      // Amarelo
colors.info         // Azul
```

---

## 🔄 Estado e Cache

### TanStack Query:
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Query
const { data, isLoading } = useQuery({
  queryKey: ['patients'],
  queryFn: getPatients,
});

// Mutation
const mutation = useMutation({
  mutationFn: createPatient,
  onSuccess: () => {
    queryClient.invalidateQueries(['patients']);
  },
});
```

---

## 📱 Navegação

### Expo Router:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navegar
router.push('/patient/123');

// Voltar
router.back();

// Substituir
router.replace('/login');

// Com parâmetros
router.push(`/patient/${id}?tab=evolutions`);
```

---

## 🎯 Checklist para Nova Feature

- [ ] Criar tipos em `types/index.ts`
- [ ] Criar hook em `hooks/`
- [ ] Criar componentes em `components/`
- [ ] Criar página em `app/`
- [ ] Adicionar navegação
- [ ] Testar funcionalidade
- [ ] Verificar TypeScript (0 erros)
- [ ] Testar tema claro/escuro
- [ ] Adicionar feedback háptico
- [ ] Documentar no README

---

## 🚀 Deploy

### Build de Produção:
```bash
# Build Android
eas build --platform android

# Build iOS
eas build --platform ios

# Build ambos
eas build --platform all
```

### Publicar Update:
```bash
# Publicar OTA update
eas update --branch production
```

---

## 📞 Suporte

### Recursos:
- **Documentação Expo**: https://docs.expo.dev
- **React Native**: https://reactnative.dev
- **Firebase**: https://firebase.google.com/docs

### Contatos:
- **Tech Lead**: [email]
- **Product Owner**: [email]
- **Slack**: #fisioflow-mobile

---

## 🎉 Dicas Rápidas

### Performance:
- Use `React.memo` para componentes pesados
- Use `useMemo` e `useCallback` apropriadamente
- Lazy load de imagens
- Virtualização em listas longas

### UX:
- Sempre adicione feedback háptico
- Loading states em todas as ações
- Validação em tempo real
- Mensagens de erro claras

### Código:
- Mantenha componentes pequenos (<300 linhas)
- Extraia lógica para hooks
- Reutilize componentes
- Documente código complexo

---

## ✅ Status das Features

| Feature | Status | Arquivo Principal |
|---------|--------|-------------------|
| Autenticação | ✅ 100% | `app/(auth)/login.tsx` |
| Dashboard | ✅ 100% | `app/(tabs)/index.tsx` |
| Pacientes | ✅ 100% | `app/patients.tsx` |
| Agendamentos | ✅ 100% | `app/(tabs)/agenda.tsx` |
| Evoluções SOAP | ✅ 95% | `app/evolution-*.tsx` |
| Upload Fotos | ✅ 100% | `components/evolution/PhotoUpload.tsx` |
| Protocolos | ⚠️ 60% | `app/protocol-*.tsx` |
| Exercícios | ⚠️ 60% | `app/exercises.tsx` |
| Financeiro | ✅ 90% | `app/patient/[id].tsx` |
| Modo Offline | ❌ 0% | - |

---

**Última atualização**: 21/02/2026
**Versão do App**: 0.9.0
**Status**: Beta Testing Ready 🚀
