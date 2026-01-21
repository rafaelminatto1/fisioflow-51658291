
import React from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Alert, AlertDescription } from '@/components/shared/ui/alert';
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
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={onFullNameChange}
                        required
                        className="h-11"
                        tabIndex={activeTab === 'register' ? 1 : -1}
                        autoComplete="name"
                    />
                    {validationErrors.fullName && <span className="text-xs text-destructive font-medium">{validationErrors.fullName}</span>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium">Email</Label>
                    <Input
                        id="register-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={onEmailChange}
                        required
                        disabled={!!invitationData}
                        className="h-11"
                        tabIndex={activeTab === 'register' ? 2 : -1}
                        autoComplete="email"
                    />
                    {validationErrors.email && <span className="text-xs text-destructive font-medium">{validationErrors.email}</span>}
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
                            className="h-11"
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
                            className="h-11"
                            tabIndex={activeTab === 'register' ? 4 : -1}
                            autoComplete="new-password"
                        />
                    </div>
                </div>

                {/* Password Requirements */}
                {password && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-1.5">
                        {passwordRequirements.map((req, idx) => (
                            <div key={idx} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                                {req.met ? <CheckCircle className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full border border-current opacity-50" />}
                                {req.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
            )}

            <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
                disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
                tabIndex={activeTab === 'register' ? 5 : -1}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Conta Gratuita
            </Button>
        </form>
    );
}
