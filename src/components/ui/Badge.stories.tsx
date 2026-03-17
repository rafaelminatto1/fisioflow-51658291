import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Agendado', variant: 'default' },
};

export const Secondary: Story = {
  args: { children: 'Confirmado', variant: 'secondary' },
};

export const Destructive: Story = {
  args: { children: 'Cancelado', variant: 'destructive' },
};

export const Outline: Story = {
  args: { children: 'Pendente', variant: 'outline' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Agendado</Badge>
      <Badge variant="secondary">Confirmado</Badge>
      <Badge variant="outline">Pendente</Badge>
      <Badge variant="destructive">Cancelado</Badge>
      <Badge className="bg-green-100 text-green-800">Concluído</Badge>
      <Badge className="bg-yellow-100 text-yellow-800">Faltou</Badge>
      <Badge className="bg-purple-100 text-purple-800">Remarcado</Badge>
    </div>
  ),
};
