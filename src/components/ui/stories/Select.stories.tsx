import type { Meta, StoryObj } from "@storybook/react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";

const meta: Meta<typeof Select> = {
	title: "Design System/Select",
	component: Select,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "glass", "dark"],
			description: "Premium gradient variant",
		},
		premium: {
			control: "boolean",
			description: "Enable premium hover with elevation",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
	args: {
		children: (
			<>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="default">Default</SelectItem>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
					<SelectItem value="option3">Option 3</SelectItem>
				</SelectContent>
			</>
		),
	},
};

export const GlassVariant: Story = {
	args: {
		variant: "glass",
		premium: true,
		children: (
			<>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="default">Default</SelectItem>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
					<SelectItem value="option3">Option 3</SelectItem>
				</SelectContent>
			</>
		),
	},
};

export const DarkVariant: Story = {
	args: {
		variant: "dark",
		premium: true,
		children: (
			<>
				<SelectTrigger>
					<SelectValue placeholder="Select an option" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="default">Default</SelectItem>
					<SelectItem value="option1">Option 1</SelectItem>
					<SelectItem value="option2">Option 2</SelectItem>
					<SelectItem value="option3">Option 3</SelectItem>
				</SelectContent>
			</>
		),
	},
};
