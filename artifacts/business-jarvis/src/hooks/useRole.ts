import { useState, useCallback } from "react";

export type Role = "client" | "director" | "partner" | "staff";

const STORAGE_KEY        = "jarvis_role";
const PERSON_STORAGE_KEY = "jarvis_person_id";

function getStored(): Role | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "client" || v === "director" || v === "partner" || v === "staff") return v as Role;
    return null;
  } catch {
    return null;
  }
}

function getStoredPersonId(): number | null {
  try {
    const v = localStorage.getItem(PERSON_STORAGE_KEY);
    if (v) { const n = parseInt(v, 10); return isNaN(n) ? null : n; }
    return null;
  } catch {
    return null;
  }
}

export function useRole() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(getStored);
  const [personId,     setPersonId]     = useState<number | null>(getStoredPersonId);

  const selectRole = useCallback((role: Role, pid?: number) => {
    try { localStorage.setItem(STORAGE_KEY, role); } catch { /* ignore */ }
    setSelectedRole(role);
    if (pid != null) {
      try { localStorage.setItem(PERSON_STORAGE_KEY, String(pid)); } catch { /* ignore */ }
      setPersonId(pid);
    } else {
      try { localStorage.removeItem(PERSON_STORAGE_KEY); } catch { /* ignore */ }
      setPersonId(null);
    }
  }, []);

  const switchRole = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); }       catch { /* ignore */ }
    try { localStorage.removeItem(PERSON_STORAGE_KEY); } catch { /* ignore */ }
    setSelectedRole(null);
    setPersonId(null);
  }, []);

  return { selectedRole, personId, selectRole, switchRole };
}
