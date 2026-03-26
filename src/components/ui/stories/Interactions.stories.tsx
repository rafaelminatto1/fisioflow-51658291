import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
	title: "Design System/Interactions",
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const PremiumHover: Story = {
	render: () => (
		<div className="p-8 space-y-6">
			<h2 className="text-3xl font-display text-foreground mb-4">
				Premium Hover Effects
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div className="gradient-brand text-white p-6 rounded-2xl card-premium-hover">
					<h3 className="text-xl font-display text-foreground">
						Brand Gradient
					</h3>
					<p className="text-sm text-white/80">
						Sky blue to purple gradient with elevation effect
					</p>
				</div>

				<div className="gradient-success text-white p-6 rounded-2xl card-premium-hover">
					<h3 className="text-xl font-display text-foreground">
						Success Gradient
					</h3>
					<p className="text-sm text-white/80">
						Emerald gradient for positive feedback
					</p>
				</div>

				<div className="gradient-warm text-white p-6 rounded-2xl card-premium-hover">
					<h3 className="text-xl font-display text-foreground">
						Warm Gradient
					</h3>
					<p className="text-sm text-white/80">
						Orange to red gradient for attention
					</p>
				</div>

				<div className="gradient-dark text-white p-6 rounded-2xl card-premium-hover">
					<h3 className="text-xl font-display text-foreground">
						Dark Gradient
					</h3>
					<p className="text-sm text-white/80">
						Elevated dark gradient for premium feel
					</p>
				</div>

				<div className="gradient-glass backdrop-blur-xl border border-white/20 bg-white/5 p-6 rounded-2xl card-premium-hover">
					<h3 className="text-xl font-display text-foreground">
						Glass Variant
					</h3>
					<p className="text-sm text-muted-foreground">
						Glassmorphism with blur effects
					</p>
				</div>
			</div>
		</div>
	),
};

export const FocusStates: Story = {
	render: () => (
		<div className="p-8 space-y-6">
			<h2 className="text-3xl font-display text-foreground mb-4">
				Focus States
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="gradient-brand-light p-6 rounded-2xl focus-glow-primary-strong">
					<h3 className="text-xl font-display text-primary">Focus with Glow</h3>
					<p className="text-sm text-muted-foreground">
						Outline + Glow effect with primary color
					</p>
				</div>

				<div className="gradient-brand-light p-6 rounded-2xl focus-scale-lg">
					<h3 className="text-xl font-display text-primary">
						Focus with Scale
					</h3>
					<p className="text-sm text-muted-foreground">
						Scale + Outline effect for better visibility
					</p>
				</div>
			</div>
		</div>
	),
};

export const ActivePressed: Story = {
	render: () => (
		<div className="p-8 space-y-6">
			<h2 className="text-3xl font-display text-foreground mb-4">
				Active/Pressed States
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<button className="button-active-primary text-white p-6 rounded-2xl w-full">
					Press Me
				</button>

				<div className="bg-card p-6 rounded-2xl card-pressed">
					<h3 className="text-xl font-display text-foreground">Card Pressed</h3>
					<p className="text-sm text-muted-foreground">
						Scale down + Darken background
					</p>
				</div>

				<div className="input-focus-glow bg-card p-6 rounded-2xl">
					<h3 className="text-xl font-display text-foreground">Input Focus</h3>
					<p className="text-sm text-muted-foreground">Glow effect on focus</p>
				</div>
			</div>
		</div>
	),
};

export const Transitions: Story = {
  render: () => (
    <div className="p-8 space-y-6">
      <h2 className="text-3xl font-display text-foreground mb-4">Premium Transitions</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border-border/40">
          <h3 className="text-xl font-display text-foreground">Fade Up</h3>
          <p className="text-sm text-muted-foreground mb-2">Animate in from bottom with fade</p>
          <div className="mt-4 h-2 w-full bg-muted/20 rounded-lg overflow-hidden">
            <div className="animate-premium-fade-up h-full w-full bg-emerald-500" />
          </div>
        </div>

        <div className="p-6 rounded-2xl border-border/40">
          <h3 className="text-xl font-display text-foreground">Scale In</h3>
          <p className="text-sm text-muted-foreground mb-2">Scale from 0.95 to 1.02 then to 1</p>
          <div className="mt-4 h-2 w-full bg-muted/20 rounded-lg overflow-hidden">
            <div className="animate-premium-scale-in h-full w-full bg-emerald-500" />
          </div>
        </div>

        <div className="p-6 rounded-2xl border-border/40">
          <h3 className="text-xl font-display text-foreground">Slide Up</h3>
          <p className="text-sm text-muted-foreground mb-2">Slide from bottom with fade</p>
          <div className="mt-4 h-2 w-full bg-muted/20 rounded-lg overflow-hidden">
            <div className="animate-premium-slide-up h-full w-full bg-emerald-500" />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border-border/40 mt-8">
        <h3 className="text-xl font-display text-foreground">Glow Pulse</h3>
          <p className="text-sm text-muted-foreground mb-2">Pulsing glow effect</p>
          <div className="mt-4 h-16 w-full bg-muted/20 rounded-lg overflow-hidden">
            <div className="h-4 animate-premium-glow-pulse w-full bg-primary/20 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
),
}

export const CombinedExample: Story = {
	render: () => (
		<div className="p-8 space-y-6">
			<h2 className="text-3xl font-display text-foreground mb-4">
				Combined Effects
			</h2>

			<div className="space-y-8">
				<div className="p-8 gradient-brand text-white rounded-2xl magnetic-button glow-on-hover">
					<h3 className="text-xl font-display">Button with All Effects</h3>
					<p className="text-white/80">
						Magnetic + Glow hover + Magnetic scale
					</p>
				</div>

				<div className="p-8 gradient-dark text-white rounded-2xl card-premium-hover magnetic-button glow-on-hover">
					<h3 className="text-xl font-display">Card with Hover + Magnetic</h3>
					<p className="text-white/80">Premium hover + magnetic effect</p>
				</div>

				<div className="p-8 gradient-neon text-white rounded-2xl glow-on-hover animate-premium-glow-pulse">
					<h3 className="text-xl font-display text-white">Glow Card</h3>
					<p className="text-white/80">Pulsing neon glow effect</p>
				</div>
			</div>
		</div>
	),
};
