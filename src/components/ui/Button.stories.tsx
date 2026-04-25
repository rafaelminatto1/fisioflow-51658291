import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Loader2, Save, Trash2 } from "lucide-react";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Salvar", variant: "default" },
};

export const Destructive: Story = {
  args: { children: "Excluir", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Cancelar", variant: "outline" },
};

export const Secondary: Story = {
  args: { children: "Secundário", variant: "secondary" },
};

export const Ghost: Story = {
  args: { children: "Fantasma", variant: "ghost" },
};

export const Disabled: Story = {
  args: { children: "Desabilitado", disabled: true },
};

export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Salvando…
      </>
    ),
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Save className="mr-2 h-4 w-4" />
        Salvar Alterações
      </>
    ),
  },
};

export const SmallDestructive: Story = {
  args: {
    children: (
      <>
        <Trash2 className="mr-1 h-3 w-3" />
        Remover
      </>
    ),
    variant: "destructive",
    size: "sm",
  },
};
