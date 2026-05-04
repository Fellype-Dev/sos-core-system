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
    setUser((prev) => ('user' in payload ? payload.user ?? null : prev));
    if ('selectedProgramId' in payload) {
      setSelectedProgramId(payload.selectedProgramId || null);
      localStorage.setItem('selected_program_id', payload.selectedProgramId || '');
    }
    if ('availablePrograms' in payload) {
      setAvailablePrograms(payload.availablePrograms || []);
      localStorage.setItem('available_programs', JSON.stringify(payload.availablePrograms || []));
    }

    localStorage.setItem('token', authToken);
    if ('user' in payload) {
      localStorage.setItem('sos_user', JSON.stringify(payload.user ?? null));
    }
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
