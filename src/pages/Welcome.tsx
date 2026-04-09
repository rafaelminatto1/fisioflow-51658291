import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Heart,
	Activity,
	Brain,
	Users,
	Calendar,
	BarChart3,
	ArrowRight,
	Star,
	Shield,
	Zap,
} from "lucide-react";

export default function Welcome() {
	const navigate = useNavigate();

	const features = [
		{
			icon: <Brain className="h-8 w-8 text-indigo-500" />,
			title: "Inteligência Clínica 2026",
			description:
				"Busca semântica bilíngue e diagnósticos assistidos por IA treinada em 1M+ casos clínicos.",
			status: "Advanced",
		},
		{
			icon: <Zap className="h-8 w-8 text-amber-500" />,
			title: "Performance Instantânea",
			description:
				"Infraestrutura Edge com D1 e Cloudflare Workers. Latência zero e prefetching preditivo.",
			status: "Pro",
		},
		{
			icon: <Calendar className="h-8 w-8 text-emerald-500" />,
			title: "Agenda PWA Offline",
			description:
				"Gerencie sua clínica de qualquer lugar, mesmo sem internet. Sincronização automática.",
			status: "Novo",
		},
	];

	return (
		<div className="min-h-screen bg-[#F8FAFC] selection:bg-primary/20">
			{/* Modern Premium Header */}
			<header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-white/70 border-b border-gray-100/50">
				<div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
					<div className="flex items-center gap-2 group cursor-pointer">
						<div className="bg-primary p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
							<Activity className="h-6 w-6 text-white" />
						</div>
						<span className="text-2xl font-black tracking-tighter text-slate-900">
							FISIO<span className="text-primary italic">FLOW</span>
						</span>
					</div>
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							onClick={() => navigate("/auth/login")}
							className="text-slate-600 font-medium hover:bg-slate-100"
						>
							Login
						</Button>
						<Button
							onClick={() => navigate("/auth/register")}
							className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6"
						>
							Experimentar Grátis
						</Button>
					</div>
				</div>
			</header>

			{/* Hero Section with Mesh Gradient */}
			<section className="relative pt-32 pb-20 overflow-hidden">
				{/* Background Mesh Gradient Blobs */}
				<div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-blue-200/30 blur-[120px] rounded-full" />
				<div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[600px] h-[600px] bg-purple-200/20 blur-[100px] rounded-full" />

				<div className="max-w-7xl mx-auto px-4 relative">
					<div className="flex flex-col lg:flex-row items-center gap-16">
						<div className="flex-1 text-center lg:text-left">
							<Badge className="mb-6 bg-white border border-slate-100 text-primary py-1 px-4 rounded-full shadow-sm">
								✨ Versão 2026 - Agora com Clinical AI
							</Badge>
							<h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1]">
								A Evolução da <span className="text-primary">Gestão Clínica</span> para Fisioterapia.
							</h1>
							<p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed">
								O FisioFlow combina a robustez da infraestrutura Edge da Cloudflare com a 
								Inteligência Clínica mais avançada do mercado. Projetado para quem busca 
								exatidão diagnóstica e eficiência operacional 10x maior.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
								<Button
									onClick={() => navigate("/auth/register")}
									size="lg"
									className="bg-primary hover:bg-primary/90 text-white h-14 px-10 rounded-2xl text-lg font-semibold shadow-xl shadow-primary/20"
								>
									Começar Agora
									<Zap className="ml-2 h-5 w-5 fill-current" />
								</Button>
								<div className="flex items-center gap-3 px-4">
									<div className="flex -space-x-2">
										{[1, 2, 3].map((i) => (
											<div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200" />
										))}
									</div>
									<p className="text-sm font-medium text-slate-500">
										<span className="text-slate-900">+2.500</span> fisios ativos
									</p>
								</div>
							</div>
						</div>

						{/* Mockup Display */}
						<div className="flex-1 relative group w-full max-w-2xl mx-auto">
							<div className="absolute -inset-4 bg-gradient-to-tr from-primary to-purple-400 rounded-3xl opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500" />
							<div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-2">
								<img
									src="/home/rafael/.gemini/antigravity/brain/50b79b29-6721-4127-b1c7-28d0c25370b2/fisioflow_2026_mockup_1775758529989.png"
									alt="FisioFlow 2026 Interface"
									className="w-full h-auto rounded-xl"
								/>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature Cards Grid */}
			<section className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{features.map((feature, i) => (
							<Card key={i} className="border-none shadow-none bg-slate-50/50 p-8 rounded-3xl hover:bg-white hover:shadow-xl transition-all duration-300 group">
								<div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
									{feature.icon}
								</div>
								<Badge className="mb-4 bg-slate-200 text-slate-700 hover:bg-slate-200 border-none">
									{feature.status}
								</Badge>
								<h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
								<p className="text-slate-600 leading-relaxed">
									{feature.description}
								</p>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Trusted By / Stats Section */}
			<section className="py-16 border-t border-slate-100">
				<div className="max-w-7xl mx-auto px-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-12">
						Infraestrutura de Elite para Clínicas de Sucesso
					</p>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 grayscale opacity-60">
						<div className="flex items-center justify-center gap-2">
							<Shield className="h-6 w-6" /> <span className="font-bold">Neon Auth</span>
						</div>
						<div className="flex items-center justify-center gap-2">
							<Activity className="h-6 w-6" /> <span className="font-bold">Workers Edge</span>
						</div>
						<div className="flex items-center justify-center gap-2">
							< Zap className="h-6 w-6" /> <span className="font-bold">Neon Database</span>
						</div>
						<div className="flex items-center justify-center gap-2">
							<Brain className="h-6 w-6" /> <span className="font-bold">Cloudflare AI</span>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-slate-950 text-white py-20 mt-20">
				<div className="max-w-7xl mx-auto px-4">
					<div className="flex flex-col md:flex-row justify-between items-center gap-10">
						<div>
							<div className="flex items-center gap-2 mb-4">
								<Activity className="h-6 w-6 text-primary" />
								<span className="text-xl font-black tracking-tighter">
									FISIO<span className="text-primary italic">FLOW</span>
								</span>
							</div>
							<p className="text-slate-400 max-w-xs">
								A plataforma que está redefinindo o futuro da fisioterapia baseada em evidências.
							</p>
						</div>
						<div className="text-center md:text-right">
							<p className="text-slate-500 text-sm mb-2">© 2026 FisioFlow Corporation</p>
							<div className="flex gap-4">
								<span className="text-slate-400 hover:text-white cursor-pointer px-1">Privacidade</span>
								<span className="text-slate-400 hover:text-white cursor-pointer px-1">Termos</span>
								<span className="text-slate-400 hover:text-white cursor-pointer px-1">Segurança</span>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
