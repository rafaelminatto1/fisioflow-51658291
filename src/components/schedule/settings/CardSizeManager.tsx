import React, { useState, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useCardSize } from "@/hooks/useCardSize";
import { CARD_SIZE_CONFIGS, DEFAULT_CARD_SIZE } from "@/lib/config/agenda";
import { cn } from "@/lib/utils";
import {
	Minimize,
	Maximize,
	Frame,
	Square,
	RotateCcw,
	Clock,
	Type,
} from "lucide-react";
import type { CardSize } from "@/types/agenda";
import { toast } from "@/hooks/use-toast";

const SIZE_ICONS: Record<CardSize, React.ReactNode> = {
	extra_small: <Minimize className="w-3.5 h-3.5" />,
	small: <Square className="w-3.5 h-3.5" />,
	medium: <Frame className="w-3.5 h-3.5" />,
	large: <Maximize className="w-3.5 h-3.5" />,
};

const SIZE_LABELS: Record<CardSize, string> = {
	extra_small: "Extra Pequeno",
	small: "Pequeno",
	medium: "Médio",
	large: "Grande",
};

const MIN_SLOT_HEIGHT = 30;
const MAX_SLOT_HEIGHT = 120;
const MIN_FONT_SCALE = 0;
const MAX_FONT_SCALE = 10;

/* ---- SizeOption compacto ---- */
const SizeOption = memo(function SizeOption({
	size,
	currentSize,
	onSelect,
}: {
	size: CardSize;
	currentSize: CardSize;
	onSelect: (size: CardSize) => void;
}) {
	const isSelected = currentSize === size;
	return (
		<button
			onClick={() => onSelect(size)}
			className={cn(
				"flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
				isSelected
					? "border-primary bg-primary/5 shadow-sm"
					: "border-border hover:border-primary/40 hover:bg-muted/30",
			)}
			aria-pressed={isSelected}
		>
			<div className={cn(
				"flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
				isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
			)}>
				{SIZE_ICONS[size]}
			</div>
			<p className="text-xs font-medium leading-none">{SIZE_LABELS[size]}</p>
			{isSelected && <span className="text-[10px] text-primary font-semibold">Ativo</span>}
		</button>
	);
});

/* ---- Custom input hook ---- */
function useInputWithChangeDetection(
	currentValue: number,
	onChange: (value: number) => void,
	formatValue: (value: string) => number = (v) => parseInt(v, 10),
) {
	const [inputValue, setInputValue] = useState(currentValue.toString());
	const [originalValue, setOriginalValue] = useState(currentValue);

	React.useEffect(() => {
		setInputValue(currentValue.toString());
		setOriginalValue(currentValue);
	}, [currentValue]);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	}, []);

	const handleFocus = useCallback(() => { setOriginalValue(currentValue); }, [currentValue]);

	const handleBlur = useCallback(() => {
		const parsed = formatValue(inputValue);
		if (!isNaN(parsed) && parsed !== originalValue) onChange(parsed);
		else setInputValue(originalValue.toString());
	}, [inputValue, originalValue, onChange, formatValue]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleBlur();
	}, [handleBlur]);

	return { inputValue, setInputValue, handleChange, handleFocus, handleBlur, handleKeyDown };
}

/* ---- Slot Height Control ---- */
function SlotHeightControl({
	slotHeight,
	onSlotHeightChange,
}: {
	slotHeight: number;
	onSlotHeightChange: (value: number) => void;
}) {
	const formatValue = useCallback((value: string) => {
		const parsed = parseInt(value, 10);
		if (isNaN(parsed) || parsed < MIN_SLOT_HEIGHT) return MIN_SLOT_HEIGHT;
		if (parsed > MAX_SLOT_HEIGHT) return MAX_SLOT_HEIGHT;
		return parsed;
	}, []);

	const { inputValue, setInputValue, handleChange, handleFocus, handleBlur, handleKeyDown } =
		useInputWithChangeDetection(slotHeight, onSlotHeightChange, formatValue);

	const handleSliderChange = useCallback((value: number[]) => {
		setInputValue(value[0].toString());
		onSlotHeightChange(value[0]);
	}, [onSlotHeightChange, setInputValue]);

	const sampleAppts = [
		{ time: "08:00", name: "Maria Santos", color: "bg-blue-500" },
		{ time: "09:00", name: "João Silva", color: "bg-emerald-500" },
	];

	return (
		<div className="space-y-4">
			{/* Label + input */}
			<div className="flex items-center justify-between gap-2">
				<Label className="text-sm font-medium flex items-center gap-2">
					<Clock className="w-4 h-4 text-muted-foreground" />
					Altura dos slots
				</Label>
				<div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1">
					<Input
						type="number" min={MIN_SLOT_HEIGHT} max={MAX_SLOT_HEIGHT}
						value={inputValue}
						onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
						className="w-12 h-7 text-center border-0 bg-transparent p-0 font-mono text-sm"
					/>
					<span className="text-xs text-muted-foreground">px</span>
				</div>
			</div>

			<Slider
				value={[slotHeight]} onValueChange={handleSliderChange}
				min={MIN_SLOT_HEIGHT} max={MAX_SLOT_HEIGHT} step={5}
				className="cursor-pointer"
			/>
			<div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
				<span>Compacto (30px)</span>
				<span>Normal (75px)</span>
				<span>Espaçoso (120px)</span>
			</div>

			{/* Mini preview */}
			<div className="rounded-lg border bg-muted/20 overflow-hidden">
				{sampleAppts.map((apt) => (
					<div
						key={apt.time}
						className="relative border-b last:border-0 transition-all duration-300"
						style={{ height: `${slotHeight}px` }}
					>
						<div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-muted/50 border-r">
							<span className="text-[9px] font-mono text-muted-foreground">{apt.time}</span>
						</div>
						<div className={cn("absolute left-12 right-2 top-1 bottom-1 rounded flex items-center px-2 text-white text-[10px] font-medium", apt.color)}>
							<span className="truncate">{apt.name}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/* ---- Font Scale Control ---- */
function FontScaleControl({
	fontScale,
	onFontScaleChange,
	fontPercentage,
}: {
	fontScale: number;
	onFontScaleChange: (value: number) => void;
	fontPercentage: number;
}) {
	const formatValue = useCallback((value: string) => {
		const parsed = parseInt(value, 10);
		if (isNaN(parsed) || parsed < 50) return 0;
		if (parsed > 150) return 10;
		return Math.round(((parsed - 50) / 100) * 10);
	}, []);

	const { inputValue, handleChange, handleFocus, handleBlur, handleKeyDown } =
		useInputWithChangeDetection(fontScale, onFontScaleChange, formatValue);

	const handleSliderChange = useCallback((value: number[]) => {
		onFontScaleChange(value[0]);
	}, [onFontScaleChange]);

	const baseName = 11;
	const baseTime = 9;

	return (
		<div className="space-y-4">
			{/* Label + input */}
			<div className="flex items-center justify-between gap-2">
				<Label className="text-sm font-medium flex items-center gap-2">
					<Type className="w-4 h-4 text-muted-foreground" />
					Tamanho da fonte
				</Label>
				<div className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1">
					<Input
						type="number" min={50} max={150}
						value={inputValue}
						onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
						className="w-12 h-7 text-center border-0 bg-transparent p-0 font-mono text-sm"
					/>
					<span className="text-xs text-muted-foreground">%</span>
				</div>
			</div>

			<Slider
				value={[fontScale]} onValueChange={handleSliderChange}
				min={MIN_FONT_SCALE} max={MAX_FONT_SCALE} step={1}
				className="cursor-pointer"
			/>
			<div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
				<span>Compacto (50%)</span>
				<span>Normal (100%)</span>
				<span>Grande (150%)</span>
			</div>

			{/* Mini preview */}
			<div className="rounded-lg border bg-blue-500 overflow-hidden p-2.5 text-white">
				<div className="flex items-center gap-1.5 mb-0.5">
					<span className="font-mono transition-all" style={{ fontSize: `${baseTime * (fontPercentage / 100)}px` }}>08:00</span>
					<span className="font-medium truncate transition-all" style={{ fontSize: `${baseName * (fontPercentage / 100)}px` }}>Maria Santos</span>
				</div>
				<span className="text-white/80 text-[9px] transition-all" style={{ fontSize: `${9 * (fontPercentage / 100)}px` }}>Fisioterapia Ortopédica</span>
			</div>
		</div>
	);
}

/* ---- Main export ---- */
export function CardSizeManager() {
	const {
		cardSize: currentCardSize,
		setCardSize: setCurrentSize,
		heightScale,
		setHeightScale,
		fontScale,
		setFontScale,
		fontPercentage,
		resetToDefault,
	} = useCardSize();

	const slotHeight = useMemo(() =>
		Math.round(MIN_SLOT_HEIGHT + (heightScale / 10) * (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)),
		[heightScale],
	);

	const hasCustomSettings = useMemo(() =>
		currentCardSize !== DEFAULT_CARD_SIZE || heightScale !== 5 || fontScale !== 5,
		[currentCardSize, heightScale, fontScale],
	);

	const handleSlotHeightChange = useCallback((newHeight: number) => {
		const newScale = Math.round(((newHeight - MIN_SLOT_HEIGHT) / (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT)) * 10);
		setHeightScale(newScale);
	}, [setHeightScale]);

	const handleFontScaleChange = useCallback((newScale: number) => {
		setFontScale(newScale);
	}, [setFontScale]);

	const handleReset = useCallback(() => {
		resetToDefault();
		toast({ title: "Configurações resetadas", description: "Voltou para as configurações padrão." });
	}, [resetToDefault]);

	return (
		<div className="space-y-5">
			{/* Tamanho do card */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label className="text-sm font-medium">Tamanho dos cards</Label>
					{hasCustomSettings && (
						<Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs text-muted-foreground">
							<RotateCcw className="w-3 h-3 mr-1" />
							Resetar
						</Button>
					)}
				</div>
				<div className="grid grid-cols-4 gap-2">
					{(["extra_small", "small", "medium", "large"] as CardSize[]).map((size) => (
						<SizeOption key={size} size={size} currentSize={currentCardSize} onSelect={setCurrentSize} />
					))}
				</div>
			</div>

			<div className="border-t" />

			{/* Altura dos slots */}
			<SlotHeightControl slotHeight={slotHeight} onSlotHeightChange={handleSlotHeightChange} />

			<div className="border-t" />

			{/* Tamanho da fonte */}
			<FontScaleControl fontScale={fontScale} onFontScaleChange={handleFontScaleChange} fontPercentage={fontPercentage} />
		</div>
	);
}
