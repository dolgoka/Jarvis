import { createContext, useContext } from "react";

interface AuthContextValue {
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({ logout: () => {} });

export function useAuthContext() {
  return useContext(AuthContext);
}
