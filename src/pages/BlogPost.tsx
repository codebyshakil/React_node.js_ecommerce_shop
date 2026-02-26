import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Layout from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Calendar, User, Tag, Clock, ShoppingCart } from 'lucide-react';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import DynamicPageSections from '@/components/DynamicPageSections';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { useSettings } from '@/hooks/useSettings';

const BlogPost = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();
  const { data: settings } = useSettings();
  const { data: pageSections = [] } = usePageSectionsBySlug('single-post');

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog_post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: blogCategories = [] } = useQuery({
    queryKey: ['blog_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('category')
        .eq('is_published', true);
      if (error) throw error;
      const cats = [...new Set((data || []).map((p: any) => p.category).filter(Boolean))];
      return cats.sort();
    },
  });

  const { data: recentPosts = [] } = useQuery({
    queryKey: ['recent_blog_posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, created_at, image_url, category, author')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch random products for ad section
  const { data: randomProducts = [] } = useQuery({
    queryKey: ['blog_random_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, slug, image_url, regular_price, discount_price')
        .eq('is_active', true)
        .limit(6);
      if (error) throw error;
      // Shuffle for randomness
      return (data ?? []).sort(() => Math.random() - 0.5);
    },
  });

  const otherPosts = recentPosts.filter(rp => rp.slug !== slug);
  const sidebarRecent = otherPosts.slice(0, 5);
  const belowRecent = otherPosts.slice(0, 6);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formatShortDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const readingTime = (content: string | null) => {
    if (!content) return '1 min read';
    const words = content.split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  if (isLoading) return (
    <Layout>
      <div className="section-padding">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-60 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  if (!post) {
    return (
      <Layout>
        <div className="section-padding text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Post not found</h1>
          <Link to="/blog" className="text-primary mt-4 inline-block hover:underline">← Back to Blog</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b border-border py-3 px-4">
        <div className="container-wide flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          {post.category && (
            <>
              <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-foreground transition-colors">{post.category}</Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground line-clamp-1">{post.title}</span>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-8 md:py-12 px-4 md:px-8 bg-background">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Article - 2/3 width */}
            <article className="lg:col-span-2 min-w-0">
              {/* Category & Meta */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {post.category && (
                  <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
                    <Tag className="w-3 h-3" /> {post.category}
                  </Link>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" /> {formatDate(post.created_at)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" /> {readingTime(post.content)}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4 leading-tight">
                {post.title}
              </h1>

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-2 mb-6 pb-6 border-b border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{post.author}</p>
                    <p className="text-xs text-muted-foreground">Author</p>
                  </div>
                </div>
              )}

              {/* Featured Image */}
              {post.image_url && (
                <div className="aspect-video rounded-xl overflow-hidden mb-8 border border-border">
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Content */}
              <div className="prose prose-lg max-w-none text-foreground leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || post.excerpt || '') }} />

              {/* Tags / Share bar */}
              <div className="border-t border-b border-border py-4 mb-8 flex flex-wrap items-center gap-3">
                {post.category && (
                  <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                    #{post.category}
                  </Link>
                )}
                <Link to="/blog" className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                  #Blog
                </Link>
              </div>

              {/* Random Products Ad Strip */}
              {randomProducts.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-display font-semibold text-foreground mb-4 text-lg">You May Also Like</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {randomProducts.slice(0, 3).map((p: any) => {
                      const hasDiscount = p.discount_price && p.discount_price < p.regular_price;
                      const price = hasDiscount ? p.discount_price : p.regular_price;
                      return (
                        <Link key={p.id} to={`/products/${p.slug}`} className="group bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow">
                          <div className="aspect-square overflow-hidden">
                            <img src={p.image_url || '/placeholder.svg'} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{p.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-foreground">{formatPrice(price ?? 0, 2)}</span>
                              {hasDiscount && <span className="text-xs text-muted-foreground line-through">{formatPrice(p.regular_price ?? 0, 2)}</span>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Posts Below Article */}
              {belowRecent.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-display font-semibold text-foreground mb-5 text-xl border-b border-border pb-3">Recent Posts</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {belowRecent.map((rp: any) => (
                      <Link key={rp.id} to={`/blog/${rp.slug}`} className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                        {rp.image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img src={rp.image_url} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          </div>
                        )}
                        <div className="p-4">
                          {rp.category && <span className="text-xs text-primary font-medium">{rp.category}</span>}
                          <h4 className="text-sm font-semibold text-foreground line-clamp-2 mt-1 group-hover:text-primary transition-colors">{rp.title}</h4>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatShortDate(rp.created_at)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Right Sidebar - 1/3 width */}
            <aside className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">

                {/* Categories Widget */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3 pb-2 border-b border-border text-base">Categories</h3>
                  <div className="space-y-1">
                    <Link to="/blog" className="flex items-center justify-between px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors">
                      All Posts
                    </Link>
                    {blogCategories.map((cat: string) => (
                      <Link
                        key={cat}
                        to={`/blog?category=${encodeURIComponent(cat)}`}
                        className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${post?.category === cat ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recent Posts Widget */}
                {sidebarRecent.length > 0 && (
                  <div className="bg-card rounded-xl border border-border p-5">
                    <h3 className="font-display font-semibold text-foreground mb-3 pb-2 border-b border-border text-base">Recent Posts</h3>
                    <div className="space-y-4">
                      {sidebarRecent.map((rp: any) => (
                        <Link key={rp.id} to={`/blog/${rp.slug}`} className="flex gap-3 group">
                          {rp.image_url ? (
                            <img src={rp.image_url} alt={rp.title} className="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                              <Tag className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">{rp.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {formatShortDate(rp.created_at)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Ad Widget */}
                {randomProducts.length > 0 && (
                  <div className="bg-card rounded-xl border border-border p-5">
                    <h3 className="font-display font-semibold text-foreground mb-3 pb-2 border-b border-border text-base">Featured Products</h3>
                    <div className="space-y-4">
                      {randomProducts.slice(3, 6).map((p: any) => {
                        const hasDiscount = p.discount_price && p.discount_price < p.regular_price;
                        const price = hasDiscount ? p.discount_price : p.regular_price;
                        return (
                          <Link key={p.id} to={`/products/${p.slug}`} className="flex gap-3 group">
                            <img src={p.image_url || '/placeholder.svg'} alt={p.title} className="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">{p.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-bold text-primary">{formatPrice(price ?? 0, 2)}</span>
                                {hasDiscount && <span className="text-xs text-muted-foreground line-through">{formatPrice(p.regular_price ?? 0, 2)}</span>}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Dynamic Page Sections from Admin */}
      {pageSections.length > 0 && (
        <DynamicPageSections sections={pageSections} />
      )}
    </Layout>
  );
};

export default BlogPost;
