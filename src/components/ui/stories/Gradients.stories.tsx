import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Gradients",
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const AllGradients: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<h1 className="text-4xl font-display mb-8">Premium Gradients</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				<div className="gradient-brand text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Brand</h3>
					<p className="text-sm opacity-90">Sky Blue to Purple</p>
				</div>

				<div className="gradient-secondary text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Secondary</h3>
					<p className="text-sm opacity-90">Gray to Dark Blue</p>
				</div>

				<div className="gradient-accent text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Accent</h3>
					<p className="text-sm opacity-90">Emerald to Teal</p>
				</div>

				<div className="gradient-warm text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Warm</h3>
					<p className="text-sm opacity-90">Orange to Red</p>
				</div>

				<div className="gradient-cool text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Cool</h3>
					<p className="text-sm opacity-90">Blue to Cyan</p>
				</div>

				<div className="gradient-dark text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Dark</h3>
					<p className="text-sm opacity-90">Elevated Dark</p>
				</div>

				<div className="gradient-glass border border-white/20 p-8 rounded-2xl backdrop-blur-sm">
					<h3 className="text-2xl font-display mb-2 text-foreground">Glass</h3>
					<p className="text-sm opacity-70">Transparent Glassmorphism</p>
				</div>

				<div className="gradient-neon text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Neon</h3>
					<p className="text-sm opacity-90">Blue to Blue</p>
				</div>

				<div className="gradient-gold text-white p-8 rounded-2xl">
					<h3 className="text-2xl font-display mb-2">Gold</h3>
					<p className="text-sm opacity-90">Premium Gold</p>
				</div>
			</div>

			<h2 className="text-3xl font-display mt-12 mb-6">Light Variants</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				<div className="gradient-brand-light border border-primary/20 p-8 rounded-2xl">
					<h3 className="text-xl font-display mb-2 text-primary">
						Brand Light
					</h3>
					<p className="text-sm text-muted-foreground">Subtle background</p>
				</div>

				<div className="gradient-success-light border border-emerald-500/20 p-8 rounded-2xl">
					<h3 className="text-xl font-display mb-2 text-emerald-600">
						Success Light
					</h3>
					<p className="text-sm text-muted-foreground">Positive feedback</p>
				</div>

				<div className="gradient-warm-light border border-orange-500/20 p-8 rounded-2xl">
					<h3 className="text-xl font-display mb-2 text-orange-600">
						Warm Light
					</h3>
					<p className="text-sm text-muted-foreground">Warning/Attention</p>
				</div>

				<div className="gradient-accent-teal-light border border-teal-500/20 p-8 rounded-2xl">
					<h3 className="text-xl font-display mb-2 text-teal-600">
						Accent Teal Light
					</h3>
					<p className="text-sm text-muted-foreground">Highlights</p>
				</div>
			</div>
		</div>
	),
};
