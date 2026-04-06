import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { BiomechanicsEvidencePanel } from "./BiomechanicsEvidencePanel";
import { BiomechanicsProtocolGuidePanel } from "./BiomechanicsProtocolGuidePanel";
import type { BiomechanicsEvidenceMode } from "@/data/biomechanicsEvidence";

interface BiomechanicsAnalysisLayoutProps {
	mode: BiomechanicsEvidenceMode;
	title: string;
	subtitle: string;
	icon: LucideIcon;
	iconClassName: string;
	iconBgClassName: string;
	children: ReactNode;
}

export function BiomechanicsAnalysisLayout({
	mode,
	title,
	subtitle,
	icon: Icon,
	iconClassName,
	iconBgClassName,
	children,
}: BiomechanicsAnalysisLayoutProps) {
	const navigate = useNavigate();

	return (
		<MainLayout>
			<div className="min-h-screen bg-background/50 pb-20">
				<div className="sticky top-0 z-30 border-b bg-background/95 px-6 py-4 backdrop-blur">
					<div className="mx-auto flex max-w-7xl items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => navigate("/clinical/biomechanics")}
							>
								<ArrowLeft className="h-5 w-5" />
							</Button>
							<div
								className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconBgClassName}`}
							>
								<Icon className={`h-5 w-5 ${iconClassName}`} />
							</div>
							<div>
								<h1 className="text-xl font-black uppercase tracking-tighter text-foreground">
									{title}
								</h1>
								<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
									{subtitle}
								</p>
							</div>
						</div>
						<Button variant="outline" size="sm" className="gap-2">
							<FileText className="h-4 w-4" />
							Relatório
						</Button>
					</div>
				</div>

				<div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
					<div className="min-h-[calc(100vh-140px)]">{children}</div>
					<div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
						<BiomechanicsProtocolGuidePanel mode={mode} />
						<BiomechanicsEvidencePanel mode={mode} />
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
