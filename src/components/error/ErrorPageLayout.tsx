/**
 * ErrorPageLayout - Layout compartilhado para páginas de erro (404, /error)
 * Design unificado com ícone Bandage e identidade visual FisioFlow
 */

import { Bandage, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ErrorPageLayoutProps {
  /** Título principal */
  title: string;
  /** Mensagem descritiva */
  message: string;
  /** Código ou subtítulo (ex: "404") */
  code?: string;
  /** Conteúdo adicional (ex: detalhes do erro) */
  children?: React.ReactNode;
  /** Texto do botão principal */
  primaryActionLabel?: string;
  /** URL do botão principal (default: /) */
  primaryActionHref?: string;
}

export function ErrorPageLayout({
  title,
  message,
  code,
  children,
  primaryActionLabel = 'Início',
  primaryActionHref = '/',
}: ErrorPageLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="mx-auto h-20 w-20 bg-amber-50 rounded-2xl flex items-center justify-center shadow-inner">
          <Bandage className="h-10 w-10 text-amber-600" />
        </div>
        {code && (
          <p className="text-4xl font-bold text-gray-500 tracking-tight">{code}</p>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 max-w-sm mx-auto">{message}</p>
        {children}
        <Button asChild className="gap-2">
          <Link to={primaryActionHref}>
            <Home className="h-4 w-4" />
            {primaryActionLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
