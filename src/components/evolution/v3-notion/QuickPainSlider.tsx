import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Smile, Meh, Frown, Angry } from "lucide-react";

interface QuickPainSliderProps {
	value?: number;
	onChange: (value: number) => void;
	disabled?: boolean;
	className?: string;
	showLabel?: boolean; // Kept for compatibility, though labels are always shown in this variant
}

const PAIN_LEVELS = [
	{ value: 0, label: "Sem dor", icon: Smile },
	{ value: 3, label: "Leve", icon: Smile },
	{ value: 5, label: "Moderada", icon: Meh },
	{ value: 7, label: "Intensa", icon: Frown },
	{ value: 10, label: "Insuportável", icon: Angry },
];

export const QuickPainSlider: React.FC<QuickPainSliderProps> = ({
	value,
	onChange,
	disabled = false,
	className,
}) => {
	const [sliderValue, setSliderValue] = useState(value || 0);

	useEffect(() => {
		setSliderValue(value || 0);
	}, [value]);

	const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(e.target.value);
		setSliderValue(newValue);
		onChange(newValue);
	};

	return (
		<div className={cn("w-full py-4", className)}>
			<div className="relative px-1">
				{/* Track Background */}
				<div className="absolute top-1/2 left-1 right-1 h-3 -mt-1.5 rounded-full bg-slate-100 pointer-events-none" />

				{/* Gradient Fill using clipPath to reveal a fixed-width gradient */}
				<div
					className="absolute top-1/2 left-1 right-1 h-3 -mt-1.5 rounded-full pointer-events-none"
					style={{
						background:
							"linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)",
						clipPath: `inset(0 ${100 - (sliderValue / 10) * 100}% 0 0)`,
						transition: "clip-path 0.2s ease-out",
					}}
				/>

				{/* Input Range */}
				<input
					type="range"
					min="0"
					max="10"
					step="1"
					value={sliderValue}
					onChange={handleSliderChange}
					disabled={disabled}
					className={cn(
						"quick-pain-slider-input relative w-full h-8 cursor-pointer z-20 m-0",
						disabled && "cursor-not-allowed opacity-50",
					)}
					aria-label="Nível de dor (EVA)"
				/>
			</div>

			<div className="mt-2 grid grid-cols-5 gap-1 px-0.5">
				{PAIN_LEVELS.map((level) => {
					const Icon = level.icon;
					const isActive = Math.abs(sliderValue - level.value) <= 1;

					return (
						<button
							key={level.value}
							type="button"
							disabled={disabled}
							className={cn(
								"group min-w-0 rounded-xl px-1.5 py-1.5 text-center transition-all duration-200",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
								disabled
									? "cursor-not-allowed opacity-50"
									: "cursor-pointer hover:bg-slate-50",
								isActive && "bg-sky-50 ring-1 ring-sky-100 shadow-sm",
							)}
							onClick={() => {
								if (!disabled) {
									setSliderValue(level.value);
									onChange(level.value);
								}
							}}
						>
							{/* Tick mark */}
							<div
								className={cn(
									"mx-auto mb-1.5 h-1.5 w-0.5 rounded-full transition-colors",
									isActive ? "bg-sky-500" : "bg-slate-300",
								)}
							/>

							<span
								className={cn(
									"block text-xs font-bold leading-none transition-colors",
									isActive ? "text-slate-900" : "text-slate-400",
								)}
							>
								{level.value}
							</span>

							<span
								className={cn(
									"mt-1 block min-h-[2rem] text-[10px] font-medium leading-tight transition-colors",
									isActive
										? "text-slate-700"
										: "text-slate-400 group-hover:text-slate-600",
								)}
							>
								{level.label}
							</span>

							<Icon
								className={cn(
									"mx-auto mt-1 h-3.5 w-3.5 transition-all",
									isActive
										? "text-slate-700 opacity-100"
										: "text-slate-300 opacity-70",
								)}
							/>
						</button>
					);
				})}
			</div>
		</div>
	);
};

// CSS for custom range slider styling
const QUICK_PAIN_SLIDER_STYLES = `
  .quick-pain-slider-input {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }

  .quick-pain-slider-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    margin-top: 0; /* Align with track */
  }

  .quick-pain-slider-input::-moz-range-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .quick-pain-slider-input:focus {
    outline: none;
  }

  .quick-pain-slider-input:focus::-webkit-slider-thumb {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2), 0 0 0 4px rgba(59, 130, 246, 0.3);
  }

  .quick-pain-slider-input:hover::-webkit-slider-thumb {
    transform: scale(1.1);
  }

  .quick-pain-slider-input:hover::-moz-range-thumb {
    transform: scale(1.1);
  }
`;

// Inject styles directly in the document
if (typeof document !== "undefined") {
	const styleElement = document.createElement("style");
	styleElement.textContent = QUICK_PAIN_SLIDER_STYLES;
	document.head.appendChild(styleElement);
}
