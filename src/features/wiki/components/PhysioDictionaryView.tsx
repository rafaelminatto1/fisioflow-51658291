import React, { useState } from 'react';
import { Search, BookA, Languages, Plus, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useDictionary, DictionaryTerm } from '@/hooks/useDictionary';
import { DictionaryTermModal } from './DictionaryTermModal';
import { ProtocolDetailView } from './ProtocolDetailView';
import { protocolDictionary, ProtocolEntry } from '@/data/protocolDictionary';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORIES = [
	{ id: 'all', label: 'Todos' },
	{ id: 'muscle', label: 'Músculos' },
	{ id: 'joint', label: 'Articulações' },
	{ id: 'ligament', label: 'Ligamentos' },
	{ id: 'condition', label: 'Patologias' },
	{ id: 'exercise', label: 'Exercícios' },
	{ id: 'test', label: 'Testes Clínicos' },
	{ id: 'movement', label: 'Movimentos' },
	{ id: 'questionnaire', label: 'Questionários' },
	{ id: 'procedure', label: 'Protocolos' },
];

export function PhysioDictionaryView() {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeCategory, setActiveCategory] = useState<string>('all');
	const [showModal, setShowModal] = useState(false);
	const [editTerm, setEditTerm] = useState<DictionaryTerm | undefined>(undefined);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [selectedProtocol, setSelectedProtocol] = useState<ProtocolEntry | null>(null);

	const {
		terms,
		isLoading,
		createTerm,
		updateTerm,
		deleteTerm,
		isCreating,
		isUpdating,
	} = useDictionary(searchQuery, activeCategory);

	const handleAdd = () => {
		setEditTerm(undefined);
		setShowModal(true);
	};

	const handleEdit = (term: DictionaryTerm) => {
		setEditTerm(term);
		setShowModal(true);
	};

	const handleSubmit = (data: any) => {
		if (editTerm) {
			updateTerm({ id: editTerm.id, ...data });
		} else {
			createTerm(data);
		}
		setShowModal(false);
	};

	const handleDelete = () => {
		if (deleteId) {
			deleteTerm(deleteId);
			setDeleteId(null);
		}
	};

	return (
		<div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
			<div className="border-b bg-background px-6 py-6 space-y-4">
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-2xl font-bold flex items-center gap-2">
							<Languages className="h-6 w-6 text-sky-500" />
							Dicionário Bilíngue
						</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Pesquise termos técnicos em português ou inglês e encontre traduções e sinônimos aplicados em toda a plataforma.
						</p>
					</div>
					<Button onClick={handleAdd} className="gap-2">
						<Plus className="h-4 w-4" />
						Novo Termo
					</Button>
				</div>

				<div className="relative">
					<Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
					<Input
						placeholder="Buscar termo em PT ou EN (ex: LCA, Squat, Isquiotibiais)..."
						className="pl-10 h-12 text-base shadow-sm"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="flex flex-wrap gap-2 pt-2">
					{CATEGORIES.map((cat) => (
						<Badge
							key={cat.id}
							variant={activeCategory === cat.id ? 'default' : 'outline'}
							className="cursor-pointer px-3 py-1 text-xs"
							onClick={() => setActiveCategory(cat.id)}
						>
							{cat.label}
						</Badge>
					))}
				</div>
			</div>

			<ScrollArea className="flex-1 p-6">
				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
						{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
							<div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-50 dark:border-slate-800" />
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-1">
						{terms.map((term) => (
							<Card 
								key={term.id} 
								className="group relative border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 overflow-hidden cursor-pointer"
								onClick={() => {
									if (term.category === 'procedure' || term.subcategory === 'Protocolo') {
										const proto = protocolDictionary.find(p => p.id === term.id);
										if (proto) setSelectedProtocol(proto);
									}
								}}
							>
								<div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/10 group-hover:bg-blue-500 transition-colors" />
								<CardHeader className="p-4 pb-2 relative">
									<div className="flex justify-between items-start">
										<CardTitle className="text-base font-bold text-primary pr-12">
											{term.pt}
										</CardTitle>
										<div className="flex items-center gap-1">
											<Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
												{term.category}
											</Badge>
										</div>
									</div>
									<CardDescription className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
										<Languages className="h-3 w-3" />
										{term.en}
									</CardDescription>

									<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											onClick={() => handleEdit(term)}
										>
											<Edit className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
											onClick={() => setDeleteId(term.id)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</CardHeader>
								<CardContent className="p-4 space-y-3 text-sm">
									{term.aliasesPt && term.aliasesPt.length > 0 && (
										<div>
											<span className="text-xs font-semibold text-muted-foreground block mb-1">Sinônimos (PT):</span>
											<div className="flex flex-wrap gap-1">
												{term.aliasesPt.map((alias, idx) => (
													<span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">
														{alias}
													</span>
												))}
											</div>
										</div>
									)}
									{term.aliasesEn && term.aliasesEn.length > 0 && (
										<div>
											<span className="text-xs font-semibold text-muted-foreground block mb-1">Synonyms (EN):</span>
											<div className="flex flex-wrap gap-1">
												{term.aliasesEn.map((alias, idx) => (
													<span key={idx} className="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded text-[10px]">
														{alias}
													</span>
												))}
											</div>
										</div>
									)}
									{term.subcategory && (
										<div className="pt-2 border-t mt-2">
											<span className="text-[11px] text-muted-foreground flex items-center gap-1">
												<BookA className="h-3 w-3" />
												{term.subcategory}
											</span>
										</div>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				)}
				{!isLoading && terms.length === 0 && (
					<div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
						<div className="h-24 w-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 relative">
							<div className="absolute inset-0 rounded-full bg-slate-200/50 dark:bg-slate-800/50 animate-ping" />
							<BookA className="h-10 w-10 text-slate-400 dark:text-slate-600 relative z-10" />
						</div>
						<h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Dicionário Vazio</h3>
						<p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-3 font-medium">
							Não encontramos termos para sua busca. Deseja cadastrar uma nova terminologia clínica?
						</p>
						<Button variant="default" className="mt-8 rounded-xl font-bold shadow-lg shadow-blue-500/20 px-8" onClick={handleAdd}>
							<Plus className="h-4 w-4 mr-2" /> Adicionar Termo
						</Button>
					</div>
				)}
			</ScrollArea>

			<DictionaryTermModal
				open={showModal}
				onOpenChange={setShowModal}
				onSubmit={handleSubmit}
				term={editTerm}
				isLoading={isCreating || isUpdating}
			/>

			{/* Modal de Detalhes do Protocolo */}
			<Dialog open={!!selectedProtocol} onOpenChange={(open) => !open && setSelectedProtocol(null)}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					{selectedProtocol && (
						<>
							<DialogHeader className="sr-only">
								<DialogTitle>{selectedProtocol.pt}</DialogTitle>
							</DialogHeader>
							<ProtocolDetailView protocol={selectedProtocol} />
						</>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
						<AlertDialogDescription>
							Tem certeza que deseja excluir este termo do dicionário? Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
