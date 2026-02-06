import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { ErrorPageLayout } from '@/components/error/ErrorPageLayout';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error('404 Error: User attempted to access non-existent route', { pathname: location.pathname }, 'NotFound');
  }, [location.pathname]);

  return (
    <ErrorPageLayout
      code="404"
      title="Página não encontrada"
      message="A página que você está procurando não existe ou foi movida."
      primaryActionLabel="Ir para Início"
      primaryActionHref="/"
    />
  );
};

export default NotFound;
