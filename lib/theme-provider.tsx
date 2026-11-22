"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode } from "react";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Initialize on client - useLayoutEffect runs before paint but after DOM mutations
  // This is a valid pattern for client-side initialization to avoid hydration mismatches
  useLayoutEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    if (stored) {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  // Resolve theme and apply to document root
  useLayoutEffect(() => {
    if (!mounted) return;

    let resolved: "light" | "dark";
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}