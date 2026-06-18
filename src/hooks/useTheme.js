import { useEffect, useState } from 'react';

export const THEMES = [
  { id: 'dark',   label: 'Dark',     swatch: ['#0f1117', '#6c7ff2'] },
  { id: 'light',  label: 'Light',    swatch: ['#f4f5f7', '#4f63e8'] },
  { id: 'blue',   label: 'Midnight', swatch: ['#070d1a', '#38bdf8'] },
  { id: 'red',    label: 'Crimson',  swatch: ['#120a0a', '#f87171'] },
  { id: 'pink',   label: 'Rose',     swatch: ['#13080f', '#f472b6'] },
  { id: 'green',  label: 'Forest',   swatch: ['#080f0a', '#4ade80'] },
  { id: 'sunset', label: 'Sunset',   swatch: ['#110c04', '#f59e0b'] },
  { id: 'purple', label: 'Violet',   swatch: ['#0c0812', '#a78bfa'] },
  { id: 'sand',   label: 'Sand',     swatch: ['#f5f0e8', '#b45309'] },
];

export const useTheme = () => {
  const [theme, setRaw] = useState(() => localStorage.getItem('wandr_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wandr_theme', theme);
  }, [theme]);

  return { theme, setTheme: setRaw };
};
