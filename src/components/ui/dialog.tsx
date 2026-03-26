import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import "@/styles/dialog-utilities.css";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const hasDialogDescription = (children: React.ReactNode): boolean => {
	return React.Children.toArray(children).some((child) => {
		if (!React.isValidElement(child)) return false;

		const childType = child.type as { displayName?: string };
		if (
			childType === DialogPrimitive.Description ||
			childType.displayName === DialogPrimitive.Description.displayName ||
			childType.displayName === "DialogDescription"
		) {
			return true;
		}

		const nestedChildren = (child.props as { children?: React.ReactNode })
			.children;
		return nestedChildren ? hasDialogDescription(nestedChildren) : false;
	});
};

interface DialogOverlayProps
	extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
	variant?: "default" | "glass" | "dark";
	premium?: boolean;
}

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	DialogOverlayProps
>(({ className, variant = "default", premium = false, ...props }, ref) => {
	const variantClasses = {
		default: "bg-black/80",
		glass: "bg-black/60 backdrop-blur-xl",
		dark: "bg-slate-900/90",
	};

	return (
		<DialogPrimitive.Overlay
			ref={ref}
			className={cn(
				"fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 will-change-[opacity] motion-reduce:animate-none motion-reduce:duration-0",
				variantClasses[variant],
				premium && "backdrop-blur-2xl",
				className,
			)}
			{...props}
		/>
	);
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
	extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	variant?: "default" | "glass" | "dark";
	premium?: boolean;
}

const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	DialogContentProps
>(
	(
		{
			className,
			variant = "default",
			premium = false,
			children,
			"aria-describedby": ariaDescribedBy,
			...props
		},
		ref,
	) => {
		const hasDescription = hasDialogDescription(children);
		const descriptionProps =
			ariaDescribedBy !== undefined
				? ({ "aria-describedby": ariaDescribedBy } as const)
				: hasDescription
					? {}
					: ({ "aria-describedby": undefined } as const);

		const variantClasses = {
			default: "border bg-background p-6 shadow-lg shadow-premium-sm",
			glass:
				"gradient-glass backdrop-blur-2xl border border-white/20 p-6 shadow-premium-md",
			dark: "gradient-dark border-none p-6 shadow-premium-lg",
		};

		return (
			<DialogPortal>
				<DialogOverlay variant={variant} premium={premium} />
				<div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
					<DialogPrimitive.Content
						ref={ref}
						className={cn(
							"pointer-events-auto relative z-50 grid w-full max-w-lg gap-4 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg will-change-[transform,opacity] max-h-[85vh] overflow-y-auto overflow-x-hidden motion-reduce:animate-none motion-reduce:duration-0",
							"max-h-[calc(100dvh-2rem)] md:max-h-[85vh]",
							premium && "card-premium-hover",
							variantClasses[variant],
							className,
						)}
						{...descriptionProps}
						{...props}
					>
						{children}
						<DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-lg opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground will-change-[opacity] magnetic-button glow-on-hover">
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</DialogPrimitive.Close>
					</DialogPrimitive.Content>
				</div>
			</DialogPortal>
		);
	},
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-2 text-center sm:text-left",
			className,
		)}
		{...props}
	/>
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			"pb-[env(safe-area-inset-bottom)] pt-2",
			className,
		)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			"text-lg font-black leading-none tracking-tight font-display",
			className,
		)}
		{...props}
	/>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
