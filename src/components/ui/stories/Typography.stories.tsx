import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Typography",
	tags: ["autodocs"],
};

export default meta;

export const FontDisplay: StoryObj = {
	render: () => (
		<div className="space-y-8 p-8">
			<div className="space-y-4">
				<h2 className="text-4xl font-display text-foreground">
					Font Display - Heading Level 1
				</h2>
				<h3 className="text-3xl font-display-title text-primary">
					Font Display Title
				</h3>
				<h4 className="text-2xl font-display-heading text-muted-foreground">
					Font Display Heading
				</h4>
				<p className="text-xl font-display-body text-foreground">
					Font Display Body text
				</p>
			</div>

			<div className="space-y-4">
				<h2 className="text-3xl font-display tracking-tight">
					Tracking Variants
				</h2>
				<p className="font-display tracking-tight">tracking-tight (-0.03em)</p>
				<p className="font-display tracking-widest">tracking-widest (0.1em)</p>
				<p className="font-display tracking-wider">tracking-wider (0.15em)</p>
			</div>

			<div className="space-y-4">
				<h2 className="text-2xl font-display uppercase tracking-wider">
					Uppercase with Tracking
				</h2>
				<p className="font-display uppercase tracking-tighter text-sm text-muted-foreground">
					THIS IS UPPERCASE TEXT WITH TIGHTER TRACKING
				</p>
			</div>
		</div>
	),
};

export const ColorVariants: StoryObj = {
	render: () => (
		<div className="space-y-4 p-8">
			<h2 className="text-2xl font-display text-foreground mb-4">
				Color Variants
			</h2>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<div className="gradient-brand text-primary-foreground p-4 rounded-2xl">
					<h3 className="text-xl font-display">Primary Text</h3>
					<p className="text-sm opacity-90">On brand gradient background</p>
				</div>
				<div className="gradient-success text-white p-4 rounded-2xl">
					<h3 className="text-xl font-display">Success Text</h3>
					<p className="text-sm opacity-90">On success gradient background</p>
				</div>
				<div className="gradient-warm text-white p-4 rounded-2xl">
					<h3 className="text-xl font-display">Warm Text</h3>
					<p className="text-sm opacity-90">On warm gradient background</p>
				</div>
			</div>

			<div className="mt-8 space-y-4">
				<h3 className="text-lg font-display text-foreground">Sizes</h3>
				<p className="text-5xl font-display">Extra Large - 5xl</p>
				<p className="text-4xl font-display-title">Large - 4xl</p>
				<p className="text-3xl font-display-heading">Medium - 3xl</p>
				<p className="text-2xl font-display-body">Small - 2xl</p>
				<p className="text-xl font-display">Base - xl</p>
			</div>
		</div>
	),
};
