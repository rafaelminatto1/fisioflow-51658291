import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface RegisterFormProps {
    onSubmit: (e: React.FormEvent) => void;
    fullName: string;
    onFullNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    email: string;
    onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    password: string;
    onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    confirmPassword: string;
    onConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    loading: boolean;
    error: string;
    validationErrors: Record<string, string>;
    invitationData: { email: string; role: string } | null;
    passwordRequirements: { label: string; met: boolean }[];
    activeTab: 'login' | 'register';
}

export function RegisterForm({
    onSubmit,
    fullName,
    onFullNameChange,
    email,
    onEmailChange,
    password,
    onPasswordChange,
    confirmPassword,
    onConfirmPasswordChange,
    loading,
    error,
    validationErrors,
    invitationData,
    passwordRequirements,
    activeTab
}: RegisterFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {invitationData && (
                <Alert className="bg-primary/5 border-primary/20 text-primary">
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                        Convite aceito: <strong>{invitationData.role}</strong>
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-medium">Nome Completo</Label>
                    <Input
                        id="register-name"
                        type="text"
                        placeholder="Ex: Dr. João Silva"
                        value={fullName}
                        onChange={onFullNameChange}
                        required
                        className="h-12 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-primary/20 transition-all duration-200"
                        tabIndex={activeTab === 'register' ? 1 : -1}
                        autoComplete="name"
                    />
                    {validationErrors.fullName && <span className="text-[11px] text-destructive font-semibold ml-1">{validationErrors.fullName}</span>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium">Email Profissional</Label>
                    <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={onEmailChange}
                        required
                        disabled={!!invitationData}
                        className="h-12 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-primary/20 transition-all duration-200"
                        tabIndex={activeTab === 'register' ? 2 : -1}
                        autoComplete="email"
                    />
                    {validationErrors.email && <span className="text-[11px] text-destructive font-semibold ml-1">{validationErrors.email}</span>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-sm font-medium">Senha</Label>
                        <Input
                            id="register-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={onPasswordChange}
                            required
                            className="h-12 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-primary/20 transition-all duration-200"
                            tabIndex={activeTab === 'register' ? 3 : -1}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="register-confirm-password" className="text-sm font-medium">Confirmar</Label>
                        <Input
                            id="register-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={onConfirmPasswordChange}
                            required
                            className="h-12 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-primary/20 transition-all duration-200"
                            tabIndex={activeTab === 'register' ? 4 : -1}
                            autoComplete="new-password"
                        />
                    </div>
                </div>

                {/* Password Requirements */}
                {password && (
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-1.5">
                        {passwordRequirements.map((req, idx) => (
                            <div key={idx} className={`flex items-center gap-2 text-[11px] ${req.met ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground font-medium'}`}>
                                {req.met ? <CheckCircle className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-current opacity-30" />}
                                {req.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30">
                    <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
            )}

            <Button
                type="submit"
                className="w-full h-12 text-sm font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-lg shadow-primary/25 transition-all duration-200 active:scale-[0.98] rounded-xl mt-2"
                disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
                tabIndex={activeTab === 'register' ? 5 : -1}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Começar Agora Gratuitamente
            </Button>
        </form>
    );
}
