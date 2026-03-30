import { Card, CardContent } from "@/components/ui/card";
import type { Patient } from "@/types";
import { Activity, FileText, MapPin, Phone } from "lucide-react";

interface PersonalDataTabProps {
	patient: Patient;
}

export function PersonalDataTab({ patient }: PersonalDataTabProps) {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
						<Phone className="h-4 w-4 text-blue-500" />
						Contato e Emergência
					</h3>
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl">
						<CardContent className="p-5 space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Telefone
									</span>
									<span className="font-semibold text-slate-700">
										{patient.phone || "-"}
									</span>
								</div>
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Email
									</span>
									<span
										className="font-semibold text-slate-700 truncate block"
										title={patient.email}
									>
										{patient.email || "-"}
									</span>
								</div>
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Contato de Emergência
									</span>
									<span className="font-semibold text-slate-700">
										{patient.emergency_contact || "-"}
									</span>
								</div>
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Tel. Emergência
									</span>
									<span className="font-semibold text-slate-700">
										{patient.emergency_phone || "-"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
						<MapPin className="h-4 w-4 text-blue-500" />
						Endereço Residencial
					</h3>
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl">
						<CardContent className="p-5 space-y-4">
							<div className="space-y-4">
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Logradouro
									</span>
									<span className="font-semibold text-slate-700">
										{patient.address || "-"}
									</span>
								</div>
								<div className="grid grid-cols-2 gap-6">
									<div>
										<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
											Cidade/UF
										</span>
										<span className="font-semibold text-slate-700">
											{patient.city || "-"}{" "}
											{patient.state ? `/ ${patient.state}` : ""}
										</span>
									</div>
									<div>
										<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
											CEP
										</span>
										<span className="font-semibold text-slate-700">
											{patient.zip_code || "-"}
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
						<Activity className="h-4 w-4 text-blue-500" />
						Saúde e Convênio
					</h3>
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl">
						<CardContent className="p-5 space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Convênio
									</span>
									<span className="font-semibold text-slate-700">
										{patient.health_insurance || "Particular"}
									</span>
								</div>
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Nº da Carteirinha
									</span>
									<span className="font-semibold text-slate-700">
										{patient.insurance_number || "-"}
									</span>
								</div>
								<div className="col-span-1 sm:col-span-2">
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										CPF
									</span>
									<span className="font-semibold text-slate-700">
										{patient.cpf || "-"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<h3 className="font-bold text-base flex items-center gap-2 text-slate-800">
						<FileText className="h-4 w-4 text-blue-500" />
						Observações Internas
					</h3>
					<Card className="bg-white border-blue-100 shadow-sm rounded-xl min-h-[125px]">
						<CardContent className="p-5">
							<p className="text-sm leading-relaxed text-slate-600 italic">
								{patient.observations || "Nenhuma observação registrada."}
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
