import { useEffect, useState } from 'react';
import { usePageContent } from './usePageContent';

export const useBrandColors = () => {
  const { data: brandColors } = usePageContent('brand_colors');
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (isDark) {
      // In dark mode, remove any inline brand color overrides so .dark CSS kicks in
      if (brandColors && typeof brandColors === 'object') {
        Object.keys(brandColors as Record<string, any>).forEach((key) => {
          if (!key.endsWith('__opacity')) {
            root.style.removeProperty(`--${key}`);
          }
        });
      }
      return;
    }

    // Light mode: apply brand colors
    if (brandColors && typeof brandColors === 'object') {
      const data = brandColors as Record<string, any>;
      const opacityMap: Record<string, number> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key.endsWith('__opacity')) {
          opacityMap[key.replace('__opacity', '')] = Number(value);
        }
      });
      Object.entries(data).forEach(([key, value]) => {
        if (key.endsWith('__opacity') || !value) return;
        const opacity = opacityMap[key];
        if (opacity === 0) {
          root.style.setProperty(`--${key}`, 'transparent');
        } else if (opacity !== undefined && opacity < 100) {
          root.style.setProperty(`--${key}`, `${value} / ${opacity / 100}`);
        } else {
          root.style.setProperty(`--${key}`, String(value));
        }
      });
    }
  }, [brandColors, isDark]);
};
