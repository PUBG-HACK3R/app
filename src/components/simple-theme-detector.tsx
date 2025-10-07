"use client";

import { useEffect } from 'react';

export function SimpleThemeDetector() {
  useEffect(() => {
    const applyTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const html = document.documentElement;
      
      if (isDark) {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.add('light');
        html.classList.remove('dark');
      }
    };

    // Apply immediately
    applyTheme();

    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);

    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, []);

  return null;
}
