import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { AuthError } from '@/lib/errors';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new AuthError('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}

export default useAuth;