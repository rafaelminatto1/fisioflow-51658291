import React, { ReactNode } from 'react';
import { Stethoscope } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-sky-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden" role="presentation">
            {/* Static background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-300/5 dark:bg-sky-700/5 rounded-full blur-3xl" />
            </div>

            {/* Left Side - Hero & Branding (Hidden on mobile) */}
            <header className="hidden lg:flex w-1/2 relative overflow-hidden" role="banner">
                <div className="absolute inset-0 z-0" aria-hidden="true">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/10 to-sky-400/20" />
                </div>

                {/* Overlay Content */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between p-16">
                    <div className="flex items-center gap-4 animate-fade-in">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">FisioFlow</h1>
                    </div>

                    <div className="space-y-6 max-w-xl animate-slide-up-fade delay-100">
                        <h2 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-foreground">
                            Transforme a gestão
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 mt-2">da sua clínica.</span>
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            Uma plataforma completa para fisioterapeutas que buscam eficiência,
                            organização e a melhor experiência para seus pacientes.
                        </p>
                    </div>

                    <footer className="flex justify-between items-center text-sm text-muted-foreground animate-fade-in delay-200" role="contentinfo">
                        <p>© 2026 FisioFlow Inc.</p>
                        <div className="flex gap-6">
                            <button type="button" className="hover:text-foreground transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer text-inherit">Privacidade</button>
                            <button type="button" className="hover:text-foreground transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer text-inherit">Termos</button>
                        </div>
                    </footer>
                </div>
            </header>

            {/* Right Side - Auth Form */}
            <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative" role="main" id="main-content">
                {/* Mobile Header Branding */}
                <div className="lg:hidden absolute top-8 left-0 w-full flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-foreground">FisioFlow</span>
                    </div>
                </div>

                <div className="w-full max-w-md space-y-6 animate-fade-in relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
