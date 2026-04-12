import { useAuthContext } from '../contexts/AuthContext';

export default function useAuth() {
  const ctx = useAuthContext();
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
