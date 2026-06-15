/**
 * FisioFlow — CRM · WhatsApp (inbox unificado em 3 colunas)
 * Recriação fiel do protótipo `ui_kits/web/crm-whatsapp.html` do
 * FisioFlow Design System, montada no shell autenticado via MainLayout.
 * @module pages/CrmWhatsApp
 */

import type { ReactNode } from "react";
import {
	Bell,
	CalendarPlus,
	Camera,
	CheckCheck,
	FileText,
	MapPin,
	Zap,
} from "lucide-react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";

const ic = (Icon: typeof Bell, size = 13, style?: React.CSSProperties) => (
	<Icon style={{ width: size, height: size, ...style }} />
);

type Stage = "lead" | "wait" | "eval" | "treat" | "done";

const STAGE_META_UNUSED: Record<Stage, { label: string; chip: string; dot: string }> =
	{
		lead: {
			label: "NOVO LEAD",
			chip: "bg-[hsl(264_60%_94%)] text-[hsl(264_50%_42%)]",
			dot: "hsl(264 50% 50%)",
		},
		wait: {
			label: "AGUARDANDO",
			chip: "bg-[hsl(28_92%_93%)] text-[hsl(25_70%_34%)]",
			dot: "hsl(28 70% 48%)",
		},
		eval: {
			label: "AVALIAÇÃO AGENDADA",
			chip: "bg-[hsl(211_100%_93%)] text-[hsl(211_100%_35%)]",
			dot: "hsl(211 100% 50%)",
		},
		treat: {
			label: "EM TRATAMENTO",
			chip: "bg-[hsl(142_60%_92%)] text-[hsl(142_55%_28%)]",
			dot: "hsl(142 55% 40%)",
		},
		done: {
			label: "ALTA",
			chip: "bg-[hsl(220_14%_92%)] text-[hsl(220_9%_38%)]",
			dot: "hsl(220 9% 50%)",
		},
	};

interface Conv {
	initials: string;
	avatar: string;
	name: string;
	time: string;
	preview: ReactNode;
	unread?: number;
	stage: Stage;
	active?: boolean;
}

const CONVERSATIONS: Conv[] = [
	{
		initials: "MA",
		avatar: "linear-gradient(135deg,hsl(264 55% 62%),hsl(264 55% 48%))",
		name: "Marina Alves",
		time: "09:42",
		preview: "Bom dia! Gostaria de saber o valor da avaliação",
		unread: 2,
		stage: "lead",
		active: true,
	},
	{
		initials: "CF",
		avatar: "linear-gradient(135deg,hsl(211 100% 60%),hsl(211 100% 42%))",
		name: "Carla Ferreira",
		time: "09:15",
		preview: (
			<>
				{ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Perfeito, confirmado
				para amanhã 14h
			</>
		),
		stage: "treat",
	},
	{
		initials: "RS",
		avatar: "linear-gradient(135deg,hsl(28 85% 58%),hsl(28 85% 46%))",
		name: "Rafael Souza",
		time: "08:50",
		preview: "Posso remarcar para sexta?",
		unread: 1,
		stage: "wait",
	},
	{
		initials: "JP",
		avatar: "linear-gradient(135deg,hsl(340 70% 60%),hsl(340 70% 48%))",
		name: "Juliana Pires",
		time: "ontem",
		preview: (
			<>
				{ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Obrigada, doutor!
				Até quinta 🙏
			</>
		),
		stage: "eval",
	},
	{
		initials: "ET",
		avatar: "linear-gradient(135deg,hsl(180 50% 48%),hsl(180 50% 36%))",
		name: "Eduardo Tavares",
		time: "ontem",
		preview: "Vi vocês no Instagram, atendem joelho?",
		unread: 3,
		stage: "lead",
	},
	{
		initials: "LM",
		avatar: "linear-gradient(135deg,hsl(142 50% 50%),hsl(142 50% 38%))",
		name: "Lucas Martins",
		time: "ter",
		preview: (
			<>
				{ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Enviei o plano de
				exercícios 📎
			</>
		),
		stage: "treat",
	},
	{
		initials: "BC",
		avatar: "linear-gradient(135deg,hsl(220 12% 58%),hsl(220 12% 44%))",
		name: "Beatriz Campos",
		time: "seg",
		preview: (
			<>
				{ic(CheckCheck, 13, { color: "hsl(199 90% 48%)" })} Tratamento
				concluído. Cuide-se!
			</>
		),
		stage: "done",
	},
];

const PIPELINE = [
	{ label: "Todos", n: 23, active: true },
	{ label: "Novos leads", n: 7 },
	{ label: "Aguardando", n: 5 },
	{ label: "Avaliação", n: 4 },
	{ label: "Em tratamento", n: 7 },
];

const QUICK_REPLIES = [
	{ icon: ic(Zap, 12), label: "Horários disponíveis", tmpl: true },
	{ icon: ic(MapPin, 12), label: "Endereço" },
	{ icon: ic(FileText, 12), label: "Tabela de valores" },
	{ icon: ic(CalendarPlus, 12), label: "Agendar avaliação" },
];

const LEAD_DETAILS = [
	{
		k: "Origem",
		v: (
			<span className="inline-flex items-center gap-1 rounded-full bg-[hsl(142_60%_92%)] px-2 py-0.5 text-[11px] font-bold text-[hsl(142_55%_28%)]">
				{ic(Camera, 11)} Instagram Ads
			</span>
		),
	},
	{ k: "Campanha", v: "Dor no joelho" },
	{ k: "Convênio", v: "Unimed" },
	{ k: "Interesse", v: "Joelho · avaliação" },
	{ k: "Primeiro contato", v: "Hoje, 09:41" },
	{ k: "Responsável", v: "Dr. Rafael M." },
];

function IconBtn({ children }: { children: ReactNode }) {
	return (
		<button className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-transparent bg-transparent text-muted-foreground hover:bg-secondary">
			{children}
		</button>
	);
}

export default function CrmWhatsApp() {
	return (
		<PageLayout>
			<PageContainer>
				<PageHeader
					title={
						<>
							CRM
							<span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(142_70%_94%)] px-2.5 py-[3px] text-[10px] font-extrabold tracking-[0.04em] text-[hsl(142_60%_28%)]">
								<span className="h-1.5 w-1.5 rounded-full bg-[hsl(142_70%_42%)]" />{" "}
								WhatsApp conectado
							</span>
						</>
					}
				/>
			</PageContainer>
		</PageLayout>
	);
}
