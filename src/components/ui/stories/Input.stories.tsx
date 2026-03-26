import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
	title: "Design System/Input",
	component: Input,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "glass", "brand-light", "success-light"],
			description: "Premium gradient variant",
		},
		premium: {
			control: "boolean",
			description: "Enable premium focus with glow effect",
		},
		placeholder: {
			control: "text",
			description: "Input placeholder text",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
	args: {
		placeholder: "Default input...",
	},
};

export const GlassVariant: Story = {
	args: {
		variant: "glass",
		premium: true,
		placeholder: "Glass variant...",
	},
};

export const BrandLightVariant: Story = {
	args: {
		variant: "brand-light",
		premium: true,
		placeholder: "Brand light variant...",
	},
};

export const SuccessLightVariant: Story = {
	args: {
		variant: "success-light",
		premium: true,
		placeholder: "Success light variant...",
	},
};

export const AllVariants: Story = {
	render: (args) => (
		<div className="space-y-4 max-w-md">
			<Input {...args} variant="default" placeholder="Default variant" />
			<Input {...args} variant="glass" premium placeholder="Glass variant" />
			<Input
				{...args}
				variant="brand-light"
				premium
				placeholder="Brand light"
			/>
			<Input
				{...args}
				variant="success-light"
				premium
				placeholder="Success light"
			/>
		</div>
	),
};
