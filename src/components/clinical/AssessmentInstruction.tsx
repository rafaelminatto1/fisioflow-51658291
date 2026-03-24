import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Camera, CheckCircle2, Info } from "lucide-react";
import { clinicalReferences } from "@/data/clinicalReferences";

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

	return (
		<div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
				<CardHeader className="bg-primary/5 border-b">
					<div className="flex justify-between items-start">
						<CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
						<Badge variant="outline" className="bg-background font-bold text-primary border-primary/20">
							Padrão Ouro
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="p-8 space-y-8">
					{/* Reference Badge */}
					{reference && (
						<div className="flex gap-3 p-4 bg-muted/50 rounded-2xl border border-dashed">
							<BookOpen className="h-5 w-5 text-primary shrink-0 mt-1" />
							<div>
								<p className="text-[10px] font-black uppercase text-primary tracking-widest">Embasa Científico</p>
								<p className="text-xs font-bold leading-tight mt-1">
									{reference.title} ({reference.year})
								</p>
								<p className="text-[10px] text-muted-foreground mt-1">
									{reference.authors} • {reference.journal}
								</p>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="space-y-4">
							<h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-green-500" /> Passo-a-Passo
							</h4>
							<ul className="space-y-3">
								{steps.map((step, i) => (
									<li key={i} className="flex gap-3 text-sm">
										<span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
											{i + 1}
										</span>
										<span className="text-muted-foreground font-medium">{step}</span>
									</li>
								))}
							</ul>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
								<Camera className="h-4 w-4 text-primary" /> Posicionamento
							</h4>
							<div className="aspect-video bg-muted rounded-xl flex items-center justify-center border-2 border-dashed relative overflow-hidden">
								<Camera className="h-8 w-8 text-muted-foreground/20" />
								<p className="absolute bottom-3 text-[10px] font-bold text-muted-foreground px-4 text-center">
									{positioning}
								</p>
							</div>
						</div>
					</div>

					<div className="pt-4">
						<Button onClick={onStart} className="w-full h-14 text-lg font-black rounded-2xl shadow-lg hover:shadow-primary/20 transition-all gap-2">
							INICIAR AVALIAÇÃO <ChevronRight className="h-5 w-5" />
						</Button>
					</div>
				</CardContent>
			</Card>
			
			<div className="flex items-center justify-center gap-2 text-muted-foreground/60">
				<Info className="h-3 w-3" />
				<span className="text-[10px] font-bold uppercase tracking-tighter">
					Certifique-se de ter boa iluminação para o tracking de IA.
				</span>
			</div>
		</div>
	);
};

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
