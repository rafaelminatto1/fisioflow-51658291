import { useState, useEffect, useCallback } from "react";
import {
	DEFAULT_APPOINTMENT_TYPES,
	COLOR_OPTIONS,
	type AppointmentType,
	type AppointmentTypeFormData,
} from "@/types/appointment-types";

const STORAGE_KEY = "fisioflow-appointment-types";

function loadTypes(): AppointmentType[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed) && parsed.length > 0) return parsed;
		}
	} catch {}
	return DEFAULT_APPOINTMENT_TYPES;
}

function persist(types: AppointmentType[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
}

export function useAppointmentTypes() {
	const [types, setTypes] = useState<AppointmentType[]>(loadTypes);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	useEffect(() => {
		persist(types);
	}, [types]);

	const addType = useCallback(() => {
		const id = `custom-${Date.now()}`;
		const colorIdx = types.length % COLOR_OPTIONS.length;
		const newType: AppointmentType = {
			id,
			name: "Novo Tipo",
			durationMinutes: 30,
			bufferBeforeMinutes: 0,
			bufferAfterMinutes: 5,
			color: COLOR_OPTIONS[colorIdx],
			maxPerDay: null,
			isActive: true,
			isDefault: false,
		};
		setTypes((prev) => [...prev, newType]);
		setExpandedId(id);
	}, [types.length]);

	const updateType = useCallback(
		(id: string, data: Partial<AppointmentTypeFormData>) => {
			setTypes((prev) =>
				prev.map((t) => (t.id === id ? { ...t, ...data } : t)),
			);
		},
		[],
	);

	const removeType = useCallback((id: string) => {
		setTypes((prev) => prev.filter((t) => t.id !== id));
		if (expandedId === id) setExpandedId(null);
	}, [expandedId]);

	const toggleActive = useCallback((id: string) => {
		setTypes((prev) =>
			prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
		);
	}, []);

	const duplicateType = useCallback(
		(id: string) => {
			const source = types.find((t) => t.id === id);
			if (!source) return;
			const newId = `custom-${Date.now()}`;
			const newType: AppointmentType = {
				...source,
				id: newId,
				name: `${source.name} (cópia)`,
				isDefault: false,
			};
			setTypes((prev) => [...prev, newType]);
			setExpandedId(newId);
		},
		[types],
	);

	const toggleExpand = useCallback((id: string) => {
		setExpandedId((prev) => (prev === id ? null : id));
	}, []);

	return {
		types,
		expandedId,
		addType,
		updateType,
		removeType,
		toggleActive,
		duplicateType,
		toggleExpand,
	};
}
