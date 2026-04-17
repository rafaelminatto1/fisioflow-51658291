import React, { useState } from 'react';
import { Search, BookA, Languages, Plus, Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useDictionary, DictionaryTerm } from '@/hooks/useDictionary';
import { DictionaryTermModal } from './DictionaryTermModal';
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
];

export function PhysioDictionaryView() {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeCategory, setActiveCategory] = useState<string>('all');
	const [showModal, setShowModal] = useState(false);
	const [editTerm, setEditTerm] = useState<DictionaryTerm | undefined>(undefined);
	const [deleteId, setDeleteId] = useState<string | null>(null);

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
					<div className="flex items-center justify-center h-40">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{terms.map((term) => (
							<Card key={term.id} className="overflow-hidden hover:shadow-md transition-all group">
								<CardHeader className="p-4 pb-2 bg-muted/20 border-b relative">
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
					<div className="text-center py-20">
						<p className="text-muted-foreground text-lg">Nenhum termo encontrado.</p>
						<Button variant="outline" className="mt-4" onClick={handleAdd}>
							Adicionar primeiro termo
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
