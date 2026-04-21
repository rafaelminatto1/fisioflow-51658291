import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
	Bot, 
	X, 
	MessageSquare, 
	Sparkles, 
	Send, 
	User, 
	FileText, 
	Zap, 
	BrainCircuit,
	History,
	Trash2,
	ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AgentHubProps {
	isOpen: boolean;
	onClose: () => void;
}

const AGENTS = [
	{
		id: "soap-review",
		name: "AI SOAP Reviewer",
		description: "Analise seus prontuários para garantir precisão clínica e faturamento otimizado.",
		icon: FileText,
		color: "text-blue-500",
		bg: "bg-blue-500/10",
		prompt: "Olá! Cole seu texto do SOAP aqui e eu farei uma revisão técnica completa para você."
	},
	{
		id: "simulator",
		name: "Simulador de Paciente",
		description: "Treine seu raciocínio clínico com casos simulados de alta complexidade.",
		icon: BrainCircuit,
		color: "text-violet-500",
		bg: "bg-violet-500/10",
		prompt: "Estou pronto para simular um paciente. Que tipo de patologia ou queixa você gostaria de avaliar hoje?"
	}
];

export const AgentHub: React.FC<AgentHubProps> = ({ isOpen, onClose }) => {
	const [selectedAgent, setSelectedAgent] = useState<typeof AGENTS[0] | null>(null);
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<{ role: "user" | "assistant", content: string }[]>([]);
	const [isTyping, setIsTyping] = useState(false);

	const handleSendMessage = () => {
		if (!input.trim() || !selectedAgent) return;

		const userMessage = { role: "user" as const, content: input };
		setMessages(prev => [...prev, userMessage]);
		setInput("");
		setIsTyping(true);

		// Simulação de resposta da IA
		setTimeout(() => {
			const aiMessage = { 
				role: "assistant" as const, 
				content: selectedAgent.id === "soap-review" 
					? "Analisei seu SOAP. Identifiquei que a seção 'Objetivo' carece de dados mensuráveis. Sugiro incluir o grau de ADM do joelho para justificar o código de faturamento T93.2."
					: "Sinto uma dor aguda na face lateral do quadril ao subir escadas. Piora quando deito sobre esse lado à noite. Qual o próximo passo da sua avaliação?"
			};
			setMessages(prev => [...prev, aiMessage]);
			setIsTyping(false);
		}, 1500);
	};

	const resetChat = () => {
		setMessages([]);
		setSelectedAgent(null);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, x: 400 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: 400 }}
					className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl z-[250] flex flex-col border-l border-slate-200 dark:border-slate-800"
				>
					{/* Header */}
					<div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
								<Bot className="text-white w-5 h-5" />
							</div>
							<div>
								<h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">AGENT<span className="text-blue-500">HUB</span></h2>
								<p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Inteligência Clínica Ativa</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{selectedAgent && (
								<Button variant="ghost" size="sm" onClick={resetChat} className="text-slate-500 hover:text-red-500 gap-2 h-8">
									<Trash2 className="w-3.5 h-3.5" /> Limpar
								</Button>
							)}
							<Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
								<X className="w-5 h-5" />
							</Button>
						</div>
					</div>

					<div className="flex-1 overflow-hidden flex flex-col">
						{!selectedAgent ? (
							<div className="p-8 space-y-8 overflow-y-auto">
								<div className="space-y-2">
									<h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Com qual Agente você gostaria de trabalhar hoje?</h3>
									<p className="text-slate-500 font-medium">Nossos modelos foram treinados especificamente para a rotina da fisioterapia.</p>
								</div>

								<div className="grid grid-cols-1 gap-4">
									{AGENTS.map((agent) => (
										<motion.div
											key={agent.id}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
										>
											<Card 
												className="cursor-pointer border-slate-100 dark:border-slate-800 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all bg-slate-50/50 dark:bg-slate-900/50 group overflow-hidden"
												onClick={() => setSelectedAgent(agent)}
											>
												<CardContent className="p-6 flex items-center gap-6">
													<div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-colors", agent.bg)}>
														<agent.icon className={cn("w-8 h-8", agent.color)} />
													</div>
													<div className="flex-1 space-y-1">
														<div className="flex items-center justify-between">
															<h4 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{agent.name}</h4>
															<ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
														</div>
														<p className="text-sm text-slate-500 leading-relaxed">{agent.description}</p>
													</div>
												</CardContent>
											</Card>
										</motion.div>
									))}
								</div>

								<div className="pt-8 border-t border-slate-100 dark:border-slate-800">
									<div className="flex items-center gap-2 mb-4">
										<History className="w-4 h-4 text-slate-400" />
										<h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Atividade Recente</h4>
									</div>
									<div className="space-y-2">
										<p className="text-xs text-slate-500 italic">Nenhuma conversa salva recentemente.</p>
									</div>
								</div>
							</div>
						) : (
							<>
								{/* Chat Interface */}
								<ScrollArea className="flex-1 p-6">
									<div className="space-y-6">
										<div className="flex justify-center">
											<Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 py-1 px-3">
												Você está conversando com {selectedAgent.name}
											</Badge>
										</div>

										{messages.length === 0 && (
											<div className="flex gap-4 max-w-[85%]">
												<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", selectedAgent.bg)}>
													<selectedAgent.icon className={cn("w-4 h-4", selectedAgent.color)} />
												</div>
												<div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none">
													<p className="text-sm text-slate-800 dark:text-slate-200">{selectedAgent.prompt}</p>
												</div>
											</div>
										)}

										{messages.map((msg, i) => (
											<div 
												key={i} 
												className={cn(
													"flex gap-4 max-w-[85%]",
													msg.role === "user" ? "ml-auto flex-row-reverse" : ""
												)}
											>
												<div className={cn(
													"w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
													msg.role === "user" ? "bg-blue-600" : selectedAgent.bg
												)}>
													{msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <selectedAgent.icon className={cn("w-4 h-4", selectedAgent.color)} />}
												</div>
												<div className={cn(
													"p-4 rounded-2xl",
													msg.role === "user" 
														? "bg-blue-600 text-white rounded-tr-none" 
														: "bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm"
												)}>
													<p className="text-sm leading-relaxed">{msg.content}</p>
												</div>
											</div>
										))}

										{isTyping && (
											<div className="flex gap-4">
												<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 animate-pulse", selectedAgent.bg)}>
													<selectedAgent.icon className={cn("w-4 h-4", selectedAgent.color)} />
												</div>
												<div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none">
													<div className="flex gap-1">
														<div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
														<div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
														<div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
													</div>
												</div>
											</div>
										)}
									</div>
								</ScrollArea>

								{/* Input Area */}
								<div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
									<div className="relative group">
										<Input 
											placeholder={selectedAgent.id === "soap-review" ? "Cole seu SOAP aqui..." : "Digite sua pergunta..."}
											value={input}
											onChange={(e) => setInput(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
											className="h-14 pl-6 pr-16 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl focus-visible:ring-blue-500/50 focus-visible:ring-offset-0 transition-all text-sm font-medium"
										/>
										<Button 
											size="icon" 
											onClick={handleSendMessage}
											disabled={!input.trim() || isTyping}
											className="absolute right-2 top-2 h-10 w-10 bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
										>
											<Send className="w-4 h-4 text-white" />
										</Button>
									</div>
									<div className="flex items-center justify-between mt-4">
										<div className="flex gap-2">
											<Badge variant="ghost" className="text-[9px] font-black uppercase text-slate-400 tracking-widest gap-1">
												<Zap className="w-3 h-3 fill-amber-500 text-amber-500" /> GPT-4o Optimized
											</Badge>
										</div>
										<p className="text-[10px] text-slate-400 font-medium">Pressione Enter para enviar</p>
									</div>
								</div>
							</>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
