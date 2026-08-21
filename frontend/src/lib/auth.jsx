import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api, { clearTokens, getToken, setTokens } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getToken());
  const [username, setUsername] = useState(
    () => localStorage.getItem('crm_username') || ''
  );

  const login = useCallback(async (name, password) => {
    const { data } = await api.post('/crm/auth/token/', {
      username: name,
      password,
    });
    setTokens(data);
    localStorage.setItem('crm_username', name);
    setToken(data.access);
    setUsername(name);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem('crm_username');
    setToken(null);
    setUsername('');
  }, []);

  const value = useMemo(
    () => ({ token, username, login, logout, isAuthed: Boolean(token) }),
    [token, username, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export const RequireAuth = ({ children }) => {
  const { isAuthed } = useAuth();
  const location = useLocation();
  if (!isAuthed) {
    return <Navigate to="/dashboard/login" state={{ from: location }} replace />;
  }
  return children;
};
