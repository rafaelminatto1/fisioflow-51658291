import { useState, useEffect, useCallback } from "react";
import type { CardSize } from "@/types/agenda";
import { DEFAULT_CARD_SIZE } from "@/lib/config/agenda";

const CARD_SIZE_STORAGE_KEY = "agenda_card_size";
const CARD_HEIGHT_KEY = "agenda_card_height_multiplier";
const CARD_FONT_SCALE_KEY = "agenda_card_font_scale";
const CARD_OPACITY_KEY = "agenda_card_opacity";

const DEFAULT_HEIGHT_SCALE = 6; // 0-10
const DEFAULT_FONT_SCALE = 5; // 0-10
const DEFAULT_OPACITY = 100; // 0-100

export function useCardSize() {
	const [cardSize, setCardSizeState] = useState<CardSize>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(CARD_SIZE_STORAGE_KEY);
			return (saved as CardSize) || DEFAULT_CARD_SIZE;
		}
		return DEFAULT_CARD_SIZE;
	});

	const [heightScale, setHeightScaleState] = useState<number>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(CARD_HEIGHT_KEY);
			return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT_SCALE;
		}
		return DEFAULT_HEIGHT_SCALE;
	});

	const [fontScale, setFontScaleState] = useState<number>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(CARD_FONT_SCALE_KEY);
			return saved ? parseInt(saved, 10) : DEFAULT_FONT_SCALE;
		}
		return DEFAULT_FONT_SCALE;
	});

	const [opacity, setOpacityState] = useState<number>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(CARD_OPACITY_KEY);
			return saved ? parseInt(saved, 10) : DEFAULT_OPACITY;
		}
		return DEFAULT_OPACITY;
	});

	// Synchronize between tabs
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === CARD_SIZE_STORAGE_KEY && e.newValue) {
				setCardSizeState(e.newValue as CardSize);
			}
			if (e.key === CARD_HEIGHT_KEY && e.newValue) {
				setHeightScaleState(parseInt(e.newValue, 10));
			}
			if (e.key === CARD_FONT_SCALE_KEY && e.newValue) {
				setFontScaleState(parseInt(e.newValue, 10));
			}
			if (e.key === CARD_OPACITY_KEY && e.newValue) {
				setOpacityState(parseInt(e.newValue, 10));
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	const setCardSize = useCallback((size: CardSize) => {
		setCardSizeState(size);
		localStorage.setItem(CARD_SIZE_STORAGE_KEY, size);
	}, []);

	const setHeightScale = useCallback((scale: number) => {
		const safe = Math.min(10, Math.max(0, scale));
		setHeightScaleState(safe);
		localStorage.setItem(CARD_HEIGHT_KEY, safe.toString());
	}, []);

	const setFontScale = useCallback((scale: number) => {
		const safe = Math.min(10, Math.max(0, scale));
		setFontScaleState(safe);
		localStorage.setItem(CARD_FONT_SCALE_KEY, safe.toString());
	}, []);

	const setOpacity = useCallback((value: number) => {
		const safe = Math.min(100, Math.max(0, value));
		setOpacityState(safe);
		localStorage.setItem(CARD_OPACITY_KEY, safe.toString());
	}, []);

	const resetToDefault = useCallback(() => {
		setCardSize(DEFAULT_CARD_SIZE);
		setHeightScale(DEFAULT_HEIGHT_SCALE);
		setFontScale(DEFAULT_FONT_SCALE);
		setOpacity(DEFAULT_OPACITY);
	}, [setCardSize, setHeightScale, setFontScale, setOpacity]);

	// Computations for CSS variables
	const fontPercentage = 80 + (fontScale / 10) * 70; // 80% to 150%
	const heightMultiplier = 0.5 + (heightScale / 10) * 1.5; // 0.5x to 2.0x

	const cssVariables = {
		"--agenda-card-font-scale": `${fontPercentage}%`,
		"--agenda-slot-height": `${Math.round(24 * heightMultiplier)}px`,
		"--agenda-card-opacity": `${opacity / 100}`,
	} as React.CSSProperties;

	return {
		cardSize,
		setCardSize,
		heightScale,
		setHeightScale,
		heightMultiplier,
		fontScale,
		setFontScale,
		fontPercentage,
		opacity,
		setOpacity,
		resetToDefault,
		cssVariables,
	};
}
