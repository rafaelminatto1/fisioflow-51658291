import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ElementType;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
  separator?: React.ReactNode;
}

/**
 * Breadcrumbs component for navigation hierarchy
 * Automatically generates breadcrumbs from current route if items not provided
 */
export function Breadcrumbs({
  items,
  homeLabel = 'Início',
  className,
  separator = <ChevronRight className="h-4 w-4" />,
}: BreadcrumbsProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from route if not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname, location);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-1 text-sm', className)}>
      <ol className="flex items-center space-x-1">
        {/* Home/First item */}
        {breadcrumbItems.length > 0 && (
          <li className="flex items-center">
            <Link
              to="/"
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">{homeLabel}</span>
            </Link>
          </li>
        )}

        {/* Breadcrumb items */}
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center">
              <span className="text-muted-foreground/50 mx-1">{separator}</span>
              {isLast ? (
                <span className="flex items-center font-medium text-foreground" aria-current="page">
                  {Icon && <Icon className="h-4 w-4 mr-1" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path || '#'}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4 mr-1" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumbs from the current route path
 */
function generateBreadcrumbsFromPath(pathname: string, _location: Location): BreadcrumbItem[] {
  // Remove leading/trailing slashes and split
  const pathSegments = pathname.split('/').filter(Boolean);

  // Route-specific breadcrumb mappings
  const routeLabels: Record<string, string> = {
    agenda: 'Agenda',
    pacientes: 'Pacientes',
    financeiro: 'Financeiro',
    eventos: 'Eventos',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações',
    configuracoes: 'Configurações',
    admin: 'Administração',
    telemedicina: 'Telemedicina',
    evolucao: 'Evolução',
    'novo-paciente': 'Novo Paciente',
    editar: 'Editar',
    dashboard: 'Dashboard',
    gamification: 'Gamificação',
    perfil: 'Perfil',
  };

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    // Skip the ID segments for cleaner breadcrumbs
    if (isUUID(segment)) {
      return;
    }

    // Get label from mapping or format the segment
    const label = routeLabels[segment] || formatBreadcrumbLabel(segment);

    // Special handling for dynamic routes
    if (segment === 'pacientes' && pathSegments[index + 1]) {
      items.push({
        label: 'Pacientes',
        path: '/pacientes',
      });
    } else if (segment === 'nova-evolucao') {
      items.push({
        label: 'Nova Evolução',
      });
    } else if (!isLast || items.length === 0) {
      items.push({
        label,
        path: currentPath,
      });
    }

    // Add the last item if not already added
    if (isLast && items[items.length - 1]?.label !== label) {
      items.push({
        label,
      });
    }
  });

  return items;
}

/**
 * Format a URL segment into a readable label
 */
function formatBreadcrumbLabel(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a string looks like a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) || str.length >= 20; // Also treat long strings as IDs
}

export default Breadcrumbs;
