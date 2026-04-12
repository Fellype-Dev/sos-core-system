import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('sos_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [selectedProgramId, setSelectedProgramId] = useState(
    localStorage.getItem('selected_program_id') || null
  );
  const [availablePrograms, setAvailablePrograms] = useState(() => {
    const raw = localStorage.getItem('available_programs');
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      setSelectedProgramId(null);
      setAvailablePrograms([]);
      localStorage.removeItem('token');
      localStorage.removeItem('sos_user');
      localStorage.removeItem('selected_program_id');
      localStorage.removeItem('available_programs');
      return;
    }

    localStorage.setItem('token', token);
  }, [token]);

  const login = (payload) => {
    const authToken = payload?.token;
    if (!authToken) return;

    setToken(authToken);
    setUser(payload.user || null);
    setSelectedProgramId(payload.selectedProgramId || null);
    setAvailablePrograms(payload.availablePrograms || []);

    localStorage.setItem('token', authToken);
    localStorage.setItem('sos_user', JSON.stringify(payload.user || null));
    localStorage.setItem('selected_program_id', payload.selectedProgramId || '');
    localStorage.setItem('available_programs', JSON.stringify(payload.availablePrograms || []));
  };

  const logout = () => {
    setToken(null);
    api.defaults.headers.common.Authorization = '';
  };

  const selectProgram = (programId) => {
    setSelectedProgramId(programId || null);
    localStorage.setItem('selected_program_id', programId || '');
  };

  const value = useMemo(
    () => ({
      token,
      user,
      selectedProgramId,
      availablePrograms,
      isAuthenticated: Boolean(token),
      login,
      logout,
      selectProgram,
    }),
    [token, user, selectedProgramId, availablePrograms]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);
