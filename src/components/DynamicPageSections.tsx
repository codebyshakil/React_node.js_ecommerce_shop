import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { PageSection } from '@/hooks/usePageSections';
import { motion } from 'framer-motion';
import { Award, Truck, Shield, Headphones, Star, Heart, Zap, Clock, Globe, Package, CheckCircle, ThumbsUp, Flame, Tag, Gift, ShoppingCart, Sparkles, TrendingUp, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DOMPurify from 'dompurify';
import { useProducts, useCategories, useTestimonials, useBlogPosts, DbProduct } from '@/hooks/useProducts';
import ProductCard from '@/components/products/ProductCard';

const ICON_MAP: Record<string, any> = {
  Award, Truck, Shield, Headphones, Star, Heart, Zap, Clock, Globe, Package, CheckCircle, ThumbsUp, Flame, Tag, Gift, ShoppingCart, Sparkles, TrendingUp,
};

interface Props {
  sections: PageSection[];
}

const DynamicPageSections = ({ sections }: Props) => {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: testimonials = [] } = useTestimonials();
  const { data: blogPosts = [] } = useBlogPosts();

  return (
    <div className="bg-background">
      {sections.map((section, idx) => (
        <DynamicSection key={section.id} section={section} index={idx} products={products} categories={categories} testimonials={testimonials} blogPosts={blogPosts} />
      ))}
    </div>
  );
};

const DynamicSection = ({ section, index, products, categories, testimonials, blogPosts }: {
  section: PageSection; index: number; products: DbProduct[]; categories: any[]; testimonials: any[]; blogPosts: any[];
}) => {
  const s = section.settings_json || {};
  const sectionStyle: React.CSSProperties = {
    backgroundColor: s.bg_color || undefined,
    paddingTop: s.padding_top ? `${s.padding_top}px` : '48px',
    paddingBottom: s.padding_bottom ? `${s.padding_bottom}px` : '48px',
    textAlign: (s.text_align as any) || undefined,
    color: s.text_color || undefined,
    fontFamily: (s.body_font && s.body_font !== 'default') ? s.body_font : undefined,
    fontSize: s.body_font_size ? `${s.body_font_size}px` : undefined,
  };

  switch (section.section_type) {
    case 'text_block': return <TextBlockSection section={section} style={sectionStyle} index={index} />;
    case 'hero_slider': return <HeroSliderSection section={section} />;
    case 'product_showcase': return <ProductShowcaseSection section={section} style={sectionStyle} products={products} />;
    case 'categories': return <CategoriesSectionRenderer section={section} style={sectionStyle} categories={categories} />;
    case 'card_section': return <CardSectionRenderer section={section} style={sectionStyle} index={index} />;
    case 'blog': return <BlogSectionRenderer section={section} style={sectionStyle} blogPosts={blogPosts} />;
    case 'testimonials': return <TestimonialsSectionRenderer section={section} style={sectionStyle} testimonials={testimonials} />;
    case 'brand_partner': return <BrandPartnerRenderer section={section} style={sectionStyle} />;
    case 'custom_banner': return <BannerSectionRenderer section={section} style={sectionStyle} />;
    case 'faq_accordion': return <FAQSection section={section} style={sectionStyle} index={index} />;
    case 'card_grid': return <CardGridSection section={section} style={sectionStyle} index={index} />;
    case 'cta_block': return <CTABlockSection section={section} style={sectionStyle} />;
    case 'team_members': return <TeamMembersSection section={section} style={sectionStyle} index={index} />;
    case 'custom_html': return <CustomHTMLSection section={section} style={sectionStyle} />;
    case 'spacer': return <SpacerSection section={section} />;
    default: return null;
  }
};

interface SectionProps {
  section: PageSection;
  style: React.CSSProperties;
  index?: number;
}

const getTitleStyle = (s: any): React.CSSProperties => {
  const style: React.CSSProperties = {};
  if (s?.title_color) style.color = s.title_color;
  if (s?.title_font && s.title_font !== 'default') style.fontFamily = s.title_font;
  if (s?.title_weight && s.title_weight !== 'default') style.fontWeight = s.title_weight;
  return style;
};

const getSubtitleStyle = (s: any): React.CSSProperties => {
  const style: React.CSSProperties = {};
  if (s?.subtitle_color) style.color = s.subtitle_color;
  return style;
};

const SectionTitle = ({ title, subtitle, align, settings }: { title: string; subtitle?: string; align?: string; settings?: any }) => {
  if (!title && !subtitle) return null;
  const titleGap = settings?.title_gap != null ? `${settings.title_gap}px` : undefined;
  const subtitleGap = settings?.subtitle_gap != null ? `${settings.subtitle_gap}px` : '0.5rem';
  const sectionMb = settings?.content_gap != null ? `${settings.content_gap}px` : '1.5rem';
  const iconName = settings?.title_icon && settings.title_icon !== 'none' ? settings.title_icon : null;
  const IconComp = iconName ? ICON_MAP[iconName] : null;
  const iconPos = settings?.title_icon_position || 'left';
  return (
    <div className={`${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`} style={{ marginBottom: sectionMb }}>
      {title && (
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground inline-flex items-center gap-2" style={{ ...getTitleStyle(settings), marginBottom: titleGap }}>
          {IconComp && iconPos === 'left' && <IconComp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0" />}
          <span>{title}</span>
          {IconComp && iconPos === 'right' && <IconComp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0" />}
        </h2>
      )}
      {subtitle && <p className="text-sm sm:text-base md:text-lg text-muted-foreground" style={{ ...getSubtitleStyle(settings), marginTop: subtitleGap }}>{subtitle}</p>}
    </div>
  );
};

const TextBlockSection = ({ section, style, index }: SectionProps) => {
  const s = section.settings_json || {};
  return (
    <section style={style} className="px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (index || 0) * 0.1 }} className="container-wide">
        <SectionTitle title={section.title} align={s.text_align} settings={s} />
        {s.content && (
          <div className="prose prose-sm sm:prose md:prose-lg max-w-none text-muted-foreground leading-relaxed" style={s.text_color ? { color: s.text_color } : undefined} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(s.content) }} />
        )}
      </motion.div>
    </section>
  );
};

// ── Hero Slider ──
const HeroSliderSection = ({ section }: { section: PageSection }) => {
  const s = section.settings_json || {};
  const slides: any[] = s.slides || [];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const autoplay = s.autoplay !== false;
  const speed = (s.autoplay_speed || 5) * 1000;
  const loop = s.loop !== false;
  const showArrows = s.show_arrows !== false;
  const showDots = s.show_dots !== false;
  const transition = s.transition || 'slide';
  const height = s.slide_height || 'clamp(300px, 50vw, 600px)';

  const next = useCallback(() => {
    setCurrent(p => loop ? (p + 1) % slides.length : Math.min(p + 1, slides.length - 1));
  }, [slides.length, loop]);
  const prev = useCallback(() => {
    setCurrent(p => loop ? (p - 1 + slides.length) % slides.length : Math.max(p - 1, 0));
  }, [slides.length, loop]);

  useEffect(() => {
    if (!autoplay || slides.length <= 1 || paused) return;
    const timer = setInterval(next, speed);
    return () => clearInterval(timer);
  }, [autoplay, slides.length, paused, next, speed]);

  if (slides.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative" style={{ height }}>
        {slides.map((slide, i) => (
          <div key={i} className={`absolute inset-0 ${transition === 'fade' ? 'transition-opacity duration-700' : 'transition-all duration-700'} ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            style={transition === 'slide' ? { transform: i === current ? 'translateX(0)' : i < current ? 'translateX(-100%)' : 'translateX(100%)' } : undefined}>
            {slide.image ? (
              <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary to-secondary" />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              {slide.title && <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">{slide.title}</h2>}
              {slide.subtitle && <p className="text-lg text-white/80 mb-6 max-w-2xl">{slide.subtitle}</p>}
              {slide.btn_text && slide.btn_link && (
                <Link to={slide.btn_link}><Button size="lg">{slide.btn_text}</Button></Link>
              )}
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          {showArrows && (
            <>
              <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"><ChevronRight className="w-6 h-6" /></button>
            </>
          )}
          {showDots && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

// ── Product Showcase ──
const ProductShowcaseSection = ({ section, style, products }: SectionProps & { products: DbProduct[] }) => {
  const s = section.settings_json || {};
  const limit = s.item_limit || 4;
  const source = s.product_source || 'latest';
  const selectedIds: string[] = s.selected_ids || [];

  const filtered = useMemo(() => {
    let list = [...products];
    switch (source) {
      case 'manual': list = selectedIds.map(id => products.find(p => p.id === id)).filter(Boolean) as DbProduct[]; break;
      case 'top_rated': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'best_selling': list.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
      case 'random': list.sort(() => Math.random() - 0.5); break;
      case 'category': {
        if (selectedIds.length) list = list.filter(p => p.category_id && selectedIds.includes(p.category_id));
        break;
      }
    }
    return list.slice(0, limit);
  }, [products, source, selectedIds, limit]);

  if (filtered.length === 0) return null;

  const gridId = `dpg-${section.id.slice(0, 8)}`;
  const colsD = s.cols_desktop || 4;
  const colsT = s.cols_tablet || 3;
  const colsM = s.cols_mobile || 2;

  return (
    <section style={style} className="px-4">
      <div className="container-wide">
        <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
        <div className="flex justify-end -mt-4 mb-6">
          <Link to="/products"><Button variant="ghost" className="text-muted-foreground hover:text-foreground">View All <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
        </div>
        <style>{`
          .${gridId} { display: grid; gap: 1.5rem; grid-template-columns: repeat(${colsM}, minmax(0, 1fr)); }
          @media (min-width: 768px) { .${gridId} { grid-template-columns: repeat(${colsT}, minmax(0, 1fr)); } }
          @media (min-width: 1280px) { .${gridId} { grid-template-columns: repeat(${colsD}, minmax(0, 1fr)); } }
        `}</style>
        <div className={gridId}>
          {filtered.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
};

// ── Card Section (Why Choose Us) ──
const CardSectionRenderer = ({ section, style, index }: SectionProps) => {
  const s = section.settings_json || {};
  const cards: any[] = s.cards || [];
  const layoutClass = s.layout === '2-col' ? 'grid-cols-1 sm:grid-cols-2' :
    s.layout === '3-col' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section style={style} className="px-4">
      <div className="container-wide">
        <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
        <div className={`grid ${layoutClass} gap-8`}>
          {cards.map((item: any, i: number) => {
            const IconComp = ICON_MAP[item.icon] || Award;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl bg-card border border-border card-elevated">
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
                  <div className={`mt-3 ${item.button_align === 'right' ? 'text-right' : item.button_align === 'left' ? 'text-left' : 'text-center'}`}>
                    <Link to={item.button_link || '#'} target={item.button_target || undefined} className="inline-block">
                      <Button size="sm" variant={(item.button_style as any) || 'outline'}>{item.button_text}</Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── Blog Section ──
const BlogSectionRenderer = ({ section, style, blogPosts }: SectionProps & { blogPosts: any[] }) => {
  const s = section.settings_json || {};
  const limit = s.item_limit || 3;
  const showDate = s.show_date !== false;
  const showAuthor = s.show_author !== false;
  const showExcerpt = s.show_excerpt !== false;
  const source = s.post_source || 'latest';
  const cols = s.columns || 3;
  const selectedIds: string[] = s.selected_ids || [];

  const filtered = useMemo(() => {
    let posts = [...blogPosts];
    if (source === 'category' && s.category_filter && s.category_filter !== 'all') {
      posts = posts.filter(p => p.category?.toLowerCase() === s.category_filter.toLowerCase());
    } else if (source === 'manual' && selectedIds.length > 0) {
      posts = selectedIds.map(id => blogPosts.find((p: any) => p.id === id)).filter(Boolean);
    } else if (source === 'popular') {
      posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return posts.slice(0, limit);
  }, [blogPosts, source, s.category_filter, selectedIds, limit]);

  if (filtered.length === 0) return null;

  const gridClass = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 md:grid-cols-2' : cols === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';

  return (
    <section style={style} className="px-4">
      <div className="container-wide">
        <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
        <div className="flex justify-end -mt-4 mb-6">
          <Link to="/blog"><Button variant="ghost" className="text-muted-foreground hover:text-foreground">All Posts <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
        </div>
        <div className={`grid ${gridClass} gap-8`}>
          {filtered.map((post: any, i: number) => (
            <motion.article key={post.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border overflow-hidden card-elevated">
              {post.image_url && (
                <Link to={`/blog/${post.slug}`} className="block aspect-video overflow-hidden">
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                </Link>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-secondary">{post.category}</span>
                  {showDate && <span className="text-xs text-muted-foreground">· {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </div>
                <Link to={`/blog/${post.slug}`}>
                  <h3 className="font-display font-semibold text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors">{post.title}</h3>
                </Link>
                {showExcerpt && post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>}
                {showAuthor && post.author && <p className="text-xs text-muted-foreground mt-2">By {post.author}</p>}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Testimonials Section ──
const TestimonialsSectionRenderer = ({ section, style, testimonials }: SectionProps & { testimonials: any[] }) => {
  const s = section.settings_json || {};
  const limit = s.item_limit || 6;
  const showRating = s.show_rating !== false;
  const showCompany = s.show_company !== false;
  const showArrows = s.show_arrows !== false;
  const showDots = s.show_dots !== false;
  const autoplay = s.autoplay !== false;
  const slideSpeed = (s.slide_speed || 5) * 1000;

  const cardsDesktop = s.cards_desktop || 3;
  const cardsTablet = s.cards_tablet || 2;
  const cardsMobile = s.cards_mobile || 1;

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

  const nextPage = useCallback(() => setPage(p => (p + 1) % totalPages), [totalPages]);
  const prevPage = useCallback(() => setPage(p => (p - 1 + totalPages) % totalPages), [totalPages]);

  useEffect(() => {
    if (!autoplay || items.length <= cardsPerSlide || isPaused) return;
    const timer = setInterval(nextPage, slideSpeed);
    return () => clearInterval(timer);
  }, [autoplay, items.length, cardsPerSlide, slideSpeed, nextPage, isPaused]);

  if (items.length === 0) return null;

  const startIdx = page * cardsPerSlide;
  const displayItems: any[] = [];
  for (let i = 0; i < cardsPerSlide; i++) {
    displayItems.push(items[(startIdx + i) % items.length]);
  }

  const gridClass = cardsPerSlide === 1 ? 'grid-cols-1' :
    cardsPerSlide === 2 ? 'grid-cols-1 md:grid-cols-2' :
    cardsPerSlide === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <section style={style} className="px-4">
      <div className="container-wide">
        <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
        <div className={`grid ${gridClass} gap-6`} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          {displayItems.map((item: any, i: number) => (
            <motion.div key={`${page}-${i}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center card-elevated">
              {showRating && (
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(item.rating ?? 5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-secondary text-secondary" />)}
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
            {showArrows && <Button variant="outline" size="icon" onClick={prevPage} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>}
            {showDots && Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === page ? 'bg-secondary' : 'bg-border'}`} />
            ))}
            {showArrows && <Button variant="outline" size="icon" onClick={nextPage} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>}
          </div>
        )}
      </div>
    </section>
  );
};

// ── Brand / Partner ──
const BrandPartnerRenderer = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  const logos: any[] = s.logos || [];
  const grayscale = s.grayscale;
  const hoverColor = s.hover_color;
  const sizeClass = s.logo_size === 'sm' ? 'h-8' : s.logo_size === 'lg' ? 'h-16' : 'h-10';
  const autoScroll = s.auto_scroll !== false;
  const scrollSpeed = s.scroll_speed || 3;
  const showArrows = !!s.show_scroll_arrows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const renderLogo = (logo: any, i: number) => {
    const content = logo.url ? (
      <img src={logo.url} alt={logo.name || 'Partner'}
        className={`${sizeClass} w-auto object-contain transition-all duration-300 ${grayscale ? 'grayscale' : ''} ${hoverColor ? 'hover:grayscale-0' : ''} hover:opacity-100 opacity-60`}
        loading="lazy" />
    ) : (
      <span className="text-xl font-display font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors whitespace-nowrap">{logo.name}</span>
    );
    return logo.link ? <a key={i} href={logo.link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">{content}</a> : <div key={i} className="flex-shrink-0">{content}</div>;
  };

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

  if (logos.length === 0) return (
    <section style={style} className="px-4 border-y border-border">
      <div className="container-wide"><p className="text-muted-foreground text-sm text-center">No logos added yet.</p></div>
    </section>
  );

  const marqueeId = `brand-${section.id.slice(0,6)}`;
  const marqueeStyle = autoScroll && logos.length > 3 ? `
    @keyframes ${marqueeId} { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    .${marqueeId} { animation: ${marqueeId} ${scrollSpeed * logos.length}s linear infinite; }
    .${marqueeId}:hover { animation-play-state: paused; }
  ` : '';

  return (
    <section style={style} className="px-4 border-y border-border">
      <div className="container-wide">
        <SectionTitle title={section.title} subtitle={s.subtitle} align="center" settings={s} />
        {marqueeStyle && <style>{marqueeStyle}</style>}
        <div className="relative">
          {showArrows && <button onClick={scrollLeft} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 rounded-full p-1.5 shadow-md"><ChevronLeft className="w-4 h-4" /></button>}
          <div ref={scrollRef} className="overflow-hidden">
            <div className={`flex items-center gap-8 md:gap-16 ${autoScroll && logos.length > 3 ? marqueeId : 'justify-center flex-wrap'}`}>
              {autoScroll && logos.length > 3 ? (
                <>{logos.map((l, i) => renderLogo(l, i))}{logos.map((l, i) => renderLogo(l, i + logos.length))}</>
              ) : logos.map((l, i) => renderLogo(l, i))}
            </div>
          </div>
          {showArrows && <button onClick={scrollRight} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 rounded-full p-1.5 shadow-md"><ChevronRight className="w-4 h-4" /></button>}
        </div>
      </div>
    </section>
  );
};

// ── Banner Section ──
const BannerSectionRenderer = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  const banners: any[] = (s.banners || []).filter((b: any) => {
    const now = Date.now();
    if (b.start_date && new Date(b.start_date).getTime() > now) return false;
    if (b.end_date && new Date(b.end_date).getTime() < now) return false;
    return true;
  });
  const bannerLayout = s.banner_layout || 'full';
  const bannerHeight = s.banner_height || '400px';
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    if (bannerLayout !== 'slider' || banners.length <= 1) return;
    const timer = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [bannerLayout, banners.length]);

  if (banners.length === 0) return null;

  const renderBanner = (banner: any, i: number) => {
    const alignClass = banner.text_align === 'left' ? 'text-left items-start' : banner.text_align === 'right' ? 'text-right items-end' : 'text-center items-center';
    return (
      <div key={i} className="relative overflow-hidden rounded-xl" style={{ height: bannerHeight }}>
        <img src={banner.image || '/placeholder.svg'} alt={banner.title || 'Banner'} className="w-full h-full object-cover" loading="lazy" />
        {banner.overlay_color && <div className="absolute inset-0" style={{ backgroundColor: banner.overlay_color }} />}
        <div className={`absolute inset-0 flex flex-col justify-center p-8 md:p-12 ${alignClass}`}>
          <div className="relative z-10 max-w-xl">
            {banner.title && <h2 className="text-2xl md:text-4xl font-display font-bold text-white mb-2">{banner.title}</h2>}
            {banner.subtitle && <p className="text-lg text-white/80 mb-2">{banner.subtitle}</p>}
            {banner.btn_text && <Link to={banner.btn_link || '/products'}><Button size="lg">{banner.btn_text}</Button></Link>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section style={style} className="px-4">
      <div className="container-wide">
        <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
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
      </div>
    </section>
  );
};

// ── Original section types continued ──

const FAQSection = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  const items = s.items || [];
  return (
    <section style={style} className="px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="container-wide max-w-3xl">
        <SectionTitle title={section.title} align={s.text_align} settings={s} />
        <Accordion type="single" collapsible className="space-y-3">
          {items.map((faq: any, i: number) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow">
              <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline py-5">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
};

const CardGridSection = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  const cards = s.cards || [];
  const cols = s.columns || 3;
  const gridClass = cols === 2 ? 'md:grid-cols-2' : cols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';
  return (
    <section style={style} className="px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="container-wide">
        <SectionTitle title={section.title} align={s.text_align} settings={s} />
        <div className={`grid grid-cols-1 ${gridClass} gap-6`}>
          {cards.map((card: any, i: number) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 card-elevated flex flex-col">
              {card.image && <img src={card.image} alt={card.title} className="w-full h-40 object-cover rounded-lg mb-4" loading="lazy" />}
              <div className="flex-1">
                {card.title && <h3 className="font-display font-semibold text-foreground mb-2">{card.title}</h3>}
                {card.description && <p className="text-sm text-muted-foreground">{card.description}</p>}
              </div>
              {card.button_text && card.button_link && (
                <div className={`mt-4 flex ${card.button_align === 'right' ? 'justify-end' : card.button_align === 'left' ? 'justify-start' : 'justify-center'}`}>
                  <Button variant={card.button_style || 'default'} asChild>
                    <Link to={card.button_link}>{card.button_text}</Link>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const CTABlockSection = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  return (
    <section style={{ ...style, backgroundImage: s.bg_image ? `url(${s.bg_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} className="px-4 relative">
      {s.bg_image && <div className="absolute inset-0 bg-black/50" />}
      <div className="container-wide max-w-2xl text-center relative z-10">
        <h2 className={`text-2xl md:text-3xl font-display font-bold mb-4 ${s.bg_image ? 'text-white' : 'text-foreground'}`}>{section.title}</h2>
        {s.content && <p className={`mb-6 ${s.bg_image ? 'text-white/80' : 'text-muted-foreground'}`}>{s.content}</p>}
        {s.btn_text && s.btn_link && <Button asChild size="lg"><Link to={s.btn_link}>{s.btn_text}</Link></Button>}
      </div>
    </section>
  );
};

const TeamMembersSection = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  const members = s.members || [];
  return (
    <section style={style} className="px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="container-wide">
        <SectionTitle title={section.title} align={s.text_align} settings={s} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {members.map((m: any, i: number) => (
            <div key={i} className="text-center bg-card rounded-xl border border-border p-6 card-elevated">
              {m.avatar ? (
                <img src={m.avatar} alt={m.name} className="w-20 h-20 mx-auto rounded-full object-cover mb-4" loading="lazy" />
              ) : (
                <div className="w-20 h-20 mx-auto rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl mb-4">
                  {m.name?.charAt(0) || '?'}
                </div>
              )}
              <h3 className="font-display font-semibold text-foreground">{m.name}</h3>
              {m.role && <p className="text-sm text-muted-foreground mt-1">{m.role}</p>}
              {m.bio && <p className="text-xs text-muted-foreground mt-2">{m.bio}</p>}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

const CustomHTMLSection = ({ section, style }: SectionProps) => {
  const s = section.settings_json || {};
  const sanitizedHTML = DOMPurify.sanitize(s.html_content || '');
  const containerMode = s.container_mode || 'container';
  return (
    <section style={style} className="px-4">
      <div className={containerMode === 'full_width' ? '' : 'container-wide'}>
        {section.title && <SectionTitle title={section.title} align={s.text_align} />}
        {s.enable_css && s.css_content && <style>{s.css_content}</style>}
        <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
      </div>
    </section>
  );
};

// ── Categories Section ──
const CategoriesSectionRenderer = ({ section, style, categories }: SectionProps & { categories: any[] }) => {
  const s = section.settings_json || {};
  const limit = s.item_limit || 6;
  const selectedIds: string[] = s.selected_ids || [];
  const imageFit = s.image_fit || 'cover';
  const cardBg = s.card_bg_color || '';
  const layout = s.layout || 'grid';
  const colsD = s.cols_desktop || 6;
  const colsT = s.cols_tablet || 3;
  const colsM = s.cols_mobile || 2;

  const filtered = useMemo(() => {
    let list = selectedIds.length > 0
      ? selectedIds.map(id => categories.find((c: any) => c.id === id)).filter(Boolean)
      : [...categories];
    return list.slice(0, limit);
  }, [categories, selectedIds, limit]);

  if (filtered.length === 0) return null;

  const isSlider = layout === 'slider' || layout === 'carousel' || layout === 'horizontal';

  if (isSlider) {
    return (
      <section style={style} className="px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
          <CategorySlider items={filtered} settings={s} imageFit={imageFit} cardBg={cardBg} />
        </div>
      </section>
    );
  }

  const gridId = `cat-${section.id.slice(0, 8)}`;

  return (
    <section style={style} className="px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionTitle title={section.title} subtitle={s.subtitle} align={s.text_align} settings={s} />
        <style>{`
          .${gridId} { display: grid; gap: 1rem; grid-template-columns: repeat(${colsM}, minmax(0, 1fr)); }
          @media (min-width: 768px) { .${gridId} { grid-template-columns: repeat(${colsT}, minmax(0, 1fr)); } }
          @media (min-width: 1280px) { .${gridId} { grid-template-columns: repeat(${colsD}, minmax(0, 1fr)); } }
        `}</style>
        <div className={gridId}>
          {filtered.map((cat: any, i: number) => (
            <CategoryCard key={cat.id} cat={cat} index={i} imageFit={imageFit} cardBg={cardBg} />
          ))}
        </div>
      </div>
    </section>
  );
};

const CategoryCard = ({ cat, index, imageFit, cardBg }: { cat: any; index: number; imageFit: string; cardBg: string }) => (
  <motion.div custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }}
    variants={{ hidden: { opacity: 0, y: 30 }, visible: (idx: number) => ({ opacity: 1, y: 0, transition: { delay: idx * 0.08, duration: 0.5 } }) }}>
    <Link to={`/products?category=${cat.slug}`} className="group block">
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300" style={cardBg ? { backgroundColor: cardBg } : undefined}>
        <img src={cat.image_url || '/placeholder.svg'} alt={cat.name}
          className={`w-full h-full transition-transform duration-500 group-hover:scale-110 ${imageFit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
          loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="font-display font-semibold text-sm sm:text-base text-white drop-shadow-md">{cat.name}</h3>
        </div>
      </div>
    </Link>
  </motion.div>
);

const CategorySlider = ({ items, settings, imageFit, cardBg }: { items: any[]; settings: any; imageFit: string; cardBg: string }) => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoplay = settings.slider_autoplay !== false;
  const speed = (settings.slider_speed || 4) * 1000;
  const loop = settings.slider_loop !== false;
  const showArrows = settings.slider_arrows !== false;
  const showDots = settings.slider_dots !== false;
  const perViewD = settings.slider_per_view_desktop || 5;
  const perViewT = settings.slider_per_view_tablet || 3;
  const perViewM = settings.slider_per_view_mobile || 2;
  const gap = 16;

  const [perView, setPerView] = useState(perViewD);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerView(w >= 1280 ? perViewD : w >= 768 ? perViewT : perViewM);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [perViewD, perViewT, perViewM]);

  // For seamless loop, prepend + append cloned items
  const cloneCount = perView;
  const extendedItems = loop
    ? [...items.slice(-cloneCount), ...items, ...items.slice(0, cloneCount)]
    : items;
  const startIndex = loop ? cloneCount : 0;

  // Initialize position to startIndex
  useEffect(() => {
    setCurrent(startIndex);
    setIsTransitioning(false);
    requestAnimationFrame(() => setIsTransitioning(true));
  }, [startIndex, items.length]);

  const maxReal = items.length - 1;

  const next = useCallback(() => {
    setIsTransitioning(true);
    setCurrent(p => p + 1);
  }, []);

  const prev = useCallback(() => {
    setIsTransitioning(true);
    setCurrent(p => p - 1);
  }, []);

  // Handle seamless reset after transition ends
  const handleTransitionEnd = useCallback(() => {
    if (!loop) return;
    if (current >= startIndex + items.length) {
      setIsTransitioning(false);
      setCurrent(startIndex);
    } else if (current < startIndex) {
      setIsTransitioning(false);
      setCurrent(startIndex + items.length - 1);
    }
  }, [current, startIndex, items.length, loop]);

  // Re-enable transition after instant reset
  useEffect(() => {
    if (!isTransitioning) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsTransitioning(true));
      });
    }
  }, [isTransitioning]);

  useEffect(() => {
    if (!autoplay || items.length <= perView || paused) return;
    const timer = setInterval(next, speed);
    return () => clearInterval(timer);
  }, [autoplay, items.length, perView, paused, next, speed]);

  const itemWidthPercent = 100 / perView;
  const gapOffset = gap * (perView - 1) / perView;
  const slideWidth = `calc(${itemWidthPercent}% - ${gapOffset}px)`;
  const translateVal = `calc(-${current * itemWidthPercent}% - ${current * gap}px + ${current * gapOffset}px)`;

  const realIndex = loop
    ? ((current - startIndex) % items.length + items.length) % items.length
    : current;

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className={`flex ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
          style={{ transform: `translateX(${translateVal})`, gap: `${gap}px` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extendedItems.map((cat: any, i: number) => (
            <div key={`slide-${i}`} className="flex-shrink-0" style={{ width: slideWidth }}>
              <CategoryCard cat={cat} index={i} imageFit={imageFit} cardBg={cardBg} />
            </div>
          ))}
        </div>
      </div>
      {items.length > perView && showArrows && (
        <>
          <button onClick={prev} className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 bg-card border border-border hover:bg-muted text-foreground rounded-full p-1.5 shadow-md transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 bg-card border border-border hover:bg-muted text-foreground rounded-full p-1.5 shadow-md transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      {items.length > perView && showDots && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: items.length }).map((_, i) => (
            <button key={i} onClick={() => { setIsTransitioning(true); setCurrent(startIndex + i); }} className={`w-2 h-2 rounded-full transition-colors ${i === realIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

const SpacerSection = ({ section }: { section: PageSection }) => {
  const s = section.settings_json || {};
  return (
    <div style={{ height: `${s.height || 48}px` }} className="relative">
      {s.show_divider && <div className="absolute top-1/2 left-0 right-0 border-t border-border" />}
    </div>
  );
};

export default DynamicPageSections;
