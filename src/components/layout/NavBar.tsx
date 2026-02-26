import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCategories } from '@/hooks/useProducts';
import { useHeroSettings } from '@/hooks/useHeroSettings';
import { usePageContent } from '@/hooks/usePageContent';

const defaultNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Hot Deals', path: '/products?deals=true' },
  { label: 'Blog', path: '/blog' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

const NavBar = ({ forceRelative = false }: { forceRelative?: boolean }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const { data: categories = [] } = useCategories();
  const { data: heroSettings } = useHeroSettings();
  const { data: headerData } = usePageContent('header_settings');

  const h = headerData && typeof headerData === 'object' ? headerData as any : {};
  const navLinks: { label: string; path: string }[] = Array.isArray(h.nav_links) ? h.nav_links : defaultNavLinks;
  const headerCategoryIds: string[] = Array.isArray(h.header_category_ids) ? h.header_category_ids : [];
  const filteredCategories = headerCategoryIds.length > 0
    ? categories.filter((cat: any) => headerCategoryIds.includes(cat.id))
    : categories;

  const stickyClass = forceRelative
    ? 'relative'
    : heroSettings?.sticky_navbar
      ? 'sticky top-0 z-50'
      : 'relative z-40';

  // Close categories dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className={`${stickyClass} ${h.navbar_bg_color ? '' : 'hero-gradient'} text-primary-foreground hidden lg:block`} style={{ backgroundColor: h.navbar_bg_color || undefined, color: h.navbar_text_color || undefined }} >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
        {/* Left: Categories + Menu */}
        <div className="flex items-center gap-1">
          {/* All Categories Dropdown */}
          <div className="relative" ref={catRef}>
            <button
              onClick={() => setCatOpen(!catOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">All Categories</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {catOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-1 w-56 bg-card rounded-lg border border-border shadow-lg z-50 overflow-hidden"
                >
                  {filteredCategories.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No categories</p>
                  ) : (
                    filteredCategories.map((cat: any) => (
                      <Link
                        key={cat.id}
                        to={`/products?category=${cat.slug}`}
                        onClick={() => setCatOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <span>{cat.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Nav Links */}
          <div className="flex items-center gap-0.5 ml-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? 'bg-primary-foreground/15 text-primary-foreground'
                    : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Cart + Auth + Mobile Toggle */}
        <div className="flex items-center gap-1.5">
          <Link to="/cart">
            <Button variant="ghost" size="sm" className="relative text-primary-foreground hover:bg-primary-foreground/10 h-8 px-2" style={{ color: h.icon_color || h.navbar_text_color || undefined }}>
              <ShoppingCart className="w-4.5 h-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-primary">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          <Link to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'}>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 h-8 px-2 gap-1.5" style={{ color: h.icon_color || h.navbar_text_color || undefined }}>
              <User className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{user ? 'Account' : 'Login'}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10 h-8 px-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
