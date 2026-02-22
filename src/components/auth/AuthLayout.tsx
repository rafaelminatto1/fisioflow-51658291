import React, { ReactNode } from 'react';
import { Stethoscope, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden" role="presentation">
            {/* Dynamic background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute top-1/4 -left-24 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-300/10 dark:bg-sky-700/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
            </div>

            {/* Left Side - Hero & Branding (Hidden on mobile) */}
            <header className="hidden lg:flex w-[45%] xl:w-1/2 relative overflow-hidden bg-slate-900" role="banner">
                {/* Background Image/Pattern with Overlay */}
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
                    <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-blue-900/60 to-slate-950 z-[1]" />

                {/* Content */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between p-16 xl:p-24">
                    <div className="flex items-center gap-3 animate-fade-in">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-xl shadow-white/10">
                            <Stethoscope className="w-7 h-7 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">FisioFlow</h1>
                    </div>

                    <div className="space-y-8 animate-slide-up-fade">
                        <div className="space-y-4">
                            <h2 className="text-5xl xl:text-6xl font-black leading-[1.1] tracking-tight text-white">
                                Gestão clínica<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">elevada ao máximo.</span>
                            </h2>
                            <p className="text-xl text-blue-100/80 leading-relaxed max-w-lg">
                                Centralize seus atendimentos, evoluções e financeiro em uma única plataforma inteligente e intuitiva.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                'Agenda inteligente com drag-and-drop',
                                'Evoluções SOAP automatizadas com IA',
                                'Controle financeiro completo e NF-e',
                                'Portal do paciente e biofeedback'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-blue-50/90 group">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-400/30 group-hover:bg-blue-500/40 transition-colors">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
                                    </div>
                                    <span className="text-sm font-medium tracking-wide">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <footer className="flex justify-between items-center text-sm text-blue-200/50" role="contentinfo">
                        <p>© 2026 FisioFlow Inc.</p>
                        <div className="flex gap-6">
                            <button type="button" className="hover:text-white transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer text-inherit">Segurança</button>
                            <button type="button" className="hover:text-white transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer text-inherit">Termos</button>
                        </div>
                    </footer>
                </div>
            </header>

            {/* Right Side - Auth Form */}
            <main className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative" role="main" id="main-content">
                {/* Mobile Header Branding */}
                <div className="lg:hidden absolute top-12 left-0 w-full flex justify-center mb-8 px-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">FisioFlow</span>
                    </div>
                </div>

                <div className="w-full max-w-[440px] animate-scale-in relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
