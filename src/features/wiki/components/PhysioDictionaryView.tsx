import React, { useState, useMemo } from 'react';
import { Search, BookA, Languages } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTermsByCategory, searchDictionary, PhysioTermCategory } from '@/lib/utils/bilingualSearch';

const CATEGORIES: { id: PhysioTermCategory | 'all'; label: string }[] = [
	{ id: 'all', label: 'Todos' },
	{ id: 'muscle', label: 'Músculos' },
	{ id: 'joint', label: 'Articulações' },
	{ id: 'ligament', label: 'Ligamentos' },
	{ id: 'condition', label: 'Patologias' },
	{ id: 'exercise', label: 'Exercícios' },
	{ id: 'test', label: 'Testes Clínicos' },
	{ id: 'movement', label: 'Movimentos' },
];

export function PhysioDictionaryView() {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeCategory, setActiveCategory] = useState<PhysioTermCategory | 'all'>('all');

	const filteredTerms = useMemo(() => {
		const categoryFilter = activeCategory === 'all' ? undefined : activeCategory;
		return searchDictionary(searchQuery, categoryFilter);
	}, [searchQuery, activeCategory]);

	return (
		<div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
			<div className="border-b bg-background px-6 py-6 space-y-4">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<Languages className="h-6 w-6 text-sky-500" />
						Dicionário Bilíngue
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Pesquise termos técnicos em português ou inglês e encontre traduções e sinônimos aplicados em toda a plataforma.
					</p>
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
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{filteredTerms.map((term) => (
						<Card key={term.id} className="overflow-hidden hover:shadow-md transition-all">
							<CardHeader className="p-4 pb-2 bg-muted/20 border-b">
								<div className="flex justify-between items-start">
									<CardTitle className="text-base font-bold text-primary">
										{term.pt}
									</CardTitle>
									<Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
										{term.category}
									</Badge>
								</div>
								<CardDescription className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
									<Languages className="h-3 w-3" />
									{term.en}
								</CardDescription>
							</CardHeader>
							<CardContent className="p-4 space-y-3 text-sm">
								{term.aliases_pt.length > 0 && (
									<div>
										<span className="text-xs font-semibold text-muted-foreground block mb-1">Sinônimos (PT):</span>
										<div className="flex flex-wrap gap-1">
											{term.aliases_pt.map((alias, idx) => (
												<span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px]">
													{alias}
												</span>
											))}
										</div>
									</div>
								)}
								{term.aliases_en.length > 0 && (
									<div>
										<span className="text-xs font-semibold text-muted-foreground block mb-1">Synonyms (EN):</span>
										<div className="flex flex-wrap gap-1">
											{term.aliases_en.map((alias, idx) => (
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
				{filteredTerms.length === 0 && (
					<div className="text-center py-20">
						<p className="text-muted-foreground text-lg">Nenhum termo encontrado.</p>
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
