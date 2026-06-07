import { useState, useCallback } from "react";

const STORAGE_KEY = "jarvis_auth";
const DEMO_CODE = "1234";

function getStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getStored);

  const login = useCallback((code: string): boolean => {
    if (code === DEMO_CODE) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
