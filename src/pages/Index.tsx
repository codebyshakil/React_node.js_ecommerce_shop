import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Truck, Award, Headphones, Star, ChevronLeft, ChevronRight, Zap, Heart, Clock, Globe, Package, CheckCircle, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/ProductCard';
import SEOHead from '@/components/SEOHead';
import HeroCategorySlider from '@/components/home/HeroCategorySlider';
import FlashSaleCountdown from '@/components/home/FlashSaleCountdown';
import DynamicPageSections from '@/components/DynamicPageSections';
import { supabase } from '@/integrations/supabase/client';
import { useHomepageSections, HomepageSection } from '@/hooks/useHomepageSections';
import { useProducts, useCategories, useTestimonials, useBlogPosts, DbProduct } from '@/hooks/useProducts';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const ICON_MAP: Record<string, any> = {
  Award, Truck, Shield, Headphones, Star, Heart, Zap, Clock, Globe, Package, CheckCircle, ThumbsUp,
};

const getSectionStyle = (settings: any): React.CSSProperties => {
  const style: React.CSSProperties = {};
  if (settings?.section_bg_color) style.backgroundColor = settings.section_bg_color;
  if (settings?.section_bg_image) {
    style.backgroundImage = `url(${settings.section_bg_image})`;
    style.backgroundSize = settings.section_bg_size || 'cover';
    style.backgroundPosition = settings.section_bg_position || 'center';
  }
  if (settings?.padding_top != null) style.paddingTop = `${settings.padding_top}px`;
  if (settings?.padding_bottom != null) style.paddingBottom = `${settings.padding_bottom}px`;
  if (settings?.text_color) style.color = settings.text_color;
  if (settings?.body_font && settings.body_font !== 'default') style.fontFamily = settings.body_font;
  if (settings?.body_font_size) style.fontSize = `${settings.body_font_size}px`;
  return style;
};

const getTitleClass = (settings: any) => {
  const size = settings?.title_size || 'large';
  if (size === 'small') return 'text-lg sm:text-xl md:text-2xl';
  if (size === 'medium') return 'text-xl sm:text-2xl md:text-3xl';
  if (size === 'custom') return '';
  return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
};

const getTitleStyle = (settings: any): React.CSSProperties => {
  const style: React.CSSProperties = {};
  if (settings?.title_size === 'custom' && settings?.title_font_size) {
    style.fontSize = `${settings.title_font_size}px`;
  }
  if (settings?.title_color) style.color = settings.title_color;
  if (settings?.title_font && settings.title_font !== 'default') style.fontFamily = settings.title_font;
  if (settings?.title_weight && settings.title_weight !== 'default') style.fontWeight = settings.title_weight as any;
  return style;
};

const getSubtitleStyle = (settings: any): React.CSSProperties => {
  const style: React.CSSProperties = {};
  if (settings?.subtitle_color) style.color = settings.subtitle_color;
  return style;
};

const SectionHeader = ({ title, subtitle, settings, extra }: { title?: string; subtitle?: string | null; settings?: any; extra?: React.ReactNode }) => {
  if (!title && !subtitle) return null;
  const align = settings?.title_align || 'center';
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  return (
    <div className={`mb-8 sm:mb-10 md:mb-12 ${extra ? 'flex items-end justify-between' : ''}`}>
      <div className={alignClass}>
        {title && <h2 className={`${getTitleClass(settings)} font-display font-bold text-foreground`} style={getTitleStyle(settings)}>{title}</h2>}
        {subtitle && <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-muted-foreground" style={getSubtitleStyle(settings)}>{subtitle}</p>}
      </div>
      {extra}
    </div>
  );
};

const SectionWrapper = ({ settings, children, className = '', defaultBg = '' }: { settings?: any; children: React.ReactNode; className?: string; defaultBg?: string }) => {
  const style = getSectionStyle(settings);
  const hasBgImage = !!settings?.section_bg_image;

  return (
    <section className={`section-padding ${defaultBg} ${className}`} style={style}>
      {hasBgImage && settings?.section_overlay && <div className="absolute inset-0" style={{ backgroundColor: settings.section_overlay }} />}
      <div className="container-wide relative z-10">
        {children}
      </div>
    </section>
  );
};

// Normalize legacy section types
const getSectionType = (s: HomepageSection): string => {
  const raw = s.settings_json?.section_type || s.section_key;
  if (['featured_products', 'best_selling', 'new_arrivals', 'trending', 'deal_of_day', 'custom_product_grid'].includes(raw)) return 'product_showcase';
  if (['why_choose_us', 'icon_card_grid', 'feature_grid', 'info_cards', 'service_cards', 'trust_badges'].includes(raw)) return 'card_section';
  if (['partners', 'featured_brands'].includes(raw)) return 'brand_partner';
  if (raw === 'newsletter') return 'newsletter_removed';
  return raw;
};

const Index = () => {
  const { data: sections = [] } = useHomepageSections();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: testimonials = [] } = useTestimonials();
  const { data: blogPosts = [] } = useBlogPosts();

  // Check if a different page is set as homepage
  const { data: homepageSlug } = useQuery({
    queryKey: ['site-settings-homepage-slug'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_slug')
        .maybeSingle();
      if (error) throw error;
      return (data?.value as string) || 'home';
    },
    staleTime: 30_000,
  });

  // If homepage is a custom page (not 'home'), load that page's sections
  const isCustomHomepage = homepageSlug && homepageSlug !== 'home';

  const { data: customPage } = useQuery({
    queryKey: ['page-by-slug', homepageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', homepageSlug!)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!isCustomHomepage,
  });

  const { data: customPageSections = [] } = useQuery({
    queryKey: ['page-sections-by-slug', homepageSlug],
    queryFn: async () => {
      if (!customPage?.id) return [];
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', customPage.id)
        .eq('is_enabled', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!customPage?.id,
  });

  const enabled = useMemo(
    () => sections.filter(s => s.is_enabled).sort((a, b) => a.display_order - b.display_order),
    [sections]
  );

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebSite',
    name: 'CommerceX', url: window.location.origin,
    description: 'Premium quality products sourced from around the world.',
  };

  // If a custom page is set as homepage, render its sections
  if (isCustomHomepage && customPage) {
    return (
      <Layout>
        <SEOHead title={customPage.title || 'Home'} description={customPage.meta_description || 'Your trusted partner for premium quality goods.'} jsonLd={jsonLd} />
        <div className="min-h-screen">
          <DynamicPageSections sections={customPageSections} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title="Home" description="Your trusted partner for premium quality goods." jsonLd={jsonLd} />
      <div className="min-h-screen">
        {enabled.map(section => (
          <DynamicSection key={section.id} section={section} products={products} categories={categories} testimonials={testimonials} blogPosts={blogPosts} />
        ))}
      </div>
    </Layout>
  );
};

const DynamicSection = ({ section, products, categories, testimonials, blogPosts }: {
  section: HomepageSection; products: DbProduct[]; categories: any[]; testimonials: any[]; blogPosts: any[];
}) => {
  const sType = getSectionType(section);

  if (section.section_key === 'hero') return <HeroCategorySlider />;
  if (sType === 'product_showcase') return <ProductShowcaseSection section={section} products={products} />;
  if (sType === 'categories') return <CategoriesSection section={section} categories={categories} />;
  if (sType === 'flash_sale') return <FlashSaleSection section={section} products={products} />;
  if (sType === 'card_section') return <CardSection section={section} />;
  if (sType === 'blog') return <BlogSection section={section} blogPosts={blogPosts} />;
  if (sType === 'testimonials') return <TestimonialsSection section={section} testimonials={testimonials} />;
  if (sType === 'brand_partner') return <BrandPartnerSection section={section} />;
  if (sType === 'cta') return <CTASection section={section} />;
  if (sType === 'custom_html') return <CustomHTMLSection section={section} />;
  if (sType === 'custom_banner') return <BannerSection section={section} />;
  // newsletter_removed and trust_badges render nothing
  return null;
};

// ======= Product Showcase (unified) =======
const ProductShowcaseSection = ({ section, products }: { section: HomepageSection; products: DbProduct[] }) => {
  const limit = section.item_limit || 4;
  const settings = section.settings_json || {};
  const filtered = useMemo(() => {
    let list = [...products];
    switch (section.product_source) {
      case 'manual': {
        const ids = Array.isArray(section.selected_ids) ? section.selected_ids : [];
        list = ids.map(id => products.find(p => p.id === id)).filter(Boolean) as DbProduct[];
        break;
      }
      case 'top_rated': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'random': list.sort(() => Math.random() - 0.5); break;
      case 'best_selling': list.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
      case 'category': {
        const catIds = Array.isArray(section.selected_ids) ? section.selected_ids : [];
        if (catIds.length) list = list.filter(p => p.category_id && catIds.includes(p.category_id));
        break;
      }
    }
    return list.slice(0, limit);
  }, [products, section, limit]);

  if (filtered.length === 0) return null;

  const gridId = `pg-${section.id.slice(0, 8)}`;
  const colsD = settings.cols_desktop || 4;
  const colsT = settings.cols_tablet || 3;
  const colsM = settings.cols_mobile || 2;

  return (
    <SectionWrapper settings={settings} defaultBg="bg-muted/30">
      <SectionHeader
        title={section.title} subtitle={section.subtitle} settings={settings}
        extra={<Link to="/products"><Button variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">View All <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>}
      />
      <style>{`
        .${gridId} { display: grid; gap: 1.5rem; grid-template-columns: repeat(${colsM}, minmax(0, 1fr)); }
        @media (min-width: 768px) { .${gridId} { grid-template-columns: repeat(${colsT}, minmax(0, 1fr)); } }
        @media (min-width: 1280px) { .${gridId} { grid-template-columns: repeat(${colsD}, minmax(0, 1fr)); } }
      `}</style>
      <div className={gridId}>
        {filtered.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    </SectionWrapper>
  );
};

const CategoriesSection = ({ section, categories }: { section: HomepageSection; categories: any[] }) => {
  const limit = section.item_limit || 6;
  const settings = section.settings_json || {};
  const imageFit = settings.image_fit || 'cover';
  const colsDesktop = settings.cols_desktop || 6;
  const colsTablet = settings.cols_tablet || 3;
  const colsMobile = settings.cols_mobile || 2;
  const cardBg = settings.card_bg_color || '';

  const filtered = useMemo(() => {
    const ids = Array.isArray(section.selected_ids) ? section.selected_ids : [];
    let list = ids.length > 0 ? ids.map(id => categories.find((c: any) => c.id === id)).filter(Boolean) : [...categories];
    return list.slice(0, limit);
  }, [categories, section, limit]);

  if (filtered.length === 0) return null;

  const colClass = (n: number) => n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : n === 4 ? 'grid-cols-4' : n === 5 ? 'grid-cols-5' : 'grid-cols-6';
  const isCarousel = section.layout_type === 'carousel';
  const isHorizontal = section.layout_type === 'horizontal';

  return (
    <SectionWrapper settings={settings} defaultBg="bg-background">
      <SectionHeader title={section.title} subtitle={section.subtitle} settings={settings} />
      <div className={
        isHorizontal || isCarousel
          ? 'flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide'
          : `grid ${colClass(colsMobile)} md:${colClass(colsTablet)} lg:${colClass(colsDesktop)} gap-4`
      }>
        {filtered.map((cat: any, i: number) => (
          <motion.div key={cat.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
            className={isHorizontal || isCarousel ? 'min-w-[160px] snap-start flex-shrink-0' : ''}
          >
            <Link to={`/products?category=${cat.slug}`} className="group block">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden card-elevated" style={cardBg ? { backgroundColor: cardBg } : undefined}>
                <img src={cat.image_url || '/placeholder.svg'} alt={cat.name}
                  className={`w-full h-full transition-transform duration-500 group-hover:scale-110 ${imageFit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
                  loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-display font-semibold text-sm text-primary-foreground">{cat.name}</h3>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ======= Flash Sale =======
const FlashSaleSection = ({ section, products }: { section: HomepageSection; products: DbProduct[] }) => {
  const settings = section.settings_json || {};
  const limit = section.item_limit || 4;
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!settings.end_date) { setIsExpired(false); return; }
    const check = () => setIsExpired(new Date(settings.end_date).getTime() < Date.now());
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [settings.end_date]);

  if (isExpired && settings.auto_hide_expired) return null;

  const ids = Array.isArray(section.selected_ids) ? section.selected_ids : [];
  const filtered = ids.length > 0
    ? ids.map(id => products.find(p => p.id === id)).filter(Boolean).slice(0, limit) as DbProduct[]
    : products.slice(0, limit);

  if (filtered.length === 0 && !isExpired) return null;

  return (
    <SectionWrapper settings={settings}>
      <div className="text-center mb-8">
        {section.title && (
          <h2 className={`${getTitleClass(settings)} font-display font-bold text-foreground flex items-center justify-center gap-3`} style={getTitleStyle(settings)}>
            <Zap className="w-8 h-8 text-destructive fill-destructive" />
            {section.title}
            <Zap className="w-8 h-8 text-destructive fill-destructive" />
          </h2>
        )}
        {section.subtitle && <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-muted-foreground">{section.subtitle}</p>}
        {isExpired && settings.show_expired_label ? (
          <div className="mt-4 inline-block bg-destructive/10 text-destructive font-semibold px-6 py-2 rounded-full">Sale Ended</div>
        ) : (
          settings.end_date && !isExpired && <div className="mt-4"><FlashSaleCountdown endDate={settings.end_date} /></div>
        )}
      </div>
      {settings.banner_image && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img src={settings.banner_image} alt="Flash Sale" className="w-full h-48 object-cover" loading="lazy" />
        </div>
      )}
      {!isExpired && filtered.length > 0 && (
        <>
          <style>{`
            .fs-${section.id.slice(0,8)} { display: grid; gap: 1.5rem; grid-template-columns: repeat(${settings.cols_mobile || 2}, minmax(0, 1fr)); }
            @media (min-width: 768px) { .fs-${section.id.slice(0,8)} { grid-template-columns: repeat(${settings.cols_tablet || 3}, minmax(0, 1fr)); } }
            @media (min-width: 1280px) { .fs-${section.id.slice(0,8)} { grid-template-columns: repeat(${settings.cols_desktop || 4}, minmax(0, 1fr)); } }
          `}</style>
          <div className={`fs-${section.id.slice(0,8)}`}>
            {filtered.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </>
      )}
    </SectionWrapper>
  );
};

// ======= Card Section (unified) =======
const CardSection = ({ section }: { section: HomepageSection }) => {
  const settings = section.settings_json || {};
  const cards: any[] = settings.cards || [
    { icon: 'Award', title: 'Premium Quality', description: 'Every product is rigorously tested to meet the highest quality standards.' },
    { icon: 'Truck', title: 'Global Shipping', description: 'Fast and reliable shipping to over 100 countries worldwide.' },
    { icon: 'Shield', title: 'Secure Payments', description: 'Multiple payment options with bank-grade security encryption.' },
    { icon: 'Headphones', title: '24/7 Support', description: 'Dedicated customer support team available around the clock.' },
  ];

  const layoutClass = settings.layout === '2-col' ? 'grid-cols-1 sm:grid-cols-2' :
    settings.layout === '3-col' ? 'grid-cols-1 sm:grid-cols-3' :
    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <SectionWrapper settings={settings} defaultBg="bg-background">
      <SectionHeader title={section.title} subtitle={section.subtitle} settings={settings} />
      <div className={`grid ${layoutClass} gap-8`}>
        {cards.map((item, i) => {
          const IconComp = ICON_MAP[item.icon] || Award;
          return (
            <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center p-6 rounded-xl bg-card border border-border card-elevated">
              {item.image ? (
                <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden mb-4">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-14 h-14 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <IconComp className="w-7 h-7 text-secondary" />
                </div>
              )}
              {item.title && <h3 className="font-display font-semibold text-lg text-foreground mb-2">{item.title}</h3>}
              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              {item.button_text && (
                <Link to={item.button_link || '#'} className="inline-block mt-3">
                  <Button size="sm" variant="outline">{item.button_text}</Button>
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </SectionWrapper>
  );
};

// ======= Blog =======
const BlogSection = ({ section, blogPosts }: { section: HomepageSection; blogPosts: any[] }) => {
  const limit = section.item_limit || 3;
  const settings = section.settings_json || {};
  const showDate = settings.show_date !== false;
  const showAuthor = settings.show_author !== false;
  const showExcerpt = settings.show_excerpt !== false;
  const excerptLen = settings.excerpt_length || 120;

  let posts = [...blogPosts];
  if (settings.category_filter) posts = posts.filter(p => p.category?.toLowerCase() === settings.category_filter.toLowerCase());
  if (posts.length === 0) return null;

  return (
    <SectionWrapper settings={settings} defaultBg="bg-muted/30">
      <SectionHeader title={section.title} subtitle={section.subtitle} settings={settings}
        extra={<Link to="/blog"><Button variant="ghost" className="text-muted-foreground hover:text-foreground">All Posts <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.slice(0, limit).map((post: any, i: number) => (
          <motion.article key={post.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-card rounded-xl border border-border overflow-hidden card-elevated">
            {post.image_url && (
              <div className="block aspect-video overflow-hidden">
                <img src={post.image_url} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-secondary">{post.category}</span>
                {showDate && <span className="text-xs text-muted-foreground">· {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2 line-clamp-2">{post.title}</h3>
              {showExcerpt && post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt.slice(0, excerptLen)}</p>}
              {showAuthor && post.author && <p className="text-xs text-muted-foreground mt-2">By {post.author}</p>}
            </div>
          </motion.article>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ======= Testimonials (infinite loop, pause on hover) =======
const TestimonialsSection = ({ section, testimonials }: { section: HomepageSection; testimonials: any[] }) => {
  const settings = section.settings_json || {};
  const limit = section.item_limit || 10;
  const showRating = settings.show_rating !== false;
  const showCompany = settings.show_company !== false;
  const showArrows = settings.show_arrows !== false;
  const showDots = settings.show_dots !== false;
  const autoplay = settings.autoplay !== false;
  const pauseOnHover = settings.pause_on_hover !== false;
  const slideSpeed = (settings.slide_speed || 5) * 1000;
  const carouselType = settings.carousel_type || 'infinite';

  const cardsDesktop = settings.cards_desktop || 3;
  const cardsTablet = settings.cards_tablet || 2;
  const cardsMobile = settings.cards_mobile || 1;

  const items = testimonials.slice(0, limit);
  const [page, setPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const cardsPerSlide = windowWidth >= 1024 ? cardsDesktop : windowWidth >= 768 ? cardsTablet : cardsMobile;
  const totalPages = Math.max(1, Math.ceil(items.length / cardsPerSlide));
  const isInfinite = carouselType === 'loop' || carouselType === 'infinite';

  const nextPage = useCallback(() => {
    setPage(prev => isInfinite ? (prev + 1) % totalPages : Math.min(prev + 1, totalPages - 1));
  }, [totalPages, isInfinite]);

  const prevPage = useCallback(() => {
    setPage(prev => isInfinite ? (prev - 1 + totalPages) % totalPages : Math.max(prev - 1, 0));
  }, [totalPages, isInfinite]);

  useEffect(() => {
    if (!autoplay || items.length <= cardsPerSlide || (isPaused && pauseOnHover)) return;
    const timer = setInterval(nextPage, slideSpeed);
    return () => clearInterval(timer);
  }, [autoplay, items.length, cardsPerSlide, slideSpeed, nextPage, isPaused, pauseOnHover]);

  if (items.length === 0) return null;

  const startIdx = page * cardsPerSlide;
  let displayItems: any[] = [];
  for (let i = 0; i < cardsPerSlide; i++) {
    const idx = (startIdx + i) % items.length;
    displayItems.push(items[idx]);
  }

  const gridClass = cardsPerSlide === 1 ? 'grid-cols-1' :
    cardsPerSlide === 2 ? 'grid-cols-1 md:grid-cols-2' :
    cardsPerSlide === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <SectionWrapper settings={settings} defaultBg="bg-background">
      <SectionHeader title={section.title} subtitle={section.subtitle} settings={settings} />
      <div
        className={`grid ${gridClass} gap-6`}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      >
        {displayItems.map((item: any, i: number) => (
          <motion.div
            key={`${page}-${i}`}
            initial={carouselType === 'fade' ? { opacity: 0 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center card-elevated"
          >
            {showRating && (
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(item.rating ?? 5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-secondary text-secondary" />
                ))}
              </div>
            )}
            <p className="text-foreground italic leading-relaxed mb-4 line-clamp-4">"{item.content}"</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                {item.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">{item.name}</p>
                {showCompany && item.company && <p className="text-xs text-muted-foreground">{item.company}</p>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          {showArrows && (
            <Button variant="outline" size="icon" onClick={prevPage} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          )}
          {showDots && Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === page ? 'bg-secondary' : 'bg-border'}`} />
          ))}
          {showArrows && (
            <Button variant="outline" size="icon" onClick={nextPage} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
          )}
        </div>
      )}
    </SectionWrapper>
  );
};

// ======= Brand / Partner (unified) =======
const BrandPartnerSection = ({ section }: { section: HomepageSection }) => {
  const settings = section.settings_json || {};
  const logos: any[] = settings.logos || [];
  const grayscale = settings.grayscale;
  const hoverColor = settings.hover_color;
  const logoSize = settings.logo_size || 'md';
  const sizeClass = logoSize === 'sm' ? 'h-8' : logoSize === 'lg' ? 'h-16' : 'h-10';
  const fallbackNames = ['FreshMart', 'OrganicWorld', 'SpiceRoute', 'NaturalGoods', 'PureHarvest', 'GreenChoice'];

  return (
    <SectionWrapper settings={settings} defaultBg="bg-muted/30" className="border-y border-border">
      {section.title && <p className="text-center text-sm text-muted-foreground mb-8">{section.title}</p>}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
        {logos.length > 0 ? logos.map((logo, i) => {
          const content = logo.url ? (
            <img key={i} src={logo.url} alt={logo.name || 'Partner'}
              className={`${sizeClass} w-auto object-contain transition-all duration-300 ${grayscale ? 'grayscale' : ''} ${hoverColor ? 'hover:grayscale-0' : ''} hover:opacity-100 opacity-60`}
              loading="lazy" />
          ) : (
            <span key={i} className="text-xl font-display font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">{logo.name}</span>
          );
          return logo.link ? <a key={i} href={logo.link} target="_blank" rel="noopener noreferrer">{content}</a> : content;
        }) : fallbackNames.map(name => (
          <span key={name} className="text-xl font-display font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">{name}</span>
        ))}
      </div>
    </SectionWrapper>
  );
};

// ======= CTA =======
const CTASection = ({ section }: { section: HomepageSection }) => {
  const settings = section.settings_json || {};
  const alignment = settings.alignment || 'center';
  const alignClass = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';
  const justifyClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';

  const bgStyle: React.CSSProperties = { ...getSectionStyle(settings) };
  if (settings.bg_image) {
    bgStyle.backgroundImage = `url(${settings.bg_image})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  }
  if (settings.bg_color) bgStyle.backgroundColor = settings.bg_color;

  const btnText = settings.btn_text || 'Shop Now';
  const btnLink = settings.btn_link || '/products';
  const target = settings.open_new_tab ? '_blank' : undefined;

  return (
    <section className={!settings.bg_color && !settings.bg_image ? 'hero-gradient section-padding' : 'section-padding relative'} style={bgStyle}>
      {settings.bg_image && <div className="absolute inset-0 bg-foreground/50" />}
      <div className={`container-wide ${alignClass} relative z-10`}>
        {section.title && <h2 className={`${getTitleClass(settings)} font-display font-bold text-primary-foreground mb-4`} style={getTitleStyle(settings)}>{section.title}</h2>}
        {section.subtitle && <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">{section.subtitle}</p>}
        <div className={`flex flex-col sm:flex-row gap-4 ${justifyClass}`}>
          {btnText && <Link to={btnLink} target={target}><Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-8">{btnText}</Button></Link>}
          {settings.btn2_text && <Link to={settings.btn2_link || '/contact'} target={target}><Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-8">{settings.btn2_text}</Button></Link>}
        </div>
      </div>
    </section>
  );
};

// ======= Custom HTML =======
const CustomHTMLSection = ({ section }: { section: HomepageSection }) => {
  const settings = section.settings_json || {};
  const htmlContent = settings.html_content || '';
  const cssContent = settings.enable_css && settings.css_content ? settings.css_content : '';
  const containerMode = settings.container_mode || 'container';

  if (!htmlContent) return null;

  const sanitized = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  return (
    <section className="section-padding" style={getSectionStyle(settings)}>
      {cssContent && <style dangerouslySetInnerHTML={{ __html: cssContent }} />}
      <div className={containerMode === 'full_width' ? '' : 'container-wide'}>
        <SectionHeader title={section.title} subtitle={section.subtitle} settings={settings} />
        <div dangerouslySetInnerHTML={{ __html: sanitized }} />
      </div>
    </section>
  );
};

// ======= Banner =======
const BannerSection = ({ section }: { section: HomepageSection }) => {
  const settings = section.settings_json || {};
  const banners: any[] = (settings.banners || []).filter((b: any) => {
    const now = Date.now();
    if (b.start_date && new Date(b.start_date).getTime() > now) return false;
    if (b.end_date && new Date(b.end_date).getTime() < now) return false;
    return true;
  });
  const bannerLayout = settings.banner_layout || 'full';
  const bannerHeight = settings.banner_height || '400px';
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (bannerLayout !== 'slider' || banners.length <= 1) return;
    const timer = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [bannerLayout, banners.length]);

  if (banners.length === 0) return null;

  const renderBanner = (banner: any, i: number) => {
    const alignClass = banner.text_align === 'left' ? 'text-left items-start' : banner.text_align === 'right' ? 'text-right items-end' : 'text-center items-center';
    return (
      <div key={i} className="relative overflow-hidden rounded-xl" style={{ height: bannerHeight }}>
        <picture>
          {banner.mobile_image && <source media="(max-width: 768px)" srcSet={banner.mobile_image} />}
          <img src={banner.image || '/placeholder.svg'} alt={banner.title || 'Banner'} className="w-full h-full object-cover" loading="lazy" />
        </picture>
        {banner.overlay_color && <div className="absolute inset-0" style={{ backgroundColor: banner.overlay_color }} />}
        <div className={`absolute inset-0 flex flex-col justify-center p-8 md:p-12 ${alignClass}`}>
          <div className="relative z-10 max-w-xl">
            {banner.title && <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-2">{banner.title}</h2>}
            {banner.subtitle && <p className="text-lg text-primary-foreground/80 mb-2">{banner.subtitle}</p>}
            {banner.description && <p className="text-sm text-primary-foreground/70 mb-4">{banner.description}</p>}
            {banner.btn_text && <Link to={banner.btn_link || '/products'}><Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">{banner.btn_text}</Button></Link>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionWrapper settings={settings}>
      <SectionHeader title={section.title} subtitle={section.subtitle} settings={settings} />
      {bannerLayout === 'slider' ? (
        <div className="relative">
          {renderBanner(banners[currentBanner], currentBanner)}
          {banners.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentBanner(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentBanner ? 'bg-secondary' : 'bg-border'}`} />
              ))}
            </div>
          )}
        </div>
      ) : bannerLayout === 'split' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{banners.map((b, i) => renderBanner(b, i))}</div>
      ) : (
        <div className="space-y-4">{banners.map((b, i) => renderBanner(b, i))}</div>
      )}
    </SectionWrapper>
  );
};

export default Index;
