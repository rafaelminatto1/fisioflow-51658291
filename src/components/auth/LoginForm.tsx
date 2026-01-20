
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
    onSubmit: (e: React.FormEvent) => void;
    email: string;
    onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    password: string;
    onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    loading: boolean;
    error: string;
    activeTab: 'login' | 'register';
}

export function LoginForm({
    onSubmit,
    email,
    onEmailChange,
    password,
    onPasswordChange,
    loading,
    error,
    activeTab
}: LoginFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        value={email}
                        onChange={onEmailChange}
                        className="h-11"
                        required
                        tabIndex={activeTab === 'login' ? 1 : -1}
                        autoComplete="email"
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                        <a
                            href="#"
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                            tabIndex={activeTab === 'login' ? 5 : -1}
                        >
                            Esqueceu a senha?
                        </a>
                    </div>
                    <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={onPasswordChange}
                        className="h-11"
                        required
                        tabIndex={activeTab === 'login' ? 2 : -1}
                        autoComplete="current-password"
                    />
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="animate-slide-up-fade">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
            )}

            <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
                disabled={loading}
                tabIndex={activeTab === 'login' ? 3 : -1}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar na Plataforma
            </Button>
        </form>
    );
}
