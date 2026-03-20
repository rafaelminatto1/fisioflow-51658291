import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
	clinicalTestsApi,
	mediaApi,
	type ClinicalTestTemplateRecord,
} from "@/lib/api/workers-client";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Save,
	Loader2,
	BookOpen,
	Settings,
	BarChart3,
	Video,
	Image as ImageIcon,
	UploadCloud,
	Plus,
} from "lucide-react";
import {
	ClinicalTestMetricsBuilder,
	MetricField,
} from "./ClinicalTestMetricsBuilder";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClinicalTest
	extends Omit<ClinicalTestTemplateRecord, "fields_definition"> {
	id?: string;
	purpose: string | null;
	execution: string | null;
	fields_definition?: MetricField[];
	organization_id?: string;
}

interface ClinicalTestFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	test?: ClinicalTest | null;
	mode: "create" | "edit";
}

const CATEGORIES = [
	"Ortopedia",
	"Esportiva",
	"Pós-Operatório",
	"Neurológico",
	"Respiratório",
];
const TARGET_JOINTS = [
	"Ombro",
	"Joelho",
	"Quadril",
	"Tornozelo",
	"Coluna",
	"Cervical",
	"Punho",
	"Cotovelo",
];
const TEST_TYPES = [
	{ value: "special_test", label: "Teste Especial" },
	{ value: "functional_test", label: "Teste Funcional" },
];

export function ClinicalTestFormModal({
	open,
	onOpenChange,
	test,
	mode,
}: ClinicalTestFormModalProps) {
	const isMobile = useIsMobile();
	const { user, organizationId } = useAuth();
	const queryClient = useQueryClient();

	const [formData, setFormData] = useState<ClinicalTest>({
		name: "",
		name_en: "",
		category: "",
		target_joint: "",
		purpose: "",
		execution: "",
		positive_sign: "",
		reference: "",
		sensitivity_specificity: "",
		tags: [],
		type: "special_test",
		fields_definition: [],
		regularity_sessions: null,
		layout_type: undefined,
		image_url: "",
		media_urls: [],
	});

	const [tagsInput, setTagsInput] = useState("");
	const [isUploading, setIsUploading] = useState(false);

	useEffect(() => {
		if (test && mode === "edit") {
			setFormData({
				...test,
				fields_definition: Array.isArray(test.fields_definition)
					? test.fields_definition
					: [],
				layout_type: test.layout_type ?? undefined,
				image_url: test.image_url ?? "",
				media_urls: Array.isArray(test.media_urls) ? test.media_urls : [],
			});
			setTagsInput((test.tags || []).join(", "));
		} else if (mode === "create") {
			setFormData({
				name: "",
				name_en: "",
				category: "",
				target_joint: "",
				purpose: "",
				execution: "",
				positive_sign: "",
				reference: "",
				sensitivity_specificity: "",
				tags: [],
				type: "special_test",
				fields_definition: [],
				regularity_sessions: null,
				layout_type: undefined,
				image_url: "",
				media_urls: [],
			});
			setTagsInput("");
		}
	}, [test, mode, open]);

	const mutation = useMutation({
		mutationFn: async (data: ClinicalTest) => {
			const payload = {
				name: data.name,
				name_en: data.name_en || null,
				category: data.category || null,
				target_joint: data.target_joint || null,
				purpose: data.purpose || null,
				execution: data.execution || null,
				positive_sign: data.positive_sign || null,
				reference: data.reference || null,
				sensitivity_specificity: data.sensitivity_specificity || null,
				tags: data.tags || [],
				type: data.type || "special_test",
				fields_definition: data.fields_definition || [],
				regularity_sessions: data.regularity_sessions || null,
				layout_type: data.layout_type || null,
				image_url: data.image_url || null,
				media_urls: data.media_urls?.length ? data.media_urls : null,
				organization_id: organizationId,
				created_by: user?.uid,
				is_custom: true,
			};

			if (mode === "edit" && data.id) {
				return await clinicalTestsApi.update(data.id, payload);
			}
			return await clinicalTestsApi.create(payload);
		},
		onSuccess: () => {
			toast.success(
				mode === "create"
					? "Teste clínico criado com sucesso!"
					: "Teste clínico atualizado!",
			);
			queryClient.invalidateQueries({ queryKey: ["clinical-tests-library"] });
			onOpenChange(false);
		},
		onError: (error) => {
			logger.error("Error saving test", error, "ClinicalTestFormModal");
			toast.error("Erro ao salvar teste clínico");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const tags = tagsInput
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);
		mutation.mutate({ ...formData, tags });
	};

	const isPending = mutation.isPending;

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-2xl h-[90vh]"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="text-xl font-bold flex items-center gap-2">
					{mode === "create" ? (
						<Plus className="h-5 w-5 text-teal-600" />
					) : (
						<Settings className="h-5 w-5 text-teal-600" />
					)}
					{mode === "create" ? "Novo Teste Clínico" : "Editar Teste Clínico"}
				</CustomModalTitle>
			</CustomModalHeader>

			<Tabs
				defaultValue="basic"
				className="flex-1 flex flex-col overflow-hidden"
			>
				<TabsList className="px-6 py-2 bg-slate-50 border-b justify-start rounded-none shrink-0 overflow-x-auto scrollbar-hide">
					<TabsTrigger value="basic" className="gap-1.5">
						<BookOpen className="h-4 w-4" /> Básico
					</TabsTrigger>
					<TabsTrigger value="metrics" className="gap-1.5">
						<BarChart3 className="h-4 w-4" /> Métricas
					</TabsTrigger>
					<TabsTrigger value="settings" className="gap-1.5">
						<Settings className="h-4 w-4" /> Configurações
					</TabsTrigger>
					<TabsTrigger value="media" className="gap-1.5">
						<Video className="h-4 w-4" /> Mídia
					</TabsTrigger>
				</TabsList>

				<CustomModalBody className="p-0 sm:p-0">
					<div className="p-6">
						<TabsContent value="basic" className="mt-0 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="col-span-2 md:col-span-1">
									<Label htmlFor="name">Nome do Teste *</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										placeholder="Ex: Teste de Lachman"
										required
									/>
								</div>
								<div className="col-span-2 md:col-span-1">
									<Label htmlFor="name_en">Nome (Inglês)</Label>
									<Input
										id="name_en"
										value={formData.name_en || ""}
										onChange={(e) =>
											setFormData({ ...formData, name_en: e.target.value })
										}
										placeholder="Ex: Lachman Test"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="category">Categoria</Label>
									<Select
										value={formData.category}
										onValueChange={(value) =>
											setFormData({ ...formData, category: value })
										}
									>
										<SelectTrigger id="category">
											<SelectValue placeholder="Selecione..." />
										</SelectTrigger>
										<SelectContent>
											{CATEGORIES.map((cat) => (
												<SelectItem key={cat} value={cat}>
													{cat}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="target_joint">Articulação/Região</Label>
									<Select
										value={formData.target_joint}
										onValueChange={(value) =>
											setFormData({ ...formData, target_joint: value })
										}
									>
										<SelectTrigger id="target_joint">
											<SelectValue placeholder="Selecione..." />
										</SelectTrigger>
										<SelectContent>
											{TARGET_JOINTS.map((joint) => (
												<SelectItem key={joint} value={joint}>
													{joint}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Purpose */}
							<div>
								<Label htmlFor="purpose">Propósito</Label>
								<Textarea
									id="purpose"
									value={formData.purpose}
									onChange={(e) =>
										setFormData({ ...formData, purpose: e.target.value })
									}
									placeholder="Descreva o objetivo clínico do teste..."
									rows={2}
								/>
							</div>

							{/* Execution */}
							<div>
								<Label htmlFor="execution">Execução</Label>
								<Textarea
									id="execution"
									value={formData.execution}
									onChange={(e) =>
										setFormData({ ...formData, execution: e.target.value })
									}
									placeholder="Descreva passo a passo como realizar o teste..."
									rows={3}
								/>
							</div>

							{/* Positive Sign */}
							<div>
								<Label htmlFor="positive_sign">Interpretação Positiva</Label>
								<Textarea
									id="positive_sign"
									value={formData.positive_sign || ""}
									onChange={(e) =>
										setFormData({ ...formData, positive_sign: e.target.value })
									}
									placeholder="O que indica um resultado positivo..."
									rows={2}
								/>
							</div>

							{/* Reference and Sensitivity */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="reference">Referência Bibliográfica</Label>
									<Input
										id="reference"
										value={formData.reference || ""}
										onChange={(e) =>
											setFormData({ ...formData, reference: e.target.value })
										}
										placeholder="Ex: Magee, 2014"
									/>
								</div>
								<div>
									<Label htmlFor="sensitivity">
										Sensibilidade/Especificidade
									</Label>
									<Input
										id="sensitivity"
										value={formData.sensitivity_specificity || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												sensitivity_specificity: e.target.value,
											})
										}
										placeholder="Ex: 85% sens, 94% espec"
									/>
								</div>
							</div>

							{/* Tags */}
							<div>
								<Label htmlFor="tags">Tags (separadas por vírgula)</Label>
								<Input
									id="tags"
									value={tagsInput}
									onChange={(e) => setTagsInput(e.target.value)}
									placeholder="Ex: Ortopedia, Joelho, LCA"
								/>
							</div>
						</TabsContent>

						<TabsContent value="metrics" className="mt-0">
							<ClinicalTestMetricsBuilder
								fields={formData.fields_definition || []}
								onChange={(fields) =>
									setFormData({ ...formData, fields_definition: fields })
								}
							/>
						</TabsContent>

						<TabsContent value="settings" className="mt-0 space-y-6">
							{/* Test Type */}
							<div>
								<Label htmlFor="type">Tipo de Teste</Label>
								<Select
									value={formData.type || "special_test"}
									onValueChange={(value) =>
										setFormData({ ...formData, type: value })
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEST_TYPES.map((type) => (
											<SelectItem key={type.value} value={type.value}>
												{type.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-slate-500 mt-1">
									Testes Especiais são qualitativos (positivo/negativo). Testes
									Funcionais são quantitativos (medições).
								</p>
							</div>

							{/* Regularity */}
							<div>
								<Label htmlFor="regularity">
									Regularidade (a cada X sessões)
								</Label>
								<div className="flex items-center gap-3">
									<Input
										id="regularity"
										type="number"
										min={1}
										max={100}
										value={formData.regularity_sessions || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												regularity_sessions: e.target.value
													? Number(e.target.value)
													: null,
											})
										}
										placeholder="Ex: 4"
										className="w-32"
									/>
									<span className="text-sm text-slate-500">sessões</span>
								</div>
								<p className="text-xs text-slate-500 mt-1">
									Define a frequência recomendada para reaplicar este teste.
									Deixe vazio para aplicar apenas quando necessário.
								</p>
							</div>

							{/* Layout no registro de medições */}
							<div>
								<Label htmlFor="layout_type">
									Layout no Registro de Medições
								</Label>
								<Select
									value={formData.layout_type || "single"}
									onValueChange={(
										value: "single" | "multi_field" | "y_balance" | "radial",
									) =>
										setFormData({
											...formData,
											layout_type: value === "single" ? undefined : value,
										})
									}
								>
									<SelectTrigger id="layout_type">
										<SelectValue placeholder="Padrão (valor único)" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="single">Valor único (padrão)</SelectItem>
										<SelectItem value="multi_field">
											Vários campos (3+)
										</SelectItem>
										<SelectItem value="y_balance">
											Y Balance (diagrama em Y)
										</SelectItem>
										<SelectItem value="radial">
											Radial (ex.: Estrela de Maigne)
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-slate-500 mt-1">
									Define como o teste aparece ao registrar medições na evolução
									(diagrama, vários campos, etc.).
								</p>
							</div>
						</TabsContent>

						<TabsContent value="media" className="mt-0 space-y-6">
							{/* YouTube/Video URL */}
							<div>
								<Label htmlFor="media_urls" className="flex items-center gap-2">
									<Video className="h-4 w-4" /> Vídeos (URLs, separadas por
									vírgula)
								</Label>
								<Textarea
									id="media_urls"
									value={formData.media_urls?.join(", ") || ""}
									onChange={(e) => {
										const urls = e.target.value
											.split(",")
											.map((u) => u.trim())
											.filter(Boolean);
										setFormData({ ...formData, media_urls: urls });
									}}
									placeholder="https://www.youtube.com/watch?v=..., https://vimeo.com/..."
									rows={3}
								/>
								<p className="text-xs text-slate-500 mt-1">
									Adicione links de vídeos demonstrativos da execução do teste.
								</p>
							</div>

							{/* Main Image URL */}
							<div>
								<Label
									htmlFor="image_url_media"
									className="flex items-center gap-2"
								>
									<ImageIcon className="h-4 w-4" /> URL da Imagem de Capa
								</Label>
								<Input
									id="image_url_media"
									type="url"
									value={formData.image_url || ""}
									onChange={(e) =>
										setFormData({ ...formData, image_url: e.target.value })
									}
									placeholder="https://... (imagem de execução)"
								/>
								<p className="text-xs text-slate-500 mt-1">
									Imagem exibida como referência visual para o teste.
								</p>
							</div>
						</TabsContent>
					</div>
				</CustomModalBody>
			</Tabs>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					type="button"
					variant="outline"
					onClick={() => onOpenChange(false)}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={handleSubmit}
					className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
					disabled={isPending || !formData.name}
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Save className="h-4 w-4" />
					)}
					{mode === "create" ? "Criar Teste" : "Salvar Alterações"}
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
}
