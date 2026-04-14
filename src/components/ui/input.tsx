import * as React from "react";
import { cn } from "@/lib/utils";
import { formatPhoneInput, shouldFormatPhoneField } from "@/utils/formatInputs";

interface InputProps extends React.ComponentProps<"input"> {
	variant?: "default" | "glass" | "brand-light" | "success-light";
	premium?: boolean;
	formatPhone?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	(
		{
			className,
			type,
			variant = "default",
			premium = false,
			formatPhone,
			onChange,
			inputMode,
			autoComplete,
			id,
			name,
			placeholder,
			maxLength,
			...props
		},
		ref,
	) => {
		const shouldApplyPhoneFormat =
			formatPhone ??
			shouldFormatPhoneField({
				type,
				inputMode,
				autoComplete,
				id,
				name,
				placeholder,
			});

		const handleChange = React.useCallback(
			(event: React.ChangeEvent<HTMLInputElement>) => {
				if (shouldApplyPhoneFormat) {
					event.target.value = formatPhoneInput(event.target.value);
				}

				onChange?.(event);
			},
			[onChange, shouldApplyPhoneFormat],
		);

		const variantClasses = {
			default: "border border-input bg-background",
			glass: "gradient-glass backdrop-blur-sm border-white/20 bg-white/5",
			"brand-light": "gradient-brand-light border-primary/20",
			"success-light": "gradient-success-light border-emerald-500/20",
		};

		return (
			<input
				type={type}
				id={id}
				name={name}
				inputMode={inputMode ?? (shouldApplyPhoneFormat ? "tel" : undefined)}
				autoComplete={autoComplete}
				placeholder={placeholder}
				maxLength={maxLength ?? (shouldApplyPhoneFormat ? 19 : undefined)}
				onChange={handleChange}
				className={cn(
					"flex h-10 w-full rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-300",
					premium &&
						"focus-visible:ring-4 focus-visible:ring-offset-2 hover:border-primary/40",
					variantClasses[variant],
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = "Input";

export { Input };
