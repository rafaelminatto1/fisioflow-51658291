import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';

// Mapeamento de rotas para nomes amigáveis
const routeLabels: Record<string, string> = {
  '': 'Início',
  'pacientes': 'Pacientes',
  'agenda': 'Agenda',
  'evolucoes': 'Evoluções',
  'financeiro': 'Financeiro',
  'comunicacao': 'Comunicação',
  'eventos': 'Eventos',
  'cadastros': 'Cadastros',
  'contratados': 'Contratados',
  'exercicios': 'Biblioteca de Exercícios',
  'relatorios': 'Relatórios',
  'configuracoes': 'Configurações',
  'usuarios': 'Gestão de Usuários',
  'auditoria': 'Logs de Auditoria',
  'perfil': 'Perfil',
  'materiais': 'Materiais Clínicos',
  'empresas-parceiras': 'Empresas Parceiras',
  'prestadores': 'Prestadores',
  'admin': 'Administração',
  'prontuario': 'Prontuário',
  'novo': 'Novo',
  'editar': 'Editar',
  'patient-evolution': 'Evolução do Paciente',
};

interface PageBreadcrumbsProps {
  customLabels?: Record<string, string>;
  className?: string;
}

export const PageBreadcrumbs: React.FC<PageBreadcrumbsProps> = ({
  customLabels = {},
  className = '',
}) => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Não mostrar breadcrumbs na página inicial
  if (pathSegments.length === 0) {
    return null;
  }

  const getLabel = (segment: string, index: number): string => {
    // Verificar labels customizados primeiro
    const fullPath = '/' + pathSegments.slice(0, index + 1).join('/');
    if (customLabels[fullPath]) {
      return customLabels[fullPath];
    }
    
    // Usar mapeamento padrão
    if (routeLabels[segment]) {
      return routeLabels[segment];
    }
    
    // Para IDs (UUIDs), retornar "Detalhes"
    if (segment.match(/^[0-9a-f-]{36}$/i)) {
      return 'Detalhes';
    }
    
    // Capitalizar primeira letra
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
  };

  return (
    <Breadcrumb className={`mb-4 ${className}`}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to="/" 
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Início</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const path = '/' + pathSegments.slice(0, index + 1).join('/');
          const label = getLabel(segment, index);

          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium text-foreground">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      to={path}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
