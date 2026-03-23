import React, { useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MagicTextarea } from "@/components/ai/MagicTextarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TemplateField } from "./EvaluationTemplateSelector";
import { Info, Sparkles } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface DynamicFieldRendererProps {
	fields: TemplateField[];
	values: Record<string, unknown>;
	onChange: (fieldId: string, value: unknown) => void;
	readOnly?: boolean;
}

// Group fields by section
function groupFieldsBySection(
	fields: TemplateField[],
): Record<string, TemplateField[]> {
	const groups: Record<string, TemplateField[]> = {};

	fields.forEach((field) => {
		const section = field.section || "Informações Gerais";
		if (!groups[section]) groups[section] = [];
		groups[section].push(field);
	});

	return groups;
}

// Render individual field based on type
function renderField(
	field: TemplateField,
	value: unknown,
	onChange: (value: unknown) => void,
	readOnly: boolean,
): React.ReactNode {
	const commonProps = {
		id: field.id,
		disabled: readOnly,
	};

	switch (field.tipo_campo) {
		case "texto_curto":
		case "text":
			return (
				<Input
					{...commonProps}
					type="text"
					value={(value as string) || ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.placeholder || ""}
					className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
				/>
			);

		case "texto_longo":
		case "textarea":
			return (
				<MagicTextarea
					id={field.id}
					disabled={readOnly}
					value={(value as string) || ""}
					onValueChange={(val) => onChange(val)}
					placeholder={field.placeholder || ""}
					rows={4}
					className="resize-none bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
				/>
			);

		case "numero":
		case "number":
			return (
				<div className="flex items-center gap-2">
					<Input
						{...commonProps}
						type="number"
						value={(value as number) ?? ""}
						onChange={(e) =>
							onChange(e.target.value ? parseFloat(e.target.value) : null)
						}
						placeholder={field.placeholder || ""}
						min={field.min}
						max={field.max}
						className="w-32 bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all"
					/>
					{field.unit && (
						<span className="text-sm text-muted-foreground font-medium">{field.unit}</span>
					)}
				</div>
			);

		case "escala":
		case "scale": {
			const scaleValue = (value as number) ?? null;
			const min = field.min ?? 0;
			const max = field.max ?? 10;
			const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

			return (
				<div className="space-y-4">
					<div className="flex flex-wrap gap-1.5">
						{range.map((num) => (
							<button
								key={num}
								type="button"
								disabled={readOnly}
								onClick={() => onChange(num)}
								className={cn(
									"h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border shadow-sm",
									scaleValue === num
										? "bg-primary text-primary-foreground border-primary scale-110 shadow-md ring-2 ring-primary/20"
										: "bg-background border-input hover:border-primary/50 hover:bg-primary/5",
									readOnly && "opacity-50 cursor-not-allowed"
								)}
							>
								{num}
							</button>
						))}
					</div>
					<div className="flex items-center gap-4">
						<Slider
							value={[scaleValue ?? min]}
							onValueChange={([v]) => onChange(v)}
							min={min}
							max={max}
							step={1}
							disabled={readOnly}
							className={cn(
								"flex-1",
								(scaleValue ?? 0) <= 3 && "slider-green",
								(scaleValue ?? 0) > 3 && (scaleValue ?? 0) <= 6 && "slider-yellow",
								(scaleValue ?? 0) > 6 && "slider-red",
							)}
						/>
						<Badge variant="outline" className="h-8 min-w-12 justify-center font-black text-lg bg-primary/5 border-primary/20 text-primary">
							{scaleValue ?? "-"}
						</Badge>
					</div>
					<div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">
						<span>Sem dor</span>
						<span>Dor moderada</span>
						<span>Dor extrema</span>
					</div>
				</div>
			);
		}

		case "opcao_unica":
		case "radio":
			return (
				<RadioGroup
					value={(value as string) || ""}
					onValueChange={onChange}
					disabled={readOnly}
					className="grid grid-cols-1 sm:grid-cols-2 gap-3"
				>
					{(field.opcoes || []).map((option, idx) => (
						<div key={idx} className={cn(
							"flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
							(value as string) === option ? "bg-primary/5 border-primary/30 ring-1 ring-primary/10 font-bold" : "bg-background border-transparent shadow-sm"
						)}>
							<RadioGroupItem value={option} id={`${field.id}-${idx}`} />
							<Label
								htmlFor={`${field.id}-${idx}`}
								className="text-sm cursor-pointer flex-1"
							>
								{option}
							</Label>
						</div>
					))}
				</RadioGroup>
			);

		case "selecao":
		case "select":
			return (
				<Select
					value={(value as string) || ""}
					onValueChange={onChange}
					disabled={readOnly}
				>
					<SelectTrigger className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all">
						<SelectValue placeholder={field.placeholder || "Selecione..."} />
					</SelectTrigger>
					<SelectContent>
						{(field.opcoes || []).map((option, idx) => (
							<SelectItem key={idx} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);

		case "checkbox":
		case "boolean":
			return (
				<div className={cn(
					"flex items-center space-x-3 p-4 rounded-xl border transition-all",
					(value as boolean) ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-muted/20 border-transparent"
				)}>
					<Checkbox
						{...commonProps}
						checked={(value as boolean) || false}
						onCheckedChange={onChange}
						className="h-5 w-5"
					/>
					<Label
						htmlFor={field.id}
						className="text-sm font-semibold cursor-pointer"
					>
						{field.placeholder || "Sim / Presente"}
					</Label>
				</div>
			);

		case "lista":
		case "multiselect": {
			const selectedValues = (value as string[]) || [];
			return (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{(field.opcoes || []).map((option, idx) => (
						<div key={idx} className={cn(
							"flex items-center space-x-3 p-2.5 rounded-lg border transition-all cursor-pointer",
							selectedValues.includes(option) ? "bg-primary/5 border-primary/30 font-bold" : "bg-background border-transparent shadow-sm hover:bg-muted/50"
						)}>
							<Checkbox
								id={`${field.id}-${idx}`}
								checked={selectedValues.includes(option)}
								onCheckedChange={(checked) => {
									if (checked) {
										onChange([...selectedValues, option]);
									} else {
										onChange(selectedValues.filter((v) => v !== option));
									}
								}}
								disabled={readOnly}
							/>
							<Label
								htmlFor={`${field.id}-${idx}`}
								className="text-sm cursor-pointer flex-1"
							>
								{option}
							</Label>
						</div>
					))}
				</div>
			);
		}

		case "data":
		case "date":
			return (
				<Input
					{...commonProps}
					type="date"
					value={(value as string) || ""}
					onChange={(e) => onChange(e.target.value)}
					className="bg-muted/30 border-transparent focus:bg-background focus:border-input transition-all w-fit"
				/>
			);

		case "info":
			return (
				<div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-700 flex gap-3">
					<Info className="h-5 w-5 shrink-0" />
					<p>{field.placeholder || field.label}</p>
				</div>
			);

		default:
			return (
				<Input
					{...commonProps}
					type="text"
					value={(value as string) || ""}
					onChange={(e) => onChange(e.target.value)}
					placeholder={field.placeholder || ""}
					className="bg-muted/30 border-transparent"
				/>
			);
	}
}

export function DynamicFieldRenderer({
	fields,
	values,
	onChange,
	readOnly = false,
}: DynamicFieldRendererProps) {
	const checkFieldVisibility = useCallback(
		(field: TemplateField) => {
			if (!field.dependsOnFieldId) return true;
			const depValue = values[field.dependsOnFieldId];
			if (Array.isArray(field.dependsOnValue)) {
				return field.dependsOnValue.includes(depValue);
			}
			return depValue === field.dependsOnValue;
		},
		[values],
	);

	const visibleFields = useMemo(
		() => fields.filter(checkFieldVisibility),
		[fields, checkFieldVisibility],
	);

	const groupedFields = groupFieldsBySection(visibleFields);
	const sections = Object.keys(groupedFields);

	if (fields.length === 0) {
		return (
			<Card className="border-2 border-dashed bg-muted/10">
				<CardContent className="py-12 text-center">
					<div className="bg-muted/20 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
						<Info className="h-6 w-6 text-muted-foreground/40" />
					</div>
					<p className="text-muted-foreground font-medium">Nenhum campo configurado.</p>
					<p className="text-xs text-muted-foreground/60 mt-1">
						Selecione um template acima para começar.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Accordion type="multiple" defaultValue={sections} className="space-y-4">
			{Object.entries(groupedFields).map(([section, sectionFields]) => (
				<AccordionItem key={section} value={section} className="border rounded-2xl bg-card/50 overflow-hidden shadow-sm">
					<AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-all">
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Sparkles className="h-4 w-4 text-primary" />
							</div>
							<h3 className="text-sm font-bold uppercase tracking-widest text-primary/80">
								{section}
							</h3>
						</div>
					</AccordionTrigger>
					<AccordionContent className="px-6 pb-6 pt-2">
						<div className="grid grid-cols-1 gap-8">
							{sectionFields.map((field) => (
								<div key={field.id} className="group space-y-3">
									<div className="flex items-center justify-between gap-4">
										<Label htmlFor={field.id} className="text-sm font-bold text-foreground/80">
											{field.label}
											{field.obrigatorio && (
												<span className="text-xs text-destructive ml-1">*</span>
											)}
										</Label>
									</div>
									
									{field.description && (
										<p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">
											{field.description}
										</p>
									)}
									
									<div className="animate-in fade-in slide-in-from-top-1 duration-300">
										{renderField(
											field,
											values[field.id],
											(value) => onChange(field.id, value),
											readOnly,
										)}
									</div>
								</div>
							))}
						</div>
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

export default DynamicFieldRenderer;
