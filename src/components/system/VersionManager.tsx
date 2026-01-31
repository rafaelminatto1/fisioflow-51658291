import { useEffect } from 'react';
import { appointmentsCacheService } from '@/lib/offline/AppointmentsCacheService';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Componente que gerencia a versão da aplicação e limpa caches antigos
 * quando uma nova versão é detectada.
 * 
 * Este componente deve ser montado no topo da árvore da aplicação.
 */
export const VersionManager = () => {
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const storedVersion = localStorage.getItem('app_deployment_version');
                const currentVersion = __APP_VERSION__;

                // Se não houver versão armazenada ou for diferente da atual
                if (storedVersion !== currentVersion) {
                    logger.info(`Nova versão detectada: ${currentVersion} (anterior: ${storedVersion})`, {}, 'VersionManager');

                    // Limpar caches específicos
                    await appointmentsCacheService.clearCache();

                    // O React Query Persister lidará com seu próprio cache via 'buster' prop

                    // Atualizar versão armazenada
                    localStorage.setItem('app_deployment_version', currentVersion);

                    // Opcional: Notificar usuário ou forçar reload se necessário
                    // Como o Vite PWA já faz autoUpdate, o reload vai acontecer naturalmente ou já aconteceu
                }
            } catch (error) {
                logger.error('Erro ao verificar versão da aplicação', error, 'VersionManager');
            }
        };

        checkVersion();
    }, []);

    return null;
};
