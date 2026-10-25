import { createContext, useState, useCallback, type ReactNode } from "react";
import api from "../api/axiosInstance";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void; // ← 추가
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!sessionStorage.getItem("accessToken")
  );
  const setAccessToken = useCallback((token: string) => {
    sessionStorage.setItem("accessToken", token);
    setIsAuthenticated(true);
  }, []);
  const login = useCallback(async (username: string, password: string) => {
    // 백엔드 LoginFilter는 /login POST, JSON body
    const { data } = await api.post("/login", { username, password });
    sessionStorage.setItem("accessToken", data.accessToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/v2/jwt/logout"); // 서버 refresh 토큰 삭제
    } finally {
      sessionStorage.removeItem("accessToken");
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};