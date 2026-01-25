# FisioFlow Design System - Guia de Uso

Este documento contém exemplos práticos de como usar os componentes do design system no FisioFlow.

## Instalação

O pacote `@fisioflow/shared-ui` já está configurado no monorepo. Para usar nos apps:

```tsx
// Importar componentes individualmente
import { Button, Input, Card, useTheme, toast } from '@fisioflow/shared-ui';
```

## Tema e Cores

### Usar hook `useTheme`

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@fisioflow/shared-ui';

function MyComponent() {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text.primary }}>
        Texto com tema
      </Text>
    </View>
  );
}
```

### Controle de Tema (Dark Mode)

```tsx
import { useThemeControl } from '@fisioflow/shared-ui';

function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeControl();

  return (
    <Button onPress={toggleTheme}>
      {isDark ? 'Modo Claro' : 'Modo Escuro'}
    </Button>
  );
}
```

## Componentes

### Button

```tsx
import { Button, GradientButton } from '@fisioflow/shared-ui';
import { Ionicons } from '@expo/vector-icons';

// Botão primário
<Button onPress={handlePress}>
  Entrar
</Button>

// Botão com loading
<Button onPress={handlePress} loading={isLoading}>
  Salvando...
</Button>

// Variantes
<Button variant="secondary" onPress={handlePress}>
  Cancelar
</Button>

<Button variant="danger" onPress={handlePress}>
  Excluir
</Button>

// Botão outline
<Button variant="outline" onPress={handlePress}>
  Ação Secundária
</Button>

// Botão com ícone
<Button
  onPress={handlePress}
  leftIcon={<Ionicons name="add" size={20} color="#fff" />}
>
  Novo Item
</Button>

// Botão gradiente
<GradientButton onPress={handlePress}>
  Ação Destacada
</GradientButton>

// Botão full width
<Button onPress={handlePress} fullWidth>
  Botão Largo
</Button>
```

### Input

```tsx
import { Input } from '@fisioflow/shared-ui';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <>
      <Input
        label="E-mail"
        placeholder="seu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Input
        label="Senha"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error}
        helperText="Mínimo 8 caracteres"
      />
    </>
  );
}
```

### Card

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@fisioflow/shared-ui';

// Card básico
<Card>
  <Text>Conteúdo do card</Text>
</Card>

// Card com header e footer
<Card variant="elevated">
  <CardHeader
    title="Título do Card"
    subtitle="Descrição opcional"
  />
  <CardContent>
    <Text>Conteúdo principal aqui</Text>
  </CardContent>
  <CardFooter>
    <Button size="sm">Ação</Button>
  </CardFooter>
</Card>

// Card clicável
<Card pressable onPress={handlePress}>
  <CardHeader title="Item Clicável" />
</Card>

// Variants
<Card variant="outlined">
  <Text>Card com borda</Text>
</Card>

<Card variant="filled">
  <Text>Card com fundo cinza</Text>
</Card>

<Card variant="glass">
  <Text>Card com efeito glass</Text>
</Card>
```

### Avatar

```tsx
import { Avatar, AvatarWithStatus, AvatarGroup } from '@fisioflow/shared-ui';

// Avatar com imagem
<Avatar
  source={{ uri: 'https://...' }}
  size="md"
/>

// Avatar com iniciais
<Avatar
  name="João Silva"
  size="lg"
/>

// Avatar com status
<AvatarWithStatus
  name="Maria Santos"
  status="online"
  size="md"
/>

// Grupo de avatares
<AvatarGroup
  avatars={[
    { name: 'João Silva' },
    { name: 'Maria Santos' },
    { name: 'Pedro Costa' },
    { name: 'Ana Lima' },
    { name: 'Carlos Souza' },
  ]}
  size="sm"
  max={3}
/>
```

### Badge

```tsx
import { Badge, StatusBadge, CountBadge } from '@fisioflow/shared-ui';

// Badge básico
<Badge variant="success">Ativo</Badge>
<Badge variant="danger">Erro</Badge>
<Badge variant="warning">Pendente</Badge>

// Badge como dot
<Badge dot variant="success" />

// Status badge
<StatusBadge status="online" />
<StatusBadge status="away" showDot={false} />

// Count badge
<CountBadge count={5} />
<CountBadge count={150} max={99} />

// Badge com ícone
<Badge
  variant="primary"
  icon={<Ionicons name="checkmark" size={14} color="#fff" />}
/>
```

### Skeleton (Loading)

```tsx
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList
} from '@fisioflow/shared-ui';

// Skeleton básico
<Skeleton width={100} height={20} />

// Texto skeleton
<SkeletonText lines={3} />

// Avatar skeleton
<SkeletonAvatar size="md" />

// Card skeleton
<SkeletonCard
  avatar
  titleLines={2}
  descriptionLines={3}
/>

// Lista skeleton
<SkeletonList items={5} itemHeight={60} />
```

### Toast (Notificações)

```tsx
import { toast, useToast, ToastProvider } from '@fisioflow/shared-ui';

// No _layout.tsx ou root
function RootLayout() {
  return (
    <ToastProvider position="top">
      {/* resto do app */}
    </ToastProvider>
  );
}

// Usando toast global
toast.success('Login realizado com sucesso!');
toast.error('Erro ao salvar. Tente novamente.');
toast.warning('Atenção: dados incompletos.');
toast.info('Nova mensagem recebida.');

// Com ação
toast.show({
  message: 'Arquivo salvo',
  variant: 'success',
  action: {
    label: 'Desfazer',
    onPress: () => console.log('Desfazer'),
  },
});

// Usando hook
function MyComponent() {
  const { success, error } = useToast();

  const handleSubmit = async () => {
    try {
      await api.save();
      success('Salvo com sucesso!');
    } catch (e) {
      error('Erro ao salvar');
    }
  };
}
```

### Divider e Spacer

```tsx
import { Divider, Spacer } from '@fisioflow/shared-ui';

// Divider horizontal
<Divider />

<Divider label="OU" />

<Divider label="Seção 1" labelPosition="start" />

// Divider vertical
<Divider orientation="vertical" height={100} />

// Divider com cor personalizada
<Divider color="#3B82F6" thickness={2} />

// Spacer
<Spacer size={16} />
<Spacer orientation="horizontal" size={24} />
```

## Cores Disponíveis

### Primary (Azul)
- `primary.50` a `primary.900`
- Main: `primary.500` = #3B82F6

### Semantic
- `success.500` = #22C55E (Verde)
- `warning.500` = #F59E0B (Amarelo)
- `danger.500` = #EF4444 (Vermelho)
- `info.500` = #0EA5E9 (Azul claro)

### Gray
- `gray.50` a `gray.900`

### Background
- `colors.background` - Fundo principal
- `colors.backgroundSecondary` - Fundo secundário
- `colors.foreground` - Texto principal

## Espaçamento

Baseado em escala de 8px:

```tsx
const spacing = {
  1: 8,    // 0.5rem
  2: 16,   // 1rem
  3: 24,   // 1.5rem
  4: 32,   // 2rem
  5: 40,   // 2.5rem
  6: 48,   // 3rem
  // ...
};
```

## Border Radius

```tsx
borderRadius: {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
}
```

## Tamanhos de Fonte

```tsx
fontSize: {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  // ...
}
```

## Text Styles Predefinidos

```tsx
import { typography } from '@fisioflow/shared-ui';

// Display
typography.textStyles.displayLarge  // 36px, Bold
typography.textStyles.displayMedium // 30px, Bold
typography.textStyles.displaySmall  // 24px, Bold

// Headline
typography.textStyles.headlineLarge // 20px, SemiBold
typography.textStyles.headlineMedium // 18px, SemiBold
typography.textStyles.headlineSmall // 16px, SemiBold

// Body
typography.textStyles.bodyLarge // 16px, Regular
typography.textStyles.bodyMedium // 14px, Regular
typography.textStyles.bodySmall // 12px, Regular
```

## Exemplo Completo de Tela

```tsx
import { View, ScrollView } from 'react-native';
import {
  useTheme,
  Button,
  Input,
  Card,
  Avatar,
  Badge,
  Divider,
} from '@fisioflow/shared-ui';
import { toast } from '@fisioflow/shared-ui';

export default function ProfileScreen() {
  const theme = useTheme();

  const handleSave = async () => {
    try {
      await saveProfile();
      toast.success('Perfil atualizado!');
    } catch (e) {
      toast.error('Erro ao atualizar perfil');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Card variant="elevated">
        <CardContent style={{ alignItems: 'center', padding: 16 }}>
          <Avatar
            name="João Silva"
            size="xl"
          />
          <View style={{ marginTop: 12 }}>
            <Badge variant="success">Online</Badge>
          </View>
        </CardContent>
      </Card>

      <Divider style={{ marginVertical: 16 }} />

      <Card>
        <CardHeader title="Editar Perfil" />
        <CardContent style={{ gap: 12 }}>
          <Input
            label="Nome"
            placeholder="Seu nome"
            defaultValue="João Silva"
          />
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            defaultValue="joao@example.com"
            keyboardType="email-address"
          />
          <Input
            label="Telefone"
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />
        </CardContent>
        <CardFooter>
          <Button onPress={handleSave} fullWidth>
            Salvar Alterações
          </Button>
        </CardFooter>
      </Card>
    </ScrollView>
  );
}
```
