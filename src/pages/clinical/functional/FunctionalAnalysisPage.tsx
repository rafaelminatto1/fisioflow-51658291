import React from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { FunctionalAnalysisStudio } from "@/components/analysis/studios/FunctionalAnalysisStudio";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Move } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FunctionalAnalysisPage() {
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
                            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <Move className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-foreground tracking-tighter uppercase">
                                    Gesto Funcional
                                </h1>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Kinovea Free
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
                    <FunctionalAnalysisStudio />
                </div>
            </div>
        </MainLayout>
    );
}
