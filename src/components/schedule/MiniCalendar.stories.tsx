import type { Meta, StoryObj } from '@storybook/react';
import { MiniCalendar } from './MiniCalendar';
import { useState } from 'react';

const ControlledCalendar = (args: any) => {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  return <MiniCalendar {...args} selectedDate={selected} onDateSelect={setSelected} />;
};

const meta = {
  title: 'Schedule/MiniCalendar',
  component: MiniCalendar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  render: (args) => <ControlledCalendar {...args} />,
} satisfies Meta<typeof MiniCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithHighlightedDates: Story = {
  args: {
    highlightedDates: [
      new Date(new Date().setDate(new Date().getDate() + 1)),
      new Date(new Date().setDate(new Date().getDate() + 3)),
      new Date(new Date().setDate(new Date().getDate() + 7)),
    ],
  },
};
