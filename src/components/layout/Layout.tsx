import { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { usePageContent } from '@/hooks/usePageContent';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: favicon } = usePageContent('site_favicon_url');

  useEffect(() => {
    if (typeof favicon === 'string' && favicon) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = favicon;
    }
  }, [favicon]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
