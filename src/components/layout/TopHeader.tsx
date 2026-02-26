import { Link } from 'react-router-dom';
import { Search, Facebook, Instagram, Youtube, Twitter, Linkedin, Menu, ShoppingCart, User, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useHeroSettings, useSocialLinks, useSiteLogo } from '@/hooks/useHeroSettings';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContent } from '@/hooks/usePageContent';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useCategories } from '@/hooks/useProducts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const socialIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  linkedin: Linkedin,
};

const defaultNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Hot Deals', path: '/products?deals=true' },
  { label: 'Blog', path: '/blog' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

const TopHeader = ({ forceRelative = false }: { forceRelative?: boolean }) => {
  const { data: heroSettings } = useHeroSettings();
  const { data: socialLinks } = useSocialLinks();
  const { data: logoUrl } = useSiteLogo();
  const { data: headerData } = usePageContent('header_settings');
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const { data: categories = [] } = useCategories();
  const [isCompact, setIsCompact] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const h = headerData && typeof headerData === 'object' ? headerData as any : {};
  const brandName = h.brand_name || 'CommerceX';
  const tagline = h.tagline || 'Premium Goods';
  const logoHeight = typeof h.logo_height === 'number' ? h.logo_height : 50;
  const logoWidth = typeof h.logo_width === 'number' && h.logo_width > 0 ? h.logo_width : undefined;
  const navLinks: { label: string; path: string }[] = Array.isArray(h.nav_links) ? h.nav_links : defaultNavLinks;
  const headerCategoryIds: string[] = Array.isArray(h.header_category_ids) ? h.header_category_ids : [];
  const filteredCategories = headerCategoryIds.length > 0
    ? categories.filter((cat: any) => headerCategoryIds.includes(cat.id))
    : categories;
  const mobileSearchVisible = h.mobile_search_visible !== false;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const stickyClass = forceRelative ? 'relative' : heroSettings?.sticky_top_header ? 'sticky top-0 z-50' : 'relative z-40';

  // Mobile / Tablet layout (< 1024px)
  if (isCompact) {
    return (
      <>
        <header className={`${stickyClass} ${h.top_bg_color ? '' : 'bg-card'} border-b border-border`} style={{ backgroundColor: h.top_bg_color || undefined, color: h.top_text_color || undefined }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between px-3 py-2">
            {/* Left: Hamburger */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setMobileMenuOpen(true)}
              style={{ color: h.icon_color || undefined }}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Center: Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ height: `${Math.min(logoHeight, 40)}px`, width: logoWidth ? `${logoWidth}px` : 'auto' }} className="object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                    <span className="text-primary-foreground font-display font-bold text-sm">{brandName.charAt(0)}</span>
                  </div>
                  <span className="font-display text-lg font-bold text-foreground">{brandName}</span>
                </div>
              )}
            </Link>

            {/* Right: Cart + User */}
            <div className="flex items-center gap-0.5">
              <Link to="/cart">
                <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" style={{ color: h.icon_color || undefined }}>
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'}>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0" style={{ color: h.icon_color || undefined }}>
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {mobileSearchVisible && (
            <div className="px-3 pb-2">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: h.search_text_color || undefined }} />
                  <Input
                    type="text"
                    placeholder={h.search_placeholder || 'Search products...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 h-9 text-sm"
                    style={{ backgroundColor: h.search_bg_color || undefined, color: h.search_text_color || undefined, borderColor: h.search_border_color || undefined }}
                  />
                </div>
              </form>
            </div>
          )}
        </header>

        {/* Mobile Menu Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-left text-base">Menu</SheetTitle>
            </SheetHeader>
            <Tabs defaultValue="menu" className="w-full">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent h-10">
                <TabsTrigger value="menu" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
                  Menu
                </TabsTrigger>
                <TabsTrigger value="categories" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
                  Categories
                </TabsTrigger>
              </TabsList>
              <TabsContent value="menu" className="mt-0">
                <div className="flex flex-col py-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="categories" className="mt-0">
                <div className="flex flex-col py-1">
                  {filteredCategories.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No categories</p>
                  ) : (
                    filteredCategories.map((cat: any) => (
                      <Link
                        key={cat.id}
                        to={`/products?category=${cat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                      >
                        <span>{cat.name}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop layout (>= 1024px)
  return (
    <header className={`${stickyClass} ${h.top_bg_color ? '' : 'bg-card'} border-b border-border`} style={{ backgroundColor: h.top_bg_color || undefined, color: h.top_text_color || undefined }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ height: `${logoHeight}px`, width: logoWidth ? `${logoWidth}px` : 'auto' }} className="object-contain" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg hero-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-lg">{brandName.charAt(0)}</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-display text-xl font-bold text-foreground">{brandName}</span>
                <span className="block text-xs text-muted-foreground -mt-1">{tagline}</span>
              </div>
            </>
          )}
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: h.search_text_color || undefined }} />
            <Input
              type="text"
              placeholder={h.search_placeholder || 'Search products...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 h-10"
              style={{ backgroundColor: h.search_bg_color || undefined, color: h.search_text_color || undefined, borderColor: h.search_border_color || undefined }}
            />
          </div>
        </form>

        {/* Social Icons */}
        {heroSettings?.social_icons_enabled && socialLinks && (
          <div className="hidden md:flex items-center gap-1.5">
            {Object.entries(socialLinks).map(([key, url]) => {
              if (!url || typeof url !== 'string') return null;
              const Icon = socialIcons[key];
              if (!Icon) return null;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
