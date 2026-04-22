import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clinicalReferences } from "@/data/clinicalReferences";
import { physioDictionary } from "@/data/physioDictionary";
import { ChevronRight, ChevronLeft, BookOpen, CheckCircle2, Camera, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface InstructionProps {
	testId: string;
	title: string;
	steps: string[];
	positioning: string;
	onStart: () => void;
}

export const AssessmentInstruction: React.FC<InstructionProps> = ({
	testId,
	title,
	steps,
	positioning,
	onStart,
}) => {
	const reference = clinicalReferences[testId];
	const dictionaryEntry = physioDictionary.find(entry => entry.id === testId || entry.id === `tst_${testId}`);
	const imageUrl = dictionaryEntry?.image_url;

	return (
		<div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<Card className="border-0 shadow-2xl bg-background/60 backdrop-blur-xl overflow-hidden ring-1 ring-white/10">
				<CardHeader className="bg-gradient-to-r from-primary/10 via-background to-transparent border-b border-primary/5 py-8">
					<div className="flex justify-between items-center px-2">
						<div className="space-y-1">
							<Badge variant="secondary" className="bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest mb-2 border-0">
								Teste Especial
							</Badge>
							<CardTitle className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
								{title}
							</CardTitle>
						</div>
						<div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
							<BookOpen className="h-8 w-8 text-primary/40" />
						</div>
					</div>
				</CardHeader>
				
				<CardContent className="p-0">
					<div className="grid grid-cols-1 lg:grid-cols-12">
						{/* Coluna de Instruções (Esquerda) */}
						<div className="lg:col-span-5 p-8 space-y-8 border-r border-primary/5 bg-muted/20">
							<div className="space-y-6">
								<h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
									<CheckCircle2 className="h-4 w-4" /> Protocolo de Execução
								</h4>
								<ul className="space-y-4">
									{steps.map((step, i) => (
										<li key={i} className="flex gap-4 group">
											<span className="h-6 w-6 rounded-lg bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
												{i + 1}
											</span>
											<span className="text-sm font-semibold text-muted-foreground leading-relaxed">
												{step}
											</span>
										</li>
									))}
								</ul>
							</div>

							{reference && (
								<div className="p-6 bg-background/40 rounded-3xl border border-primary/5 space-y-3">
									<div className="flex items-center gap-2">
										<Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0 text-[9px] font-black uppercase">
											Padrão Ouro
										</Badge>
									</div>
									<p className="text-xs font-bold leading-snug">
										{reference.title} ({reference.year})
									</p>
									<p className="text-[10px] text-muted-foreground font-medium italic">
										{reference.authors}
									</p>
								</div>
							)}
						</div>

						{/* Coluna da Imagem Técnica (Direita) */}
						<div className="lg:col-span-7 p-8 flex flex-col justify-between space-y-6 bg-background">
							<div className="space-y-4">
								<h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
									<Camera className="h-4 w-4" /> Anatomia & Posicionamento
								</h4>
								
								<div className="relative aspect-square lg:aspect-video rounded-[2rem] overflow-hidden border-4 border-muted/30 shadow-inner group">
									{imageUrl ? (
										<img 
											src={imageUrl} 
											alt={title} 
											className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
										/>
									) : (
										<div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center gap-3">
											<Camera className="h-12 w-12 text-muted-foreground/20" />
											<p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Aguardando Imagem IA</p>
										</div>
									)}
									
									<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
									<div className="absolute bottom-6 left-6 right-6">
										<div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
											<p className="text-xs font-bold text-white leading-relaxed">
												{positioning}
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-4 pt-4">
								<Button 
									onClick={onStart} 
									className="w-full h-20 text-xl font-black rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3 bg-primary text-primary-foreground group"
								>
									INICIAR AVALIAÇÃO 
									<div className="h-10 w-10 rounded-2xl bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
										<ChevronRight className="h-6 w-6" />
									</div>
								</Button>
								<div className="flex items-center justify-center gap-2 text-muted-foreground/40">
									<Info className="h-3 w-3" />
									<span className="text-[9px] font-black uppercase tracking-widest">
										Clique para ativar o tracking de movimentos via IA
									</span>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

