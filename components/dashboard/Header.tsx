"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";

export function Header({ userName }: { userName: string }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur border-b border-border">
                {/* Left: Menu button */}
                <button
                    aria-label="Abrir menú"
                    onClick={() => setMenuOpen(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                >
                    <span className="flex flex-col gap-1.5">
                        <span className="block w-5 h-0.5 bg-foreground rounded" />
                        <span className="block w-5 h-0.5 bg-foreground rounded" />
                        <span className="block w-5 h-0.5 bg-foreground rounded" />
                    </span>
                </button>

                {/* Center: App name */}
                <span className="text-base font-semibold tracking-tight">Fawredd Gym</span>

                {/* Right: Theme toggle */}
                <ThemeToggle />
            </header>

            {/* Slide-over menu */}
            {menuOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="relative flex flex-col w-72 max-w-full bg-card shadow-xl p-6 gap-4">
                        <div className="flex items-center justify-between mb-4">
                            <span className="font-bold text-lg">Menú</span>
                            <button
                                aria-label="Cerrar menú"
                                onClick={() => setMenuOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">Hola, {userName}</p>
                        <nav className="flex flex-col gap-2 mt-2">
                            <Link
                                href="/dashboard"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                            >
                                📊 Dashboard
                            </Link>
                            <Link
                                href="/entrenamientos"
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                            >
                                🏋️ Entrenamientos
                            </Link>
                        </nav>
                    </div>
                    {/* Backdrop */}
                    <div className="flex-1 bg-black/50" onClick={() => setMenuOpen(false)} />
                </div>
            )}
        </>
    );
}
