import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
	title: "Design System/Button",
	component: Button,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"destructive",
				"outline",
				"secondary",
				"ghost",
				"link",
				"medical",
				"brand",
				"success",
				"warm",
				"dark",
				"neon",
				"accent-teal",
			],
			description: "Premium gradient variant",
		},
		size: {
			control: "select",
			options: ["default", "sm", "lg", "icon"],
			description: "Button size",
		},
		magnetic: {
			control: "boolean",
			description: "Enable magnetic hover effect with scale",
		},
		glow: {
			control: "boolean",
			description: "Enable glow effect on hover",
		},
		premium: {
			control: "boolean",
			description: "Enable all premium effects (magnetic + glow)",
		},
		children: {
			control: "text",
			description: "Button text",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
	args: {
		children: "Default Button",
	},
};

export const PremiumBrand: Story = {
	args: {
		variant: "brand",
		size: "lg",
		premium: true,
		children: "Premium Brand",
	},
};

export const PremiumSuccess: Story = {
	args: {
		variant: "success",
		size: "lg",
		premium: true,
		children: "Premium Success",
	},
};

export const PremiumWarm: Story = {
	args: {
		variant: "warm",
		size: "lg",
		premium: true,
		children: "Premium Warm",
	},
};

export const PremiumDark: Story = {
	args: {
		variant: "dark",
		size: "lg",
		premium: true,
		children: "Premium Dark",
	},
};

export const PremiumNeon: Story = {
	args: {
		variant: "neon",
		size: "lg",
		premium: true,
		glow: true,
		children: "Premium Neon with Glow",
	},
};

export const MagneticOnly: Story = {
	args: {
		variant: "outline",
		size: "lg",
		magnetic: true,
		children: "Magnetic Effect Only",
	},
};

export const GlowOnly: Story = {
	args: {
		variant: "outline",
		size: "lg",
		glow: true,
		children: "Glow Effect Only",
	},
};

export const AllSizes: Story = {
	args: {
		variant: "brand",
		premium: true,
		children: "Button",
	},
	render: (args) => (
		<div className="flex flex-wrap gap-4">
			<Button {...args} size="sm">
				Small
			</Button>
			<Button {...args} size="default">
				Default
			</Button>
			<Button {...args} size="lg">
				Large
			</Button>
			<Button {...args} size="icon">
				Icon
			</Button>
		</div>
	),
};

export const AllGradients: Story = {
	render: (args) => (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
			<Button {...args} variant="brand" size="lg" premium>
				Brand
			</Button>
			<Button {...args} variant="success" size="lg" premium>
				Success
			</Button>
			<Button {...args} variant="warm" size="lg" premium>
				Warm
			</Button>
			<Button {...args} variant="dark" size="lg" premium>
				Dark
			</Button>
			<Button {...args} variant="neon" size="lg" premium glow>
				Neon
			</Button>
			<Button {...args} variant="accent-teal" size="lg" premium>
				Accent Teal
			</Button>
			<Button {...args} variant="medical" size="lg">
				Medical
			</Button>
		</div>
	),
};
