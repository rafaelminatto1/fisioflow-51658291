# Storybook Setup Guide

**Data:** 2026-02-18
**Status:** Planejado para Q2 2026

---

## 📚 Visão Geral

Este guia detalha como configurar e usar o Storybook para documentação de componentes do FisioFlow.

---

## 🚀 Instalação

### 1. Instalar Storybook

```bash
npx storybook@latest init
```

### 2. Instalar addons essenciais

```bash
pnpm add -D @storybook/addon-a11y @storybook/addon-interactions @storybook/addon-coverage
```

### 3. Configurar Vite

Criar `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-coverage',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': '/src',
        },
      },
    });
  },
};

export default config;
```

### 4. Configurar preview

Criar `.storybook/preview.tsx`:

```typescript
import type { Preview } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '../src/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Story />
        </BrowserRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
```

---

## 📝 Escrevendo Stories

### Exemplo: Button Component

Criar `src/components/ui/button.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Mail } from 'lucide-react';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="mr-2 h-4 w-4" />
        Login with Email
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: 'Loading...',
  },
};
```

### Exemplo: PatientCard Component

Criar `src/components/patients/PatientCard.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { PatientCard } from './PatientCard';
import { mockPatient } from '@/lib/testing/test-helpers';

const meta = {
  title: 'Features/Patients/PatientCard',
  component: PatientCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PatientCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    patient: mockPatient,
  },
};

export const WithLongName: Story = {
  args: {
    patient: {
      ...mockPatient,
      name: 'João da Silva Santos Oliveira Pereira',
    },
  },
};

export const Inactive: Story = {
  args: {
    patient: {
      ...mockPatient,
      status: 'inactive',
    },
  },
};
```

---

## 🧪 Interaction Tests

Adicionar testes de interação:

```typescript
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const WithInteraction: Story = {
  args: {
    children: 'Click me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  },
};
```

---

## 📊 Visual Regression Tests

### Setup Chromatic

```bash
pnpm add -D chromatic
```

Adicionar script no `package.json`:

```json
{
  "scripts": {
    "chromatic": "chromatic --project-token=<your-token>"
  }
}
```

---

## 🎨 Organização de Stories

```
src/
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── button.stories.tsx
│   │   ├── input.tsx
│   │   └── input.stories.tsx
│   ├── patients/
│   │   ├── PatientCard.tsx
│   │   ├── PatientCard.stories.tsx
│   │   ├── PatientForm.tsx
│   │   └── PatientForm.stories.tsx
│   └── schedule/
│       ├── CalendarView.tsx
│       └── CalendarView.stories.tsx
```

---

## 🚀 Scripts NPM

Adicionar ao `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "storybook:test": "test-storybook",
    "chromatic": "chromatic --project-token=<token>"
  }
}
```

---

## 📚 Documentação MDX

Criar `src/components/ui/Button.mdx`:

```mdx
import { Meta, Canvas, Story } from '@storybook/blocks';
import * as ButtonStories from './button.stories';

<Meta of={ButtonStories} />

# Button

Botão reutilizável com múltiplas variantes.

## Uso

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>
```

## Variantes

<Canvas of={ButtonStories.Default} />
<Canvas of={ButtonStories.Destructive} />
<Canvas of={ButtonStories.Outline} />

## Acessibilidade

- Suporta navegação por teclado
- ARIA labels apropriados
- Contraste de cores WCAG AA
```

---

## 🎯 Metas

### Q2 2026
- [ ] 50+ componentes documentados
- [ ] Interaction tests em componentes críticos
- [ ] Visual regression tests configurado
- [ ] CI/CD integration

### Q3 2026
- [ ] 100+ componentes documentados
- [ ] Design tokens documentados
- [ ] Accessibility guidelines
- [ ] Public Storybook deployment

---

**Última atualização:** 2026-02-18
