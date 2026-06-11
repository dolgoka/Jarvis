import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("jarvis_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("jarvis-light");
      root.classList.remove("jarvis-dark");
    } else {
      root.classList.add("jarvis-dark");
      root.classList.remove("jarvis-light");
    }
    try {
      localStorage.setItem("jarvis_theme", theme);
    } catch {}
  }, [theme]);

  function toggleTheme() {
    setTheme(t => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
