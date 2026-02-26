import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useBlogPosts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Clock, User, Calendar, ArrowRight, Search, ChevronDown } from 'lucide-react';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import DynamicPageSections from '@/components/DynamicPageSections';
import { useHeroVisible } from '@/hooks/useHeroVisible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POSTS_PER_PAGE = 9;

const readingTime = (content: string | null) => {
  if (!content) return '1 min read';
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const Blog = () => {
  const { data: allPosts = [], isLoading } = useBlogPosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category') || '';
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: extraSections = [] } = usePageSectionsBySlug('blog');
  const { data: heroVisible = true } = useHeroVisible('blog');
  const enabledSections = extraSections.filter((s: any) => s.is_enabled);

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = allPosts.map((p: any) => p.category).filter(Boolean);
    return [...new Set(cats)] as string[];
  }, [allPosts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (categoryFilter) {
      posts = posts.filter((p: any) => p.category === categoryFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      posts = posts.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(term) ||
          p.excerpt?.toLowerCase().includes(term)
      );
    }
    return posts;
  }, [allPosts, categoryFilter, searchTerm]);

  const clearCategory = () => {
    setSearchParams({});
    setPage(1);
  };

  const selectCategory = (cat: string) => {
    setSearchParams({ category: cat });
    setPage(1);
  };

  // Featured post (first post, only on page 1 with no filters)
  const showFeatured = page === 1 && !categoryFilter && !searchTerm.trim();
  const featuredPost = showFeatured ? filteredPosts[0] : null;
  const remainingPosts = showFeatured ? filteredPosts.slice(1) : filteredPosts;

  const totalPages = Math.ceil(remainingPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = remainingPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);

  // Recent posts for sidebar
  const recentPosts = allPosts.slice(0, 5);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return (
      <div className="flex items-center justify-center gap-1 mt-12">
        <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              className="min-w-[2.25rem]"
              onClick={() => setPage(p as number)}
            >
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      {/* Hero Section */}
      {heroVisible && (
        <section className="hero-gradient py-20 px-4">
          <div className="container-wide text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground mb-4">
              Blog & Articles
            </h1>
            <p className="text-lg text-primary-foreground/70 max-w-2xl mx-auto">
              Insights, recipes, tips, and industry knowledge to keep you inspired
            </p>
          </div>
        </section>
      )}

      {/* Featured Post */}
      {!isLoading && featuredPost && (
        <section className="hidden lg:block py-12 px-4 md:px-8 bg-background">
          <div className="container-wide">
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group grid grid-cols-1 lg:grid-cols-2 gap-0 bg-card rounded-2xl overflow-hidden border border-border card-elevated"
            >
              <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                <img
                  src={featuredPost.image_url || '/placeholder.svg'}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    Featured
                  </span>
                  {featuredPost.category && (
                    <span className="text-xs font-medium text-secondary uppercase tracking-wider">
                      {featuredPost.category}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4 group-hover:text-primary transition-colors line-clamp-3">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {featuredPost.author || 'Admin'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(featuredPost.created_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {readingTime(featuredPost.content)}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section className="py-12 px-4 md:px-8 bg-background">
        <div className="container-wide">
      {/* Mobile Search + Category Bar */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 h-10"
              />
            </div>
            {categories.length > 0 && (
              <Select
                value={categoryFilter || 'all'}
                onValueChange={(v) => { if (v === 'all') clearCategory(); else selectCategory(v); }}
              >
                <SelectTrigger className="w-[140px] shrink-0 h-10">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posts</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
            {/* Posts Grid */}
            <div>
              {/* Active Filter Badge */}
              {categoryFilter && (
                <div className="flex items-center gap-2 mb-8">
                  <span className="text-sm text-muted-foreground">Showing:</span>
                  <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full">
                    {categoryFilter}
                    <button onClick={clearCategory} className="ml-1 hover:text-primary/70 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="aspect-[16/10] rounded-xl" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : paginatedPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No posts found.</p>
                  {(categoryFilter || searchTerm) && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => { clearCategory(); setSearchTerm(''); }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {paginatedPosts.map((post: any) => (
                      <article
                        key={post.id}
                        className="group bg-card rounded-xl border border-border overflow-hidden card-elevated flex flex-col"
                      >
                        <Link to={`/blog/${post.slug}`} className="block aspect-[16/10] overflow-hidden">
                          <img
                            src={post.image_url || '/placeholder.svg'}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </Link>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            {post.category && (
                              <button
                                onClick={(e) => { e.preventDefault(); selectCategory(post.category); }}
                                className="text-xs font-semibold text-secondary uppercase tracking-wider hover:text-primary transition-colors"
                              >
                                {post.category}
                              </button>
                            )}
                            <span className="text-xs text-muted-foreground">
                              · {formatDate(post.created_at)}
                            </span>
                          </div>
                          <Link to={`/blog/${post.slug}`}>
                            <h2 className="text-lg font-display font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {post.title}
                            </h2>
                          </Link>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1 leading-relaxed">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {post.author || 'Admin'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {readingTime(post.content)}
                              </span>
                            </div>
                            <Link
                              to={`/blog/${post.slug}`}
                              className="text-xs font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all"
                            >
                              Read <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {renderPagination()}
                </>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
              {/* Search */}
              <div className="hidden lg:block bg-card rounded-xl border border-border p-5">
                <h3 className="font-display font-bold text-foreground mb-3 text-sm uppercase tracking-wider">Search</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="hidden lg:block bg-card rounded-xl border border-border p-5">
                  <h3 className="font-display font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Categories</h3>
                  <ul className="space-y-1">
                    <li>
                      <button
                        onClick={clearCategory}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          !categoryFilter
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        All Posts
                        <span className="float-right text-xs text-muted-foreground">{allPosts.length}</span>
                      </button>
                    </li>
                    {categories.map((cat) => {
                      const count = allPosts.filter((p: any) => p.category === cat).length;
                      return (
                        <li key={cat}>
                          <button
                            onClick={() => selectCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              categoryFilter === cat
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            {cat}
                            <span className="float-right text-xs text-muted-foreground">{count}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Recent Posts */}
              {recentPosts.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-display font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Recent Posts</h3>
                  <ul className="space-y-4">
                    {recentPosts.map((post: any) => (
                      <li key={post.id}>
                        <Link to={`/blog/${post.slug}`} className="flex gap-3 group">
                          <img
                            src={post.image_url || '/placeholder.svg'}
                            alt={post.title}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                              {post.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {enabledSections.length > 0 && <DynamicPageSections sections={enabledSections} />}
    </Layout>
  );
};

export default Blog;
