import type { Meta, StoryObj } from "@storybook/react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./card";

const meta: Meta<typeof Card> = {
	title: "Design System/Card",
	component: Card,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"brand",
				"success",
				"warm",
				"dark",
				"neon",
				"glass",
				"accent-teal",
			],
			description: "Premium gradient variant",
		},
		premiumHover: {
			control: "boolean",
			description: "Enable premium hover effect with elevation",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
	args: {
		children: (
			<>
				<CardHeader>
					<CardTitle>Default Card</CardTitle>
					<CardDescription>Basic card without gradient</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This is the default card style without premium gradient.</p>
				</CardContent>
			</>
		),
	},
};

export const BrandGradient: Story = {
	args: {
		variant: "brand",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Brand Gradient</CardTitle>
					<CardDescription>Premium sky blue to purple gradient</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses the brand gradient with premium hover effects.</p>
				</CardContent>
			</>
		),
	},
};

export const SuccessGradient: Story = {
	args: {
		variant: "success",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Success Gradient</CardTitle>
					<CardDescription>Emerald green gradient</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses the success gradient for positive feedback.</p>
				</CardContent>
			</>
		),
	},
};

export const WarmGradient: Story = {
	args: {
		variant: "warm",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Warm Gradient</CardTitle>
					<CardDescription>Orange to red gradient</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses the warm gradient for attention.</p>
				</CardContent>
			</>
		),
	},
};

export const DarkGradient: Story = {
	args: {
		variant: "dark",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Dark Gradient</CardTitle>
					<CardDescription>Elevated dark gradient</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses the dark gradient for premium feel.</p>
				</CardContent>
			</>
		),
	},
};

export const NeonGradient: Story = {
	args: {
		variant: "neon",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Neon Gradient</CardTitle>
					<CardDescription>Glow effect with neon gradient</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses the neon gradient with glow on hover.</p>
				</CardContent>
			</>
		),
	},
};

export const GlassVariant: Story = {
	args: {
		variant: "glass",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Glass Variant</CardTitle>
					<CardDescription>Transparent glassmorphism effect</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses glassmorphism with blur effects.</p>
				</CardContent>
			</>
		),
	},
};

export const AccentTealGradient: Story = {
	args: {
		variant: "accent-teal",
		premiumHover: true,
		children: (
			<>
				<CardHeader>
					<CardTitle>Accent Teal</CardTitle>
					<CardDescription>Teal gradient for highlights</CardDescription>
				</CardHeader>
				<CardContent>
					<p>This card uses the accent teal gradient.</p>
				</CardContent>
			</>
		),
	},
};
