import React, { useEffect } from "react";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Trophy, Star, ChevronRight, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface LevelUpModalProps {
	isOpen: boolean;
	onClose: () => void;
	level: number;
	unlockedFeatures?: string[];
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
	isOpen,
	onClose,
	level,
	unlockedFeatures = [],
}) => {
	const isMobile = useIsMobile();

	useEffect(() => {
		if (isOpen) {
			const duration = 3 * 1000;
			const animationEnd = Date.now() + duration;
			const defaults = {
				startVelocity: 30,
				spread: 360,
				ticks: 60,
				zIndex: 1000,
			};

			const randomInRange = (min: number, max: number) =>
				Math.random() * (max - min) + min;

			const interval: any = setInterval(function () {
				const timeLeft = animationEnd - Date.now();

				if (timeLeft <= 0) {
					return clearInterval(interval);
				}

				const particleCount = 50 * (timeLeft / duration);
				confetti({
					...defaults,
					particleCount,
					origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
				});
				confetti({
					...defaults,
					particleCount,
					origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
				});
			}, 250);

			return () => clearInterval(interval);
		}
	}, [isOpen]);

	return (
		<CustomModal
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			isMobile={isMobile}
			contentClassName="sm:max-w-md border-none bg-gradient-to-b from-primary/20 to-background shadow-2xl overflow-hidden rounded-[2rem]"
		>
			<CustomModalHeader
				className="border-none bg-transparent"
				onClose={onClose}
			>
				<div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0 flex flex-col items-center">
				<div className="px-8 pt-2 pb-8 w-full text-center">
					<motion.div
						initial={{ scale: 0, rotate: -180 }}
						animate={{ scale: 1, rotate: 0 }}
						transition={{ type: "spring", stiffness: 260, damping: 20 }}
						className="w-32 h-32 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)] border-4 border-background relative"
					>
						<Trophy className="h-16 w-16 text-primary-foreground" />
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
							className="absolute -inset-2 border-2 border-dashed border-primary/30 rounded-full"
						/>
					</motion.div>

					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-4xl font-black tracking-tighter text-foreground mb-1 uppercase italic"
					>
						Novo Nível!
					</motion.h2>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="text-xl font-bold text-primary flex items-center justify-center gap-2"
					>
						<Sparkles className="h-5 w-5" />
						Você alcançou o Nível {level}
						<Sparkles className="h-5 w-5" />
					</motion.p>

					<div className="mt-8 space-y-6">
						<div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-left relative overflow-hidden">
							<div className="absolute -right-4 -top-4 opacity-5">
								<Trophy className="w-24 h-24" />
							</div>

							<h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
								<Star className="h-3 w-3 text-primary fill-primary" />
								Recompensas Desbloqueadas
							</h4>
							<div className="space-y-4">
								{unlockedFeatures.length > 0 ? (
									unlockedFeatures.map((feature, i) => (
										<motion.div
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.3 + i * 0.1 }}
											key={i}
											className="flex items-center gap-3 text-sm font-bold text-slate-700"
										>
											<div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
											{feature}
										</motion.div>
									))
								) : (
									<>
										<motion.div
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.3 }}
											className="flex items-center gap-3 text-sm font-bold text-slate-700"
										>
											<div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
											Bônus de +500 Pontos na Loja
										</motion.div>
										<motion.div
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{ delay: 0.4 }}
											className="flex items-center gap-3 text-sm font-bold text-slate-700"
										>
											<div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
											Nova Insígnia de Veterano
										</motion.div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</CustomModalBody>

			<CustomModalFooter
				isMobile={isMobile}
				className="bg-transparent border-none pb-8 px-8"
			>
				<Button
					onClick={onClose}
					className="w-full h-14 rounded-[1.25rem] font-black text-lg bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_rgba(var(--primary),0.5)] uppercase tracking-tight"
				>
					Continuar Jornada
					<ChevronRight className="ml-2 h-6 w-6" />
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
};
