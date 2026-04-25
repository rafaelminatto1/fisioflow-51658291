import type { Meta, StoryObj } from "@storybook/react";
import { StatusColorManager } from "./StatusColorManager";

const meta = {
  title: "Schedule/StatusColorManager",
  component: StatusColorManager,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof StatusColorManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
