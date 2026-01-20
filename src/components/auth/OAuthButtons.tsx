/**
 * OAuth/Social Login Buttons
 *
 * Provides social login options using Supabase Auth.
 * Supports: Google, Apple, GitHub, Microsoft
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

export type SocialProvider = 'google' | 'apple' | 'github' | 'microsoft' | 'facebook';

interface SocialButtonProps {
  provider: SocialProvider;
  onClick: (provider: SocialProvider) => void;
  loading: boolean;
  loadingProvider?: SocialProvider | null;
  activeTab: 'login' | 'register';
}

interface OAuthButtonsProps {
  loading: boolean;
  loadingProvider?: SocialProvider | null;
  onProviderClick: (provider: SocialProvider) => void;
  activeTab: 'login' | 'register';
  providers?: SocialProvider[];
  showDivider?: boolean;
}

const PROVIDER_CONFIG: Record<SocialProvider, { label: string; icon: React.ReactNode }> = {
  google: {
    label: 'Google',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  apple: {
    label: 'Apple',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.95.95-4.8.32-6.23-1.56-.65-1.43-1.98-3.24-2.24-1.86-.31-3.65.32-5.12.87-.97-.31-2.14-.52-3.32-.52-1.67 0-3.28.43-4.38 1.12-1.38.95-1.95 2.48-3.3 2.48-.82 0-1.63-.25-2.4-.73-.78-.49-1.63-.73-2.53-.73-1.6 0-3.11.87-4.24 2.05-.95 1.32-1.5 3.03-1.5 4.82 0 2.3 1.5 5.58 4.5 5.58 2.47 0 4.24-1.43 5.05-2.4.54.68 1.5 1.77 2.4 3.29 2.4 1.08 0 2.13-.33 3.13-.95.47.87 1.4 2.02 1.4 3.4 0 .28-.02.56-.07.83-.05.27-.07.54-.07.82 0 1.35.45 2.62 1.22 3.56.76.93 1.78 1.45 2.88 1.45 1.08 0 2.18-.5 3.27-1.5zm-5.47-15.57c.63-1.03.96-2.38.96-3.78 0-1.12-.5-2.23-1.34-3.1-1.07-.95-2.5-1.07-3.54-.3-.74.12-1.63.42-2.54 1.08-.25.66-.14 1.87.07 2.85.21.7.64 1.48 1.05 2.39 1.05.95 0 1.89-.28 2.76-.84z" />
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  microsoft: {
    label: 'Microsoft',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <rect fill="#f3f3f3" width="11" height="11" x="1" y="1" />
        <rect fill="#ff3f3f" width="11" height="11" x="12" y="1" />
        <rect fill="#00a1f1" width="11" height="11" x="1" y="12" />
        <rect fill="#ffbf00" width="11" height="11" x="12" y="12" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
};

function SocialButton({ provider, onClick, loading, loadingProvider, activeTab }: SocialButtonProps) {
  const config = PROVIDER_CONFIG[provider];
  const isLoading = loading && loadingProvider === provider;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onClick(provider)}
      disabled={loading}
      className="w-full h-11 text-sm font-medium transition-all duration-150 active:scale-[0.98]"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <span className="mr-2">{config.icon}</span>
      )}
      {config.label}
    </Button>
  );
}

export function OAuthButtons({
  loading,
  loadingProvider,
  onProviderClick,
  activeTab,
  providers = ['google', 'apple', 'github'],
  showDivider = true,
}: OAuthButtonsProps) {
  return (
    <div className="space-y-4">
      {showDivider && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou continue com</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {providers.map((provider) => (
          <SocialButton
            key={provider}
            provider={provider}
            onClick={onProviderClick}
            loading={loading}
            loadingProvider={loadingProvider}
            activeTab={activeTab}
          />
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Ao continuar, você concorda com nossos{' '}
        <a href="/terms" className="underline underline-offset-4 hover:text-primary">
          Termos de Serviço
        </a>{' '}
        e{' '}
        <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
          Política de Privacidade
        </a>
      </p>
    </div>
  );
}
