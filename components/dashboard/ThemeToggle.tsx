"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
    const { theme, toggle } = useTheme();
    return (
        <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors hover:bg-muted"
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}
