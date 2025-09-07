import { useGlobalNotifications } from './useGlobalNotifications';

// Hook para usar as notificações do sistema
export const useSystemNotifications = () => {
  const notifications = useGlobalNotifications();
  
  return {
    ...notifications,
    // Autenticação
    loginSuccess: (userName?: string) => {
      return notifications.showSuccess(
        'Login realizado com sucesso',
        userName ? `Bem-vindo, ${userName}!` : 'Bem-vindo de volta!'
      );
    },
    
    logoutSuccess: () => {
      return notifications.showSuccess('Logout realizado com sucesso', 'Até logo!');
    },
    
    sessionExpired: () => {
      return notifications.showWarning(
        'Sessão expirada',
        'Faça login novamente para continuar',
        {
          action: {
            label: 'Fazer Login',
            onClick: () => window.location.href = '/auth/login'
          }
        }
      );
    },
    
    // Operações CRUD
    createSuccess: (entity: string) => {
      return notifications.showSuccess(`${entity} criado com sucesso`);
    },
    
    updateSuccess: (entity: string) => {
      return notifications.showSuccess(`${entity} atualizado com sucesso`);
    },
    
    deleteSuccess: (entity: string) => {
      return notifications.showSuccess(`${entity} excluído com sucesso`);
    },
    
    // Erros comuns
    networkError: () => {
      return notifications.showError(
        'Erro de conexão',
        'Verifique sua conexão com a internet e tente novamente',
        {
          action: {
            label: 'Tentar Novamente',
            onClick: () => window.location.reload()
          }
        }
      );
    },
    
    serverError: () => {
      return notifications.showError(
        'Erro interno do servidor',
        'Tente novamente em alguns instantes',
        {
          action: {
            label: 'Recarregar',
            onClick: () => window.location.reload()
          }
        }
      );
    },
    
    validationError: (message: string) => {
      return notifications.showError('Erro de validação', message);
    },
    
    permissionDenied: () => {
      return notifications.showError(
        'Acesso negado',
        'Você não tem permissão para realizar esta ação'
      );
    },
    
    // Upload de arquivos
    uploadSuccess: (fileName: string) => {
      return notifications.showSuccess('Upload concluído', `Arquivo "${fileName}" enviado com sucesso`);
    },
    
    uploadError: (fileName: string, reason?: string) => {
      return notifications.showError(
        'Falha no upload',
        reason || `Não foi possível enviar o arquivo "${fileName}"`
      );
    },
    
    // Operações em lote
    batchOperationSuccess: (count: number, operation: string) => {
      return notifications.showSuccess(
        'Operação concluída',
        `${count} ${operation}${count > 1 ? 's' : ''} processado${count > 1 ? 's' : ''} com sucesso`
      );
    },
    
    batchOperationPartial: (success: number, failed: number, operation: string) => {
      return notifications.showWarning(
        'Operação parcialmente concluída',
        `${success} ${operation}${success > 1 ? 's' : ''} processado${success > 1 ? 's' : ''}, ${failed} falharam`
      );
    },
    
    // Sincronização
    syncSuccess: () => {
      return notifications.showSuccess('Sincronização concluída', 'Dados atualizados com sucesso');
    },
    
    syncError: () => {
      return notifications.showError(
        'Falha na sincronização',
        'Não foi possível sincronizar os dados',
        {
          action: {
            label: 'Tentar Novamente',
            onClick: () => {
              // Implementar lógica de retry
              console.log('Retry sync');
            }
          }
        }
      );
    },
    
    // Backup
    backupSuccess: () => {
      return notifications.showSuccess('Backup criado', 'Seus dados foram salvos com segurança');
    },
    
    backupRestored: () => {
      return notifications.showSuccess('Backup restaurado', 'Dados restaurados com sucesso');
    }
  };
};