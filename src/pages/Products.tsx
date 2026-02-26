import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/ProductCard';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import DynamicPageSections from '@/components/DynamicPageSections';
import { useHeroVisible } from '@/hooks/useHeroVisible';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const PRODUCTS_PER_PAGE = 12;

const getPriceRanges = (symbol: string) => [
  { label: 'All Prices', min: '', max: '' },
  { label: `Under ${symbol}500`, min: '', max: '500' },
  { label: `${symbol}500 - ${symbol}1000`, min: '500', max: '1000' },
  { label: `${symbol}1000 - ${symbol}2000`, min: '1000', max: '2000' },
  { label: `${symbol}2000 - ${symbol}5000`, min: '2000', max: '5000' },
  { label: `Over ${symbol}5000`, min: '5000', max: '' },
];

const Products = () => {
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFilter);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const { symbol: currencySymbol } = useCurrency();
  const { data: allProducts = [], isLoading: productsLoading } = useProducts(selectedCategory);
  const { data: categories = [] } = useCategories();
  const { data: extraSections = [] } = usePageSectionsBySlug('products');
  const { data: heroVisible = true } = useHeroVisible('products');

  const PRICE_RANGES = useMemo(() => getPriceRanges(currencySymbol), [currencySymbol]);
  const enabledSections = extraSections.filter(s => s.is_enabled);

  const selectedPriceLabel = PRICE_RANGES.find(r => r.min === priceMin && r.max === priceMax)?.label || 'All Prices';

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.short_description || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    const min = priceMin ? parseFloat(priceMin) : null;
    const max = priceMax ? parseFloat(priceMax) : null;
    if (min !== null) result = result.filter(p => (p.discount_price ?? p.regular_price) >= min);
    if (max !== null) result = result.filter(p => (p.discount_price ?? p.regular_price) <= max);
    switch (sortBy) {
      case 'newest': break;
      case 'best_selling': result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
      case 'top_rated': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'price_low': result.sort((a, b) => (a.discount_price ?? a.regular_price) - (b.discount_price ?? b.regular_price)); break;
      case 'price_high': result.sort((a, b) => (b.discount_price ?? b.regular_price) - (a.discount_price ?? a.regular_price)); break;
    }
    return result;
  }, [allProducts, searchQuery, sortBy, priceMin, priceMax]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  const handleCategoryChange = (slug: string | null) => {
    setSelectedCategory(slug);
    setPage(1);
  };

  const handlePriceRange = (min: string, max: string) => {
    setPriceMin(min);
    setPriceMax(max);
    setPage(1);
  };

  const hasActiveFilters = searchQuery || sortBy !== 'newest' || priceMin || priceMax || selectedCategory;
  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('newest');
    setPriceMin('');
    setPriceMax('');
    setSelectedCategory(null);
    setPage(1);
  };

  const CategoryList = () => (
    <div className="space-y-1">
      <button onClick={() => handleCategoryChange(null)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
        All Products
      </button>
      {categories.map((cat: any) => (
        <button key={cat.id} onClick={() => handleCategoryChange(cat.slug)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === cat.slug ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
          {cat.name}
        </button>
      ))}
    </div>
  );

  return (
    <Layout>
      <SEOHead title="Products" description="Browse our premium quality products sourced from around the world." />

      {heroVisible && (
        <section className="hero-gradient py-8 px-4">
          <div className="container-wide text-center">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">Our Products</h1>
            <p className="mt-3 text-primary-foreground/70">Premium quality products sourced from around the world</p>
          </div>
        </section>
      )}

      <section className="section-padding bg-background">
        <div className="container-wide">
          {/* Desktop layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Sidebar - Categories only */}
            <aside className="hidden lg:block lg:w-64 shrink-0">
              <div className="bg-card rounded-xl border border-border p-5 sticky top-32">
                <h3 className="font-display font-semibold text-foreground mb-3">Categories</h3>
                <CategoryList />
              </div>
            </aside>

            <div className="flex-1">
              {/* Search + Filter toolbar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    className="pl-10 h-10"
                  />
                </div>

                {/* Filter dropdown - right */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 relative">
                      <SlidersHorizontal className="w-4 h-4" />
                      {hasActiveFilters && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-4 space-y-4">
                    {/* Sort */}
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-2 text-sm">Sort By</h3>
                      <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">New Arrivals</SelectItem>
                          <SelectItem value="best_selling">Best Selling</SelectItem>
                          <SelectItem value="top_rated">Top Rated</SelectItem>
                          <SelectItem value="price_low">Price: Low to High</SelectItem>
                          <SelectItem value="price_high">Price: High to Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Price Range */}
                    <div>
                      <h3 className="font-display font-semibold text-foreground mb-2 text-sm">Price Range</h3>
                      <div className="flex gap-2 items-center">
                        <Input type="number" placeholder="Min" value={priceMin} onChange={e => { setPriceMin(e.target.value); setPage(1); }} className="h-9 text-sm" />
                        <span className="text-muted-foreground text-sm">—</span>
                        <Input type="number" placeholder="Max" value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1); }} className="h-9 text-sm" />
                      </div>
                    </div>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3 mr-1" /> Clear All Filters
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{filteredProducts.length} products found</p>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground text-xs">
                    <X className="w-3 h-3 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">{searchQuery ? 'No products match your search.' : 'No products found.'}</p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">Clear Filters</Button>
                  )}
                </div>
              ) : (
                <>
                  <motion.div layout className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </motion.div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" onClick={() => setPage(p)} className="w-10 h-10">
                          {p}
                        </Button>
                      ))}
                      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {enabledSections.length > 0 && <DynamicPageSections sections={enabledSections} />}
    </Layout>
  );
};

export default Products;
