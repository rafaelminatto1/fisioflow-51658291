import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Users,
	Plus,
	Calendar,
	CheckSquare,
	ChevronRight,
	Edit2,
	Trash2,
	UserMinus,
	Clock,
	MapPin,
	Loader2,
	X,
	Check,
	ListChecks,
	RefreshCw,
} from "lucide-react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { groupsApi, type GroupClass, type GroupSession } from "@/api/v2/groups";

const MODALITIES: Record<string, string> = {
	pilates: "Pilates",
	hidro: "Hidroterapia",
	grupo: "Fisioterapia em Grupo",
	yoga: "Yoga Terapêutico",
	funcional: "Treino Funcional",
	rpg: "RPG em Grupo",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({
	cls,
	onEdit,
	onDelete,
	onSelect,
}: {
	cls: GroupClass;
	onEdit: (c: GroupClass) => void;
	onDelete: (id: string) => void;
	onSelect: (c: GroupClass) => void;
}) {
	const occupancy =
		cls.max_capacity > 0
			? Math.round((cls.enrolled_count / cls.max_capacity) * 100)
			: 0;
	const isFull = cls.enrolled_count >= cls.max_capacity;

	return (
		<Card
			className={cn(
				"border border-border/50 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all",
				!cls.is_active && "opacity-60",
			)}
			onClick={() => onSelect(cls)}
		>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-2 mb-3">
					<div className="flex items-center gap-2 min-w-0">
						<div
							className="h-3 w-3 rounded-full shrink-0"
							style={{ backgroundColor: cls.color }}
						/>
						<h3 className="font-bold text-sm truncate">{cls.name}</h3>
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={(e) => {
								e.stopPropagation();
								onEdit(cls);
							}}
						>
							<Edit2 className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 text-destructive hover:text-destructive"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(cls.id);
							}}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>

				<Badge variant="secondary" className="text-[10px] mb-3">
					{MODALITIES[cls.modality] ?? cls.modality}
				</Badge>

				<div className="space-y-1.5 text-[11px] text-muted-foreground">
					{cls.location && (
						<div className="flex items-center gap-1.5">
							<MapPin className="h-3 w-3" />
							{cls.location}
						</div>
					)}
					<div className="flex items-center gap-1.5">
						<Clock className="h-3 w-3" />
						{cls.duration_minutes} min
					</div>
					{cls.schedules.length > 0 && (
						<div className="flex items-center gap-1.5">
							<Calendar className="h-3 w-3" />
							{cls.schedules
								.map(
									(s) =>
										`${WEEKDAYS[s.weekday]} ${s.start_time.substring(0, 5)}`,
								)
								.join(", ")}
						</div>
					)}
				</div>

				<div className="mt-3 space-y-1">
					<div className="flex items-center justify-between text-[11px]">
						<span className="text-muted-foreground">
							{cls.enrolled_count}/{cls.max_capacity} alunos
							{cls.waitlist_count > 0 && (
								<span className="text-amber-600 ml-1">
									+{cls.waitlist_count} fila
								</span>
							)}
						</span>
						<span
							className={cn(
								"font-bold",
								isFull ? "text-red-500" : "text-emerald-500",
							)}
						>
							{isFull ? "Lotado" : `${occupancy}%`}
						</span>
					</div>
					<div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full transition-all",
								isFull ? "bg-red-500" : "bg-emerald-500",
							)}
							style={{ width: `${Math.min(occupancy, 100)}%` }}
						/>
					</div>
				</div>

				<div className="mt-3 flex items-center justify-between">
					{!cls.is_active && (
						<Badge variant="outline" className="text-[10px]">
							Inativa
						</Badge>
					)}
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto h-7 text-[11px] gap-1 text-primary"
						onClick={(e) => {
							e.stopPropagation();
							onSelect(cls);
						}}
					>
						Gerenciar <ChevronRight className="h-3 w-3" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Class Form Modal ─────────────────────────────────────────────────────────

const DEFAULT_SCHEDULES = [{ weekday: 1, start_time: "08:00" }];

function ClassFormModal({
	open,
	initial,
	onClose,
	onSave,
}: {
	open: boolean;
	initial?: GroupClass | null;
	onClose: () => void;
	onSave: (
		data: Partial<GroupClass> & {
			schedules?: { weekday: number; start_time: string }[];
		},
	) => void;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [modality, setModality] = useState(initial?.modality ?? "pilates");
	const [location, setLocation] = useState(initial?.location ?? "");
	const [maxCapacity, setMaxCapacity] = useState(
		String(initial?.max_capacity ?? 10),
	);
	const [duration, setDuration] = useState(
		String(initial?.duration_minutes ?? 60),
	);
	const [color, setColor] = useState(initial?.color ?? "#6366f1");
	const [isActive, setIsActive] = useState(initial?.is_active ?? true);
	const [schedules, setSchedules] = useState<
		{ weekday: number; start_time: string }[]
	>(initial?.schedules?.length ? initial.schedules : DEFAULT_SCHEDULES);

	const addSchedule = () =>
		setSchedules((s) => [...s, { weekday: 1, start_time: "09:00" }]);
	const removeSchedule = (i: number) =>
		setSchedules((s) => s.filter((_, idx) => idx !== i));
	const updateSchedule = (
		i: number,
		key: "weekday" | "start_time",
		val: string | number,
	) =>
		setSchedules((s) =>
			s.map((sched, idx) => (idx === i ? { ...sched, [key]: val } : sched)),
		);

	const handleSubmit = () => {
		if (!name.trim()) {
			toast({ title: "Nome obrigatório", variant: "destructive" });
			return;
		}
		onSave({
			name: name.trim(),
			description: description.trim() || undefined,
			modality,
			location: location.trim() || undefined,
			max_capacity: Number(maxCapacity),
			duration_minutes: Number(duration),
			color,
			is_active: isActive,
			schedules,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{initial ? "Editar Turma" : "Nova Turma"}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2">
							<Label className="text-xs font-bold uppercase tracking-wider">
								Nome *
							</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Ex: Pilates Manhã"
								className="mt-1"
							/>
						</div>
						<div>
							<Label className="text-xs font-bold uppercase tracking-wider">
								Modalidade
							</Label>
							<Select value={modality} onValueChange={setModality}>
								<SelectTrigger className="mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(MODALITIES).map(([v, l]) => (
										<SelectItem key={v} value={v}>
											{l}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label className="text-xs font-bold uppercase tracking-wider">
								Capacidade
							</Label>
							<Input
								type="number"
								min="1"
								value={maxCapacity}
								onChange={(e) => setMaxCapacity(e.target.value)}
								className="mt-1"
							/>
						</div>
						<div>
							<Label className="text-xs font-bold uppercase tracking-wider">
								Duração (min)
							</Label>
							<Input
								type="number"
								min="15"
								step="15"
								value={duration}
								onChange={(e) => setDuration(e.target.value)}
								className="mt-1"
							/>
						</div>
						<div>
							<Label className="text-xs font-bold uppercase tracking-wider">
								Cor
							</Label>
							<div className="flex items-center gap-2 mt-1">
								<input
									type="color"
									value={color}
									onChange={(e) => setColor(e.target.value)}
									className="h-9 w-16 rounded cursor-pointer border"
								/>
								<span className="text-xs text-muted-foreground font-mono">
									{color}
								</span>
							</div>
						</div>
						<div className="col-span-2">
							<Label className="text-xs font-bold uppercase tracking-wider">
								Local
							</Label>
							<Input
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								placeholder="Ex: Sala 2"
								className="mt-1"
							/>
						</div>
						<div className="col-span-2">
							<Label className="text-xs font-bold uppercase tracking-wider">
								Descrição
							</Label>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
								className="mt-1 resize-none"
							/>
						</div>
					</div>

					<div>
						<div className="flex items-center justify-between mb-2">
							<Label className="text-xs font-bold uppercase tracking-wider">
								Horários Recorrentes
							</Label>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-[11px]"
								onClick={addSchedule}
							>
								<Plus className="h-3 w-3 mr-1" /> Adicionar
							</Button>
						</div>
						{schedules.map((sched, i) => (
							<div key={i} className="flex items-center gap-2 mb-2">
								<Select
									value={String(sched.weekday)}
									onValueChange={(v) => updateSchedule(i, "weekday", Number(v))}
								>
									<SelectTrigger className="w-24 h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{WEEKDAYS.map((d, idx) => (
											<SelectItem key={idx} value={String(idx)}>
												{d}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									type="time"
									value={sched.start_time}
									onChange={(e) =>
										updateSchedule(i, "start_time", e.target.value)
									}
									className="h-8 text-xs w-28"
								/>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
									onClick={() => removeSchedule(i)}
								>
									<X className="h-3.5 w-3.5" />
								</Button>
							</div>
						))}
					</div>

					<div className="flex items-center gap-2">
						<Switch checked={isActive} onCheckedChange={setIsActive} />
						<Label className="text-sm">Turma ativa</Label>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button onClick={handleSubmit}>
						{initial ? "Salvar" : "Criar Turma"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Session Check-in Modal ───────────────────────────────────────────────────

function CheckinModal({
	session,
	classId: _classId,
	onClose,
}: {
	session: GroupSession;
	classId: string;
	onClose: () => void;
}) {
	const qc = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ["group-checkins", session.id],
		queryFn: () => groupsApi.checkins.list(session.id),
	});

	const addCheckin = useMutation({
		mutationFn: (patientId: string) =>
			groupsApi.checkins.add(session.id, patientId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["group-checkins", session.id] }),
	});
	const removeCheckin = useMutation({
		mutationFn: (patientId: string) =>
			groupsApi.checkins.remove(session.id, patientId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["group-checkins", session.id] }),
	});

	const enrolled = data?.data?.enrolled ?? [];
	const checkedCount = enrolled.filter((e) => e.checked_in).length;

	return (
		<Dialog open onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ListChecks className="h-5 w-5 text-primary" />
						Check-in —{" "}
						{new Date(session.date + "T12:00:00").toLocaleDateString("pt-BR")}
					</DialogTitle>
				</DialogHeader>
				<div className="py-1">
					<p className="text-sm text-muted-foreground mb-3">
						{checkedCount}/{enrolled.length} presentes
					</p>
					{isLoading ? (
						<div className="space-y-2">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-10" />
							))}
						</div>
					) : enrolled.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-4">
							Nenhum aluno matriculado
						</p>
					) : (
						<div className="space-y-2 max-h-80 overflow-y-auto">
							{enrolled.map((e) => (
								<div
									key={e.patient_id}
									className={cn(
										"flex items-center justify-between px-3 py-2 rounded-lg border transition-colors",
										e.checked_in
											? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
											: "bg-card border-border/50",
									)}
								>
									<span className="text-sm font-medium">{e.full_name}</span>
									<Button
										variant={e.checked_in ? "outline" : "default"}
										size="sm"
										className={cn(
											"h-7 gap-1 text-[11px]",
											e.checked_in && "border-emerald-300 text-emerald-700",
										)}
										disabled={addCheckin.isPending || removeCheckin.isPending}
										onClick={() =>
											e.checked_in
												? removeCheckin.mutate(e.patient_id)
												: addCheckin.mutate(e.patient_id)
										}
									>
										{e.checked_in ? (
											<>
												<Check className="h-3 w-3" /> Presente
											</>
										) : (
											"Marcar"
										)}
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button onClick={onClose}>Fechar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── Class Detail Panel ───────────────────────────────────────────────────────

function ClassDetailPanel({
	cls,
	onClose,
}: {
	cls: GroupClass;
	onClose: () => void;
}) {
	const qc = useQueryClient();
	const [checkinSession, setCheckinSession] = useState<GroupSession | null>(
		null,
	);
	const [tab, setTab] = useState<"sessions" | "enrollments" | "waitlist">(
		"sessions",
	);

	const { data: sessionsData, isLoading: sessLoading } = useQuery({
		queryKey: ["group-sessions", cls.id],
		queryFn: () =>
			groupsApi.sessions.list(cls.id, {
				from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
				to: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0],
			}),
	});

	const { data: enrollmentsData, isLoading: enrollLoading } = useQuery({
		queryKey: ["group-enrollments", cls.id],
		queryFn: () => groupsApi.enrollments.list(cls.id),
	});

	const { data: waitlistData } = useQuery({
		queryKey: ["group-waitlist", cls.id],
		queryFn: () => groupsApi.waitlist(cls.id),
	});

	const generateSessions = useMutation({
		mutationFn: () => groupsApi.sessions.generate(cls.id, 4),
		onSuccess: (res) => {
			qc.invalidateQueries({ queryKey: ["group-sessions", cls.id] });
			toast({ title: `${(res as any).data.created} aulas geradas` });
		},
	});

	const unenroll = useMutation({
		mutationFn: (patientId: string) =>
			groupsApi.enrollments.unenroll(cls.id, patientId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["group-enrollments", cls.id] }),
	});

	const sessions = (sessionsData as any)?.data ?? [];
	const enrollments = (enrollmentsData as any)?.data ?? [];
	const waitlist = (waitlistData as any)?.data ?? [];

	const upcomingSessions = sessions.filter(
		(s: GroupSession) => s.date >= new Date().toISOString().split("T")[0],
	);
	const pastSessions = sessions.filter(
		(s: GroupSession) => s.date < new Date().toISOString().split("T")[0],
	);

	return (
		<div className="fixed inset-0 z-50 flex">
			<div className="flex-1 bg-black/40" onClick={onClose} />
			<div className="w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">
				<div className="flex items-center justify-between px-5 py-4 border-b">
					<div className="flex items-center gap-2">
						<div
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: cls.color }}
						/>
						<h2 className="font-black text-base">{cls.name}</h2>
						<Badge variant="secondary" className="text-[10px]">
							{MODALITIES[cls.modality]}
						</Badge>
					</div>
					<Button variant="ghost" size="icon" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex border-b">
					{(["sessions", "enrollments", "waitlist"] as const).map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={cn(
								"flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
								tab === t
									? "border-b-2 border-primary text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{t === "sessions" && `Aulas (${upcomingSessions.length})`}
							{t === "enrollments" && `Matriculados (${enrollments.length})`}
							{t === "waitlist" && `Fila (${waitlist.length})`}
						</button>
					))}
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-2">
					{tab === "sessions" && (
						<>
							<div className="flex justify-end mb-1">
								<Button
									variant="outline"
									size="sm"
									className="h-7 text-[11px] gap-1"
									disabled={generateSessions.isPending}
									onClick={() => generateSessions.mutate()}
								>
									{generateSessions.isPending ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<RefreshCw className="h-3 w-3" />
									)}
									Gerar próximas 4 semanas
								</Button>
							</div>
							{sessLoading ? (
								<div className="space-y-2">
									{[1, 2, 3].map((i) => (
										<Skeleton key={i} className="h-14 rounded-xl" />
									))}
								</div>
							) : sessions.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									Nenhuma aula. Gere a partir do horário da turma.
								</p>
							) : (
								<>
									{upcomingSessions.length > 0 && (
										<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
											Próximas
										</p>
									)}
									{upcomingSessions.map((s: GroupSession) => (
										<SessionRow
											key={s.id}
											session={s}
											onCheckin={() => setCheckinSession(s)}
										/>
									))}
									{pastSessions.length > 0 && (
										<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-3">
											Anteriores
										</p>
									)}
									{pastSessions.slice(0, 10).map((s: GroupSession) => (
										<SessionRow
											key={s.id}
											session={s}
											onCheckin={() => setCheckinSession(s)}
											past
										/>
									))}
								</>
							)}
						</>
					)}

					{tab === "enrollments" && (
						<>
							<div className="flex justify-between items-center mb-2">
								<span className="text-xs text-muted-foreground">
									{enrollments.length}/{cls.max_capacity} vagas
								</span>
							</div>
							{enrollLoading ? (
								<div className="space-y-2">
									{[1, 2, 3].map((i) => (
										<Skeleton key={i} className="h-10 rounded-xl" />
									))}
								</div>
							) : enrollments.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									Nenhum aluno matriculado
								</p>
							) : (
								enrollments.map((e: any) => (
									<div
										key={e.id}
										className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/50 bg-card"
									>
										<div>
											<p className="text-sm font-semibold">{e.full_name}</p>
											{e.phone && (
												<p className="text-[11px] text-muted-foreground">
													{e.phone}
												</p>
											)}
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-destructive hover:text-destructive"
											onClick={() => unenroll.mutate(e.patient_id)}
										>
											<UserMinus className="h-3.5 w-3.5" />
										</Button>
									</div>
								))
							)}
						</>
					)}

					{tab === "waitlist" && (
						<>
							{waitlist.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									Fila de espera vazia
								</p>
							) : (
								waitlist.map((w: any, i: number) => (
									<div
										key={w.patient_id}
										className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border/50 bg-card"
									>
										<span className="text-xl font-black text-muted-foreground/40 w-6 text-center">
											{i + 1}
										</span>
										<div className="flex-1">
											<p className="text-sm font-semibold">{w.full_name}</p>
											<Badge
												variant="outline"
												className={cn(
													"text-[10px]",
													w.status === "offered" &&
														"text-amber-600 border-amber-300",
												)}
											>
												{w.status === "offered"
													? "Vaga oferecida"
													: "Aguardando"}
											</Badge>
										</div>
									</div>
								))
							)}
						</>
					)}
				</div>
			</div>

			{checkinSession && (
				<CheckinModal
					session={checkinSession}
					classId={cls.id}
					onClose={() => setCheckinSession(null)}
				/>
			)}
		</div>
	);
}

function SessionRow({
	session,
	onCheckin,
	past,
}: {
	session: GroupSession;
	onCheckin: () => void;
	past?: boolean;
}) {
	const dateStr = new Date(session.date + "T12:00:00").toLocaleDateString(
		"pt-BR",
		{
			weekday: "short",
			day: "2-digit",
			month: "2-digit",
		},
	);

	return (
		<div
			className={cn(
				"flex items-center justify-between px-3 py-2.5 rounded-xl border",
				past
					? "border-border/30 bg-muted/10 opacity-70"
					: "border-border/50 bg-card",
			)}
		>
			<div>
				<p className="text-sm font-semibold capitalize">{dateStr}</p>
				<p className="text-[11px] text-muted-foreground">
					{session.start_time.substring(0, 5)}
					{session.end_time && ` – ${session.end_time.substring(0, 5)}`}
					{session.checkin_count > 0 && (
						<span className="ml-2 text-emerald-600 font-semibold">
							<CheckSquare className="inline h-3 w-3 mr-0.5" />
							{session.checkin_count}
						</span>
					)}
				</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				className="h-7 text-[11px] gap-1"
				onClick={onCheckin}
			>
				<ListChecks className="h-3.5 w-3.5" />
				Check-in
			</Button>
		</div>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GroupsPage() {
	const qc = useQueryClient();
	const [formOpen, setFormOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<GroupClass | null>(null);
	const [selectedClass, setSelectedClass] = useState<GroupClass | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["group-classes"],
		queryFn: () => groupsApi.list(),
	});

	const classes: GroupClass[] = (data as any)?.data ?? [];

	const createMutation = useMutation({
		mutationFn: (body: Parameters<typeof groupsApi.create>[0]) =>
			groupsApi.create(body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-classes"] });
			setFormOpen(false);
			toast({ title: "Turma criada com sucesso" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string; body: Partial<GroupClass> }) =>
			groupsApi.update(id, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-classes"] });
			setEditTarget(null);
			toast({ title: "Turma atualizada" });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => groupsApi.delete(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-classes"] });
			toast({ title: "Turma removida" });
		},
	});

	return (
		<PageLayout>
			<PageContainer>
				<PageHeader
					title="Gestão de Turmas"
					subtitle="Pilates, Hidroterapia, Grupos de Fisioterapia e mais"
					actions={
						<>
							<Button onClick={() => setFormOpen(true)} className="gap-2">
								<Plus className="h-4 w-4" />
								Nova Turma
							</Button>
						</>
					}
				/>
				<div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-48 rounded-2xl" />
							))}
						</div>
					) : classes.length === 0 ? (
						<Card className="border-dashed border-2 border-border/50">
							<CardContent className="flex flex-col items-center justify-center py-16 gap-3">
								<Users className="h-12 w-12 text-muted-foreground/30" />
								<p className="font-bold text-muted-foreground">
									Nenhuma turma cadastrada
								</p>
								<p className="text-sm text-muted-foreground">
									Crie sua primeira turma de Pilates ou grupo
								</p>
								<Button
									onClick={() => setFormOpen(true)}
									className="mt-2 gap-2"
								>
									<Plus className="h-4 w-4" /> Criar Turma
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{classes.map((cls) => (
								<ClassCard
									key={cls.id}
									cls={cls}
									onEdit={(c) => setEditTarget(c)}
									onDelete={(id) => deleteMutation.mutate(id)}
									onSelect={(c) => setSelectedClass(c)}
								/>
							))}
						</div>
					)}
				</div>
				{(formOpen || editTarget) && (
					<ClassFormModal
						open
						initial={editTarget}
						onClose={() => {
							setFormOpen(false);
							setEditTarget(null);
						}}
						onSave={(body) =>
							editTarget
								? updateMutation.mutate({ id: editTarget.id, body })
								: createMutation.mutate(body as any)
						}
					/>
				)}
				{selectedClass && (
					<ClassDetailPanel
						cls={selectedClass}
						onClose={() => setSelectedClass(null)}
					/>
				)}
			</PageContainer>
		</PageLayout>
	);
}
