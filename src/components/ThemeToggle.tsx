'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('reportadesk-theme') as 'dark' | 'light' | null;
    if (saved === 'light' || document.documentElement.classList.contains('light')) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('reportadesk-theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-xl bg-zinc-800/40 border border-zinc-800/60 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? 'Mudar para Modo Claro (Light)' : 'Mudar para Modo Escuro (Dark)'}
      aria-label="Alternar tema"
      className="p-2 rounded-xl transition-all duration-200 flex items-center justify-center
        bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 hover:text-white
        light:bg-slate-200/60 light:hover:bg-slate-200 light:border-slate-300/80 light:text-slate-700 light:hover:text-slate-900"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
