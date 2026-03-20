import type { Meta, StoryObj } from "@storybook/react";
import { ComponentErrorBoundary } from "./ComponentErrorBoundary";

const BrokenComponent = () => {
	throw new Error("Componente com falha!");
};

const meta = {
	title: "Error/ComponentErrorBoundary",
	component: ComponentErrorBoundary,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
} satisfies Meta<typeof ComponentErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithError: Story = {
	args: {
		children: <BrokenComponent />,
		componentName: "BrokenComponent",
	},
};

export const WithoutError: Story = {
	args: {
		children: (
			<div className="p-4 bg-green-50 rounded border border-green-200">
				Componente saudável ✅
			</div>
		),
		componentName: "HealthyComponent",
	},
};
