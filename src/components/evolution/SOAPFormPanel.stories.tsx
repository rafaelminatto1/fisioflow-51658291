import type { Meta, StoryObj } from '@storybook/react';
import { SOAPFormPanel } from './SOAPFormPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const meta = {
  title: 'Evolution/SOAPFormPanel',
  component: SOAPFormPanel,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={qc}>
        <div className="max-w-2xl">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof SOAPFormPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    patientId: 'patient-001',
    sessionId: undefined,
    onSave: async (data) => { console.log('Saved:', data); },
  },
};

export const PreFilled: Story = {
  args: {
    patientId: 'patient-001',
    sessionId: 'session-001',
    initialData: {
      subjective: 'Paciente relata dor nível 5/10 na região lombar.',
      objective: 'Amplitude de flexão lombar reduzida. Força muscular 4/5.',
      assessment: 'Evolução positiva. Redução de 2 pontos na escala de dor.',
      plan: 'Manter exercícios de McKenzie. Retorno em 7 dias.',
    },
    onSave: async (data) => { console.log('Saved:', data); },
  },
};
