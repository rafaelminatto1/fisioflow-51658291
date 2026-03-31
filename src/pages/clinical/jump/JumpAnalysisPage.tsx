import React, { Suspense, lazy } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const JumpAnalysisStudio = lazy(() =>
	import("@/components/analysis/studios/JumpAnalysisStudio").then((m) => ({
		default: m.JumpAnalysisStudio,
	})),
);

function StudioLoadingFallback() {
	return (
		<div className="flex h-full min-h-[480px] items-center justify-center rounded-3xl border border-dashed bg-card/40">
			<div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				Carregando estúdio de salto...
			</div>
		</div>
	);
}

export default function JumpAnalysisPage() {
    const navigate = useNavigate();

    return (
        <MainLayout>
            <div className="min-h-screen bg-background/50 pb-20">
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/clinical/biomechanics')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Zap className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-foreground tracking-tighter uppercase">
                                    Performance de Salto
                                </h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Bosco Test / Sayers
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                <FileText className="h-4 w-4" /> Relatório
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-140px)]">
                    <Suspense fallback={<StudioLoadingFallback />}>
                        <JumpAnalysisStudio />
                    </Suspense>
                </div>
            </div>
        </MainLayout>
    );
}
