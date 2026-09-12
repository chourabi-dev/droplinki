import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Driver } from "@/types";
import { loadJSON, saveJSON, STORAGE_KEYS } from "@/lib/storage";

const DEFAULT_DRIVER: Driver = {
  name: "Karim Bouazizi",
  phone: "21620123456",
  email: "karim@droplink.app",
  plan: "free",
};

interface AuthContextValue {
  isAuthenticated: boolean;
  driver: Driver;
  login: (email: string, password: string) => void;
  signup: (driver: Omit<Driver, "plan">) => void;
  logout: () => void;
  upgradeToPro: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    loadJSON<boolean>(STORAGE_KEYS.auth, false)
  );
  const [driver, setDriver] = useState<Driver>(() => loadJSON<Driver>(STORAGE_KEYS.driver, DEFAULT_DRIVER));

  useEffect(() => saveJSON(STORAGE_KEYS.auth, isAuthenticated), [isAuthenticated]);
  useEffect(() => saveJSON(STORAGE_KEYS.driver, driver), [driver]);

  const login = useCallback((email: string, _password: string) => {
    setDriver((prev) => ({ ...prev, email: email || prev.email }));
    setIsAuthenticated(true);
  }, []);

  const signup = useCallback((newDriver: Omit<Driver, "plan">) => {
    setDriver({ ...newDriver, plan: "free" });
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => setIsAuthenticated(false), []);

  const upgradeToPro = useCallback(() => setDriver((prev) => ({ ...prev, plan: "pro" })), []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, driver, login, signup, logout, upgradeToPro }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
