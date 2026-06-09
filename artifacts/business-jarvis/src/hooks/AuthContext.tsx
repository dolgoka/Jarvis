import { createContext, useContext } from "react";

interface RoleContextValue {
  switchRole: () => void;
}

export const AuthContext = createContext<RoleContextValue>({ switchRole: () => {} });

export function useAuthContext() {
  return useContext(AuthContext);
}
