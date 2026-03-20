import type { Meta, StoryObj } from "@storybook/react";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

// Componente que lança erro propositalmente para testar o boundary
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
	if (shouldThrow) {
		throw new Error("Erro simulado para o Storybook!");
	}
	return (
		<div className="p-4 text-green-700 font-medium">
			Conteúdo normal sem erros ✅
		</div>
	);
};

const meta = {
	title: "Error/GlobalErrorBoundary",
	component: GlobalErrorBoundary,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
} satisfies Meta<typeof GlobalErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutError: Story = {
	args: {
		children: <ErrorThrowingComponent shouldThrow={false} />,
	},
};

export const WithError: Story = {
	args: {
		children: <ErrorThrowingComponent shouldThrow={true} />,
	},
};

export const WithCustomFallback: Story = {
	args: {
		children: <ErrorThrowingComponent shouldThrow={true} />,
		fallback: (
			<div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
				<h2 className="text-orange-700 font-bold">Fallback customizado</h2>
				<p className="text-orange-600 text-sm mt-1">
					Este fallback foi passado via prop.
				</p>
			</div>
		),
	},
};
