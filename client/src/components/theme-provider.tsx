import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken } from "@/lib/auth";

type Theme = "dark" | "light";

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "hermes-theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);

    const token = getToken();
    if (token) {
      fetch("/api/auth/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tema: newTheme }),
      }).catch(() => {});
    }
  }, [storageKey]);

  const loadFromServer = useCallback(() => {
    const token = getToken();
    if (!token) return;

    fetch("/api/auth/preferences", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((prefs) => {
        if (prefs?.tema && (prefs.tema === "dark" || prefs.tema === "light")) {
          localStorage.setItem(storageKey, prefs.tema);
          setThemeState(prefs.tema);
        }
      })
      .catch(() => {});
  }, [storageKey]);

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
