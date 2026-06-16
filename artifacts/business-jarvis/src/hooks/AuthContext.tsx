import { createContext, useContext } from "react";

interface RoleContextValue {
  switchRole: () => void;
  personId: number | null;
}

export const AuthContext = createContext<RoleContextValue>({
  switchRole: () => {},
  personId:   null,
});

export function useAuthContext() {
  return useContext(AuthContext);
}
