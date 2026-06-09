import { useState, useCallback } from "react";

export type Role = "client" | "director" | "partner" | "staff";

const STORAGE_KEY = "jarvis_role";

function getStored(): Role | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "client" || v === "director" || v === "partner" || v === "staff") return v as Role;
    return null;
  } catch {
    return null;
  }
}

export function useRole() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(getStored);

  const selectRole = useCallback((role: Role) => {
    try { localStorage.setItem(STORAGE_KEY, role); } catch { /* ignore */ }
    setSelectedRole(role);
  }, []);

  const switchRole = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setSelectedRole(null);
  }, []);

  return { selectedRole, selectRole, switchRole };
}
