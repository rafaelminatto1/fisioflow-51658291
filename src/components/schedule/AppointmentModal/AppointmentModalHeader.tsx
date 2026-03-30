import React from "react";
import { Calendar, Edit3, Eye } from "lucide-react";
import {
	CustomModalHeader,
	CustomModalTitle,
} from "@/components/ui/custom-modal";

interface AppointmentModalHeaderProps {
	currentMode: "create" | "edit" | "view";
	onClose: () => void;
}

const MODE_CONFIG = {
	view: {
		label: "Detalhes do Agendamento",
		subtitle: "Visualize os dados do agendamento",
		icon: Eye,
		iconColor: "text-slate-500",
		iconBg: "bg-slate-100",
	},
	edit: {
		label: "Editar Agendamento",
		subtitle: "Atualize os dados do agendamento",
		icon: Edit3,
		iconColor: "text-blue-600",
		iconBg: "bg-blue-50",
	},
	create: {
		label: "Novo Agendamento",
		subtitle: "Preencha os dados do agendamento",
		icon: Calendar,
		iconColor: "text-blue-600",
		iconBg: "bg-blue-50",
	},
} as const;

export const AppointmentModalHeader: React.FC<AppointmentModalHeaderProps> = ({
	currentMode,
	onClose,
}) => {
	const config = MODE_CONFIG[currentMode];
	const Icon = config.icon;

	return (
		<CustomModalHeader
			onClose={onClose}
			className="bg-white border-b border-slate-100 px-5 sm:px-6 py-4"
		>
			<div className="flex items-center gap-3">
				<div className={`flex items-center justify-center w-8 h-8 rounded-lg ${config.iconBg} shrink-0`}>
					<Icon className={`h-4 w-4 ${config.iconColor}`} />
				</div>
				<div className="flex flex-col">
					<CustomModalTitle className="text-sm font-semibold text-slate-800 leading-tight">
						{config.label}
					</CustomModalTitle>
					<span className="text-xs text-slate-500 mt-0.5">{config.subtitle}</span>
				</div>
			</div>
		</CustomModalHeader>
	);
};
