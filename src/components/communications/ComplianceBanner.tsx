import { useQuery } from "@tanstack/react-query";
import { fisioFetch } from "@/lib/fetch";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ComplianceBanner() {
	const { user } = useAuth();
	const isAdmin = user?.role === "admin" || user?.role === "owner";

	// Se for admin, não precisa do banner de pendência pessoal
	if (isAdmin) return null;

	const { data: policies = [] } = useQuery<any[]>({
		queryKey: ["announcements", "policy", "pending"],
		queryFn: async () => {
			const res = await fisioFetch("/api/announcements?type=policy");
			return res.data || [];
		},
		// Atualiza a cada 5 minutos ou ao focar na aba
		staleTime: 1000 * 60 * 5,
	});

	const pendingPolicies = policies.filter((p) => p.is_mandatory && !p.is_read);

	return (
		<AnimatePresence>
			{pendingPolicies.length > 0 && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					className="bg-amber-500 text-white overflow-hidden shadow-lg border-b border-amber-600 relative z-50"
				>
					<div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="bg-white/20 p-2 rounded-full">
								<AlertCircle className="w-5 h-5 animate-pulse" />
							</div>
							<div>
								<p className="font-bold text-sm sm:text-base">
									Atenção: Você possui {pendingPolicies.length} política
									{pendingPolicies.length > 1 ? "s" : ""} corporativa
									{pendingPolicies.length > 1 ? "s" : ""} pendente
									{pendingPolicies.length > 1 ? "s" : ""} de leitura!
								</p>
								<p className="text-xs text-amber-50/90 hidden sm:block">
									É obrigatório ler e confirmar o recebimento dessas diretrizes
									para manter sua conformidade na clínica.
								</p>
							</div>
						</div>

						<Link to="/communications?tab=policies">
							<Button
								size="sm"
								variant="secondary"
								className="font-bold gap-2 whitespace-nowrap bg-white text-amber-600 hover:bg-amber-50 border-none shadow-sm"
							>
								Ler Agora <ArrowRight className="w-4 h-4" />
							</Button>
						</Link>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
