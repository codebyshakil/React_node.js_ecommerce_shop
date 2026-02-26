import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  ogImage?: string;
  type?: string;
  jsonLd?: Record<string, any>;
}

const SEOHead = ({ title, description, ogImage, type = 'website', jsonLd }: SEOProps) => {
  useEffect(() => {
    const fullTitle = `${title} | PrimeTrade`;
    document.title = fullTitle;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
      setMeta('twitter:description', description);
    }
    setMeta('og:title', fullTitle, true);
    setMeta('twitter:title', fullTitle);
    setMeta('og:type', type, true);
    if (ogImage) {
      setMeta('og:image', ogImage, true);
      setMeta('twitter:image', ogImage);
    }

    // JSON-LD
    let scriptEl = document.getElementById('json-ld-seo');
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'json-ld-seo';
        scriptEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      const el = document.getElementById('json-ld-seo');
      if (el) el.remove();
    };
  }, [title, description, ogImage, type, jsonLd]);

  return null;
};

export default SEOHead;
