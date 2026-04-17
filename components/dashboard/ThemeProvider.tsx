"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
    theme: "light",
    toggle: () => {},
});

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    // Only syncs the DOM class — no setTheme needed
    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
    }, [theme]);

    const toggle = () => {
        setTheme((prev) => {
            const next: Theme = prev === "light" ? "dark" : "light";
            localStorage.setItem("theme", next);
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);