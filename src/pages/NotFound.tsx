import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { ErrorPageLayout } from "@/components/error/ErrorPageLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    const logData = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // Log to server via logger
    logger.error(
      "404 Error: User attempted to access non-existent route",
      logData,
      "NotFound",
    );

    // Console log for easy debugging
    console.error(
      `%c[FisioFlow 404] Rota não encontrada: ${location.pathname}`,
      "color: #ef4444; font-weight: bold; font-size: 14px;",
      logData,
    );
  }, [location.pathname]);

  return (
    <ErrorPageLayout
      code="404"
      title="Página com Edema, estamos colocando gelo!"
      message="Esta página está totalmente fora de lugar! Parece que ela pegou um caminho errado no treino de marcha."
      primaryActionLabel="Voltar para a Base"
      primaryActionHref="/"
    >
      <p className="text-sm text-muted-foreground mt-4 italic">
        "Já tentou fazer compressa de gelo por 20 minutos? Geralmente ajuda, mas para links
        quebrados, melhor voltar ao início."
      </p>
      <p className="text-xs text-muted-foreground mt-2 font-mono">
        Rota: {location.pathname}
      </p>
    </ErrorPageLayout>
  );
};

export default NotFound;
