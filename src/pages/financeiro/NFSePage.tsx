/**
 * NFSe Page Content - Premium UX/UI Experience
 * Refactored for maintainability and scalability.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Plus, Settings } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { NfseWizard } from "@/components/financial/NfseWizard";
import { useNFSeConfig } from "@/hooks/useNFSe";

// Sub-components
import { NFSeStats } from "./components/nfse/NFSeStats";
import { NFSeTable } from "./components/nfse/NFSeTable";
import { NFSeEmissionDialog } from "./components/nfse/NFSeEmissionDialog";
import { NFSeDetailsDialog } from "./components/nfse/NFSeDetailsDialog";
import { useNFSeActions } from "./components/nfse/useNFSeActions";
import { type NFSe } from "./components/nfse/types";

export function NFSeContent({
	autoOpenCreate = false,
	onAutoOpenHandled,
}: {
	autoOpenCreate?: boolean;
	onAutoOpenHandled?: () => void;
} = {}) {
	const { currentOrganization: orgData } = useOrganizations();
	const organizationId = orgData?.id;

	const { data: configData, isLoading: isLoadingConfig } = useNFSeConfig();
	const hasConfig = !isLoadingConfig && configData?.data != null;

	const [activeTab, setActiveTab] = useState<"lista" | "config">("lista");
	const [isEmissionOpen, setIsEmissionOpen] = useState(false);
	const [selectedNFSe, setSelectedNFSe] = useState<NFSe | null>(null);

	const { nfses, isLoading, cancelNFSe, createNFSe } =
		useNFSeActions(organizationId);

	useEffect(() => {
		if (autoOpenCreate) {
			setIsEmissionOpen(true);
			onAutoOpenHandled?.();
		}
	}, [autoOpenCreate, onAutoOpenHandled]);

	return (
		<div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
			{/* HEADER SECTION */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<motion.div
							whileHover={{ scale: 1.1, rotate: 5 }}
							className="p-3 rounded-2xl bg-slate-900 text-white shadow-2xl shadow-slate-200 dark:shadow-none"
						>
							<FileText className="h-6 w-6" />
						</motion.div>
						<h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white font-display">
							Faturamento <span className="text-slate-400">Premium</span>
						</h2>
					</div>
					<p className="text-slate-500 font-medium max-w-md leading-relaxed">
						Interface de alta performance para emissão e controle de NFS-e
						integrada à Nota do Milhão.
					</p>
				</div>

				<motion.div whileHover={{ scale: 1.02 }} whileActive={{ scale: 0.98 }}>
					<Button
						onClick={() => setIsEmissionOpen(true)}
						className="rounded-[1.5rem] h-16 px-10 bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-200 dark:shadow-none transition-all group border-none text-lg"
					>
						<Plus className="mr-2 h-6 w-6 transition-transform group-hover:rotate-90 duration-500" />
						<span className="font-black tracking-tight">Nova Nota Fiscal</span>
					</Button>
				</motion.div>
			</div>

			{/* BANNER: config não preenchida */}
			{!isLoadingConfig && !hasConfig && (
				<div className="flex items-start gap-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/30 p-5">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 mt-0.5">
						<Settings className="h-4.5 w-4.5" />
					</div>
					<div className="flex-1 space-y-1.5">
						<p className="text-sm font-bold text-amber-800 dark:text-amber-300">
							Configure o emissor antes de emitir notas
						</p>
						<p className="text-xs text-amber-700/80 dark:text-amber-400/80">
							Preencha CNPJ, inscrição municipal e certificado digital. Leva
							menos de 5 minutos com o assistente passo a passo.
						</p>
					</div>
					<Button
						size="sm"
						variant="outline"
						className="shrink-0 rounded-xl border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 text-xs font-bold"
						onClick={() => setActiveTab("config")}
					>
						Configurar agora
					</Button>
				</div>
			)}

			{/* STATS OVERVIEW */}
			<NFSeStats nfses={nfses} />

			{/* TABS SECTION */}
			<Tabs
				value={activeTab}
				onValueChange={(v: any) => setActiveTab(v)}
				className="w-full"
			>
				<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-px overflow-x-auto custom-scrollbar">
					<TabsList className="bg-transparent h-auto p-0 gap-10">
						<TabsTrigger
							value="lista"
							className="px-0 py-6 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent font-black text-xs text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-[0.25em]"
						>
							Histórico Digital
						</TabsTrigger>
						<TabsTrigger
							value="config"
							className="px-0 py-6 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent font-black text-xs text-slate-400 data-[state=active]:text-slate-900 transition-all uppercase tracking-[0.25em]"
						>
							Parâmetros Fiscais
						</TabsTrigger>
					</TabsList>
				</div>

				<AnimatePresence mode="wait">
					<TabsContent value="lista" className="mt-10 outline-none">
						<NFSeTable
							nfses={nfses}
							isLoading={isLoading}
							onSelect={setSelectedNFSe}
						/>
					</TabsContent>

					<TabsContent value="config" className="mt-10 outline-none">
						<NfseWizard />
					</TabsContent>
				</AnimatePresence>
			</Tabs>

			{/* EMISSION DIALOG */}
			<NFSeEmissionDialog
				isOpen={isEmissionOpen}
				onClose={() => setIsEmissionOpen(false)}
				onSubmit={(data) => createNFSe.mutate(data)}
				isSubmitting={createNFSe.isPending}
			/>

			{/* VIEW DETAILS DIALOG */}
			<NFSeDetailsDialog
				selectedNFSe={selectedNFSe}
				onClose={() => setSelectedNFSe(null)}
				onCancel={(id) => cancelNFSe.mutate(id)}
				isCancelling={cancelNFSe.isPending}
			/>
		</div>
	);
}

export default function NFSePage() {
	return (
		<PageLayout>
			<PageContainer>
				<div className="p-6 md:p-12 lg:p-20 max-w-screen-2xl mx-auto">
					<NFSeContent />
				</div>
			</PageContainer>
		</PageLayout>
	);
}
