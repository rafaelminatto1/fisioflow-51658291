import React, { useState, useEffect, memo } from "react";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar, Check, Loader2, Settings2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	useScheduleSettings,
	type BusinessHour,
} from "@/hooks/useScheduleSettings";
import { useIsMobile } from "@/hooks/use-mobile";

interface ScheduleConfig {
	businessHours: {
		weekdays: { start: string; end: string };
		saturday: { start: string; end: string };
		sunday: { start: string; end: string };
	};
	workingDays: {
		monday: boolean;
		tuesday: boolean;
		wednesday: boolean;
		thursday: boolean;
		friday: boolean;
		saturday: boolean;
		sunday: boolean;
	};
}

const defaultConfig: ScheduleConfig = {
	businessHours: {
		weekdays: { start: "07:00", end: "21:00" },
		saturday: { start: "07:00", end: "13:00" },
		sunday: { start: "00:00", end: "00:00" }, // Closed
	},
	workingDays: {
		monday: true,
		tuesday: true,
		wednesday: true,
		thursday: true,
		friday: true,
		saturday: true,
		sunday: false,
	},
};

const timeSlots = [
	"06:00",
	"06:30",
	"07:00",
	"07:30",
	"08:00",
	"08:30",
	"09:00",
	"09:30",
	"10:00",
	"10:30",
	"11:00",
	"11:30",
	"12:00",
	"12:30",
	"13:00",
	"13:30",
	"14:00",
	"14:30",
	"15:00",
	"15:30",
	"16:00",
	"16:30",
	"17:00",
	"17:30",
	"18:00",
	"18:30",
	"19:00",
	"19:30",
	"20:00",
	"20:30",
	"21:00",
	"21:30",
	"22:00",
];

interface QuickSettingsSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function configFromBusinessHours(hours: BusinessHour[]): ScheduleConfig {
	const get = (day: number) => hours.find((h) => h.day_of_week === day);
	const mon = get(1);
	const sat = get(6);
	const sun = get(0);
	return {
		...defaultConfig,
		businessHours: {
			weekdays: mon
				? { start: mon.open_time, end: mon.close_time }
				: defaultConfig.businessHours.weekdays,
			saturday: sat
				? { start: sat.open_time, end: sat.close_time }
				: defaultConfig.businessHours.saturday,
			sunday: sun
				? { start: sun.open_time, end: sun.close_time }
				: defaultConfig.businessHours.sunday,
		},
		workingDays: {
			monday: get(1)?.is_open ?? true,
			tuesday: get(2)?.is_open ?? true,
			wednesday: get(3)?.is_open ?? true,
			thursday: get(4)?.is_open ?? true,
			friday: get(5)?.is_open ?? true,
			saturday: get(6)?.is_open ?? true,
			sunday: get(0)?.is_open ?? false,
		},
	};
}

export const QuickSettingsSheet = memo(
	({ open, onOpenChange }: QuickSettingsSheetProps) => {
		const isMobile = useIsMobile();
		const { businessHours, upsertBusinessHours } = useScheduleSettings();
		const [config, setConfig] = useState<ScheduleConfig>(defaultConfig);
		const [hasChanges, setHasChanges] = useState(false);
		const [saved, setSaved] = useState(false);

		useEffect(() => {
			if (open && businessHours && businessHours.length > 0) {
				setConfig(configFromBusinessHours(businessHours));
			}
		}, [open, businessHours]);

		const handleTimeChange = (
			day: "weekdays" | "saturday" | "sunday",
			field: "start" | "end",
			value: string,
		) => {
			setConfig((prev) => ({
				...prev,
				businessHours: {
					...prev.businessHours,
					[day]: {
						...prev.businessHours[day],
						[field]: value,
					},
				},
			}));
			setHasChanges(true);
			setSaved(false);
		};

		const handleWorkingDayToggle = (
			day: keyof ScheduleConfig["workingDays"],
		) => {
			setConfig((prev) => ({
				...prev,
				workingDays: {
					...prev.workingDays,
					[day]: !prev.workingDays[day],
				},
			}));
			setHasChanges(true);
			setSaved(false);
		};

		const handleSave = async () => {
			const hours: Partial<BusinessHour>[] = [
				{
					day_of_week: 0,
					is_open: config.workingDays.sunday,
					open_time: config.businessHours.sunday.start,
					close_time: config.businessHours.sunday.end,
				},
				{
					day_of_week: 1,
					is_open: config.workingDays.monday,
					open_time: config.businessHours.weekdays.start,
					close_time: config.businessHours.weekdays.end,
				},
				{
					day_of_week: 2,
					is_open: config.workingDays.tuesday,
					open_time: config.businessHours.weekdays.start,
					close_time: config.businessHours.weekdays.end,
				},
				{
					day_of_week: 3,
					is_open: config.workingDays.wednesday,
					open_time: config.businessHours.weekdays.start,
					close_time: config.businessHours.weekdays.end,
				},
				{
					day_of_week: 4,
					is_open: config.workingDays.thursday,
					open_time: config.businessHours.weekdays.start,
					close_time: config.businessHours.weekdays.end,
				},
				{
					day_of_week: 5,
					is_open: config.workingDays.friday,
					open_time: config.businessHours.weekdays.start,
					close_time: config.businessHours.weekdays.end,
				},
				{
					day_of_week: 6,
					is_open: config.workingDays.saturday,
					open_time: config.businessHours.saturday.start,
					close_time: config.businessHours.saturday.end,
				},
			];
			try {
				await upsertBusinessHours.mutateAsync(hours);
				setHasChanges(false);
				setSaved(true);
				setTimeout(() => setSaved(false), 2000);
			} catch {
				// Erro já exibido pelo useScheduleSettings (toast)
			}
		};

		const handleReset = () => {
			setConfig(defaultConfig);
			setHasChanges(true);
			setSaved(false);
		};

		return (
			<CustomModal
				open={open}
				onOpenChange={onOpenChange}
				isMobile={isMobile}
				contentClassName="max-w-md h-[85vh]"
			>
				<CustomModalHeader onClose={() => onOpenChange(false)}>
					<div className="flex flex-col gap-1">
						<CustomModalTitle className="flex items-center gap-2 text-xl font-bold">
							<Settings2 className="h-5 w-5 text-primary" />
							Configurações da Agenda
						</CustomModalTitle>
						<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
							Personalize horários e dias de trabalho
						</p>
					</div>
				</CustomModalHeader>

				<Tabs
					defaultValue="hours"
					className="flex-1 flex flex-col overflow-hidden"
				>
					<TabsList className="grid w-full grid-cols-2 bg-slate-50 border-b rounded-none h-12">
						<TabsTrigger
							value="hours"
							className="gap-1.5 data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
						>
							<Clock className="w-4 h-4" />
							Horários
						</TabsTrigger>
						<TabsTrigger
							value="days"
							className="gap-1.5 data-[state=active]:bg-white rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all"
						>
							<Calendar className="w-4 h-4" />
							Dias
						</TabsTrigger>
					</TabsList>

					<CustomModalBody className="p-0 sm:p-0">
						<ScrollArea className="h-full">
							<div className="p-6 space-y-6">
								{/* Hours Tab */}
								<TabsContent value="hours" className="mt-0 space-y-6">
									<div className="space-y-6">
										{/* Weekdays */}
										<div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
											<Label className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-slate-500">
												<Badge
													variant="outline"
													className="font-bold bg-white text-primary border-primary/20"
												>
													Seg-Sex
												</Badge>
												Horário Base
											</Label>
											<div className="grid grid-cols-2 gap-4 pt-2">
												<div className="space-y-1.5">
													<Label
														htmlFor="weekday-start"
														className="text-[10px] font-bold uppercase text-slate-400"
													>
														Início
													</Label>
													<select
														id="weekday-start"
														value={config.businessHours.weekdays.start}
														onChange={(e) =>
															handleTimeChange(
																"weekdays",
																"start",
																e.target.value,
															)
														}
														className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:ring-2 focus:ring-primary/20"
													>
														{timeSlots.map((slot) => (
															<option key={`start-${slot}`} value={slot}>
																{slot}
															</option>
														))}
													</select>
												</div>
												<div className="space-y-1.5">
													<Label
														htmlFor="weekday-end"
														className="text-[10px] font-bold uppercase text-slate-400"
													>
														Término
													</Label>
													<select
														id="weekday-end"
														value={config.businessHours.weekdays.end}
														onChange={(e) =>
															handleTimeChange(
																"weekdays",
																"end",
																e.target.value,
															)
														}
														className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:ring-2 focus:ring-primary/20"
													>
														{timeSlots.map((slot) => (
															<option key={`end-${slot}`} value={slot}>
																{slot}
															</option>
														))}
													</select>
												</div>
											</div>
										</div>

										{/* Saturday */}
										<div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
											<Label className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-slate-500">
												<Badge
													variant="outline"
													className="font-bold bg-white text-orange-600 border-orange-200"
												>
													Sábado
												</Badge>
												Horário Reduzido
											</Label>
											<div className="grid grid-cols-2 gap-4 pt-2">
												<div className="space-y-1.5">
													<Label
														htmlFor="saturday-start"
														className="text-[10px] font-bold uppercase text-slate-400"
													>
														Início
													</Label>
													<select
														id="saturday-start"
														value={config.businessHours.saturday.start}
														onChange={(e) =>
															handleTimeChange(
																"saturday",
																"start",
																e.target.value,
															)
														}
														className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:ring-2 focus:ring-primary/20"
													>
														{timeSlots.map((slot) => (
															<option key={`sat-start-${slot}`} value={slot}>
																{slot}
															</option>
														))}
													</select>
												</div>
												<div className="space-y-1.5">
													<Label
														htmlFor="saturday-end"
														className="text-[10px] font-bold uppercase text-slate-400"
													>
														Término
													</Label>
													<select
														id="saturday-end"
														value={config.businessHours.saturday.end}
														onChange={(e) =>
															handleTimeChange(
																"saturday",
																"end",
																e.target.value,
															)
														}
														className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:ring-2 focus:ring-primary/20"
													>
														{timeSlots.map((slot) => (
															<option key={`sat-end-${slot}`} value={slot}>
																{slot}
															</option>
														))}
													</select>
												</div>
											</div>
										</div>
									</div>
								</TabsContent>

								{/* Days Tab */}
								<TabsContent value="days" className="mt-0 space-y-4">
									<div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-4 flex items-start gap-3">
										<Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
										<p className="text-xs text-primary/80 leading-relaxed font-medium">
											Os dias desativados não aparecerão como disponíveis para
											novos agendamentos na grade da agenda.
										</p>
									</div>

									<div className="space-y-2">
										{[
											{ key: "monday" as const, label: "Segunda-feira" },
											{ key: "tuesday" as const, label: "Terça-feira" },
											{ key: "wednesday" as const, label: "Quarta-feira" },
											{ key: "thursday" as const, label: "Quinta-feira" },
											{ key: "friday" as const, label: "Sexta-feira" },
											{ key: "saturday" as const, label: "Sábado" },
											{ key: "sunday" as const, label: "Domingo" },
										].map(({ key, label }) => (
											<div
												key={key}
												className={cn(
													"flex items-center justify-between p-4 rounded-2xl border transition-all",
													config.workingDays[key]
														? "bg-white border-slate-200 shadow-sm"
														: "bg-slate-50 border-slate-100 opacity-60",
												)}
											>
												<Label
													htmlFor={`day-${key}`}
													className="cursor-pointer font-bold text-sm text-slate-700"
												>
													{label}
												</Label>
												<Switch
													id={`day-${key}`}
													checked={config.workingDays[key]}
													onCheckedChange={() => handleWorkingDayToggle(key)}
												/>
											</div>
										))}
									</div>
								</TabsContent>
							</div>
						</ScrollArea>
					</CustomModalBody>
				</Tabs>

				<CustomModalFooter
					isMobile={isMobile}
					className="bg-slate-50 border-t-0"
				>
					<Button
						variant="ghost"
						onClick={handleReset}
						className="rounded-xl h-11 px-6 font-bold text-slate-500"
						disabled={!hasChanges || upsertBusinessHours.isPending}
					>
						Resetar
					</Button>
					<div className="flex-1" />
					<Button
						onClick={() => void handleSave()}
						disabled={!hasChanges || upsertBusinessHours.isPending}
						className={cn(
							"rounded-xl h-11 px-8 gap-2 font-bold uppercase tracking-wider shadow-lg transition-all",
							saved
								? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
								: "bg-slate-900 shadow-slate-900/20",
						)}
					>
						{upsertBusinessHours.isPending ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Salvando...
							</>
						) : saved ? (
							<>
								<Check className="w-4 h-4" />
								Salvo!
							</>
						) : (
							"Aplicar Alterações"
						)}
					</Button>
				</CustomModalFooter>
			</CustomModal>
		);
	},
);

QuickSettingsSheet.displayName = "QuickSettingsSheet";
