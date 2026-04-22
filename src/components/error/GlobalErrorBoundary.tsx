/**
 * Global Error Boundary
 *
 * Catches all unhandled errors in the application
 * Integrates with Sentry for error tracking
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

type WindowWithOptionalSentry = Window & {
	Sentry?: {
		captureException: (error: Error, context?: Record<string, unknown>) => void;
	};
};

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log to console in development
		if (import.meta.env.DEV) {
			console.error("Error caught by boundary:", error);
			console.error("Error info:", errorInfo);
		}

		// Send to Sentry
		if (typeof window !== "undefined") {
			(window as WindowWithOptionalSentry).Sentry?.captureException(error, {
				contexts: {
					react: {
						componentStack: errorInfo.componentStack,
					},
				},
			});
		}

		// Call custom error handler
		this.props.onError?.(error, errorInfo);

		// Update state
		this.setState({
			errorInfo,
		});
	}

	handleReset = (): void => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	handleGoHome = (): void => {
		window.location.href = "/";
	};

	render(): ReactNode {
		if (this.state.hasError) {
			// Custom fallback
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI - Premium Immersive Design
			return (
				<div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-6">
					<div className="absolute inset-0 overflow-hidden pointer-events-none">
						<div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-destructive/10 rounded-full blur-[120px] animate-pulse" />
						<div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
					</div>

					<div className="w-full max-w-3xl relative z-10">
						<div className="p-1 rounded-[3rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl overflow-hidden">
							<div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.85rem] p-8 md:p-16 border border-white/5 flex flex-col items-center text-center">
								<div className="mb-10 relative">
									<div className="absolute inset-0 bg-destructive/30 rounded-full blur-2xl animate-pulse" />
									<div className="relative h-24 w-24 rounded-[2rem] bg-gradient-to-br from-destructive/40 to-destructive/10 flex items-center justify-center border border-destructive/30 shadow-inner rotate-3">
										<AlertCircle className="h-12 w-12 text-white" />
									</div>
								</div>

								<h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-none">
									Instabilidade no <span className="text-destructive">Sistema</span>
								</h1>

								<p className="text-slate-400 text-lg md:text-xl max-w-lg mx-auto mb-12 leading-relaxed">
									Ops! Encontramos um erro inesperado. Nossa equipe de engenharia já foi 
									notificada e está trabalhando para restaurar a normalidade.
								</p>

								<div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md">
									<Button 
										onClick={this.handleReset} 
										size="lg"
										className="h-16 px-10 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black text-lg gap-3 shadow-xl transition-all active:scale-95 w-full sm:w-auto group"
									>
										<RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
										Tentar Novamente
									</Button>
									<Button 
										onClick={this.handleGoHome} 
										variant="outline"
										size="lg"
										className="h-16 px-10 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black text-lg gap-3 transition-all active:scale-95 w-full sm:w-auto"
									>
										<Home className="w-5 h-5" />
										Ir para Início
									</Button>
								</div>

								{/* Error details (dev only) */}
								{import.meta.env.DEV && this.state.error && (
									<div className="mt-12 w-full text-left">
										<details className="group border border-white/5 rounded-2xl bg-black/40 overflow-hidden transition-all duration-300">
											<summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors list-none">
												<div className="flex items-center gap-4">
													<div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
													<span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-300 transition-colors">
														Debugger: Stack Trace & Engine Data
													</span>
												</div>
												<span className="text-xs font-black text-slate-700 group-open:rotate-180 transition-transform">
													↓
												</span>
											</summary>
											<div className="p-6 pt-0">
												<div className="bg-black/60 rounded-xl p-5 overflow-x-auto shadow-inner border border-white/5">
													<code className="text-xs text-rose-400 font-mono block whitespace-pre-wrap leading-relaxed">
														{this.state.error.toString()}
														{"\n\n"}
														{this.state.errorInfo?.componentStack}
													</code>
												</div>
											</div>
										</details>
									</div>
								)}

								<div className="mt-16 pt-8 border-t border-white/5 w-full max-w-sm flex flex-col items-center gap-3">
									<p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
										Suporte Técnico Prioritário
									</p>
									<a
										href="mailto:suporte@fisioflow.com"
										className="text-slate-400 hover:text-white font-bold transition-colors"
									>
										suporte@fisioflow.com
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	fallback?: ReactNode,
): React.ComponentType<P> {
	return function WithErrorBoundaryWrapper(props: P) {
		return (
			<GlobalErrorBoundary fallback={fallback}>
				<Component {...props} />
			</GlobalErrorBoundary>
		);
	};
}
