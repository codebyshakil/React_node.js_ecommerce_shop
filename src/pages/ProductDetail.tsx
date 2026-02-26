import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/SEOHead';
import { useProduct } from '@/hooks/useProducts';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import DynamicPageSections from '@/components/DynamicPageSections';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageContent } from '@/hooks/usePageContent';
import { Star, ShoppingCart, Zap, ChevronRight, Minus, Plus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug ?? '');
  const { addToCart } = useCart();
  const { data: settings } = useSettings();
  const { formatPrice, code: currencyCode } = useCurrency();
  const { data: whatsappNumber } = usePageContent('whatsapp_number');
  const { data: whatsappBtnText } = usePageContent('whatsapp_button_text');
  const navigate = useNavigate();
  const { data: pageSections = [] } = usePageSectionsBySlug('single-product');
  const [qty, setQty] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  if (isLoading) return <Layout><div className="section-padding"><div className="container-wide"><Skeleton className="h-96 rounded-2xl" /></div></div></Layout>;

  if (!product) {
    return (
      <Layout>
        <div className="section-padding text-center">
          <h1 className="text-2xl font-display font-bold text-foreground">Product not found</h1>
          <Link to="/products" className="text-secondary mt-4 inline-block">Back to Products</Link>
        </div>
      </Layout>
    );
  }

  const hasDiscount = product.discount_price && product.discount_price < product.regular_price;
  const price = hasDiscount ? product.discount_price! : product.regular_price;
  const variations = Array.isArray(product.variations) ? product.variations : [];
  const variationData = Object.keys(selectedVariations).length > 0 ? selectedVariations : null;

  const handleAddToCart = () => {
    addToCart.mutate({ productId: product.id, quantity: qty, variation: variationData });
  };

  const handleBuyNow = () => {
    navigate('/checkout', {
      state: {
        buyNowItem: {
          product_id: product.id,
          title: product.title,
          image_url: product.image_url,
          quantity: qty,
          price,
          variation: variationData,
        },
      },
    });
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.short_description || '',
    image: product.image_url || '/placeholder.svg',
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currencyCode,
      availability: product.stock_status === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
    ...(product.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.review_count || 1 } } : {}),
  };

  return (
    <Layout>
      <SEOHead
        title={product.title}
        description={product.short_description || product.description?.slice(0, 155) || `Buy ${product.title}`}
        ogImage={product.image_url || undefined}
        type="product"
        jsonLd={jsonLd}
      />
      <div className="bg-muted/30 border-b border-border py-3 px-4">
        <div className="container-wide flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/products" className="hover:text-foreground transition-colors">Products</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{product.title}</span>
        </div>
      </div>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
              <img src={product.image_url || '/placeholder.svg'} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
            </div>

            <div>
              <p className="text-sm text-secondary font-medium mb-2">{product.category?.name}</p>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">{product.title}</h1>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating ?? 0) ? 'fill-secondary text-secondary' : 'text-border'}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">({product.review_count ?? 0} reviews)</span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold text-foreground">{formatPrice(price, 2)}</span>
                {hasDiscount && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.regular_price, 2)}</span>}
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">{product.short_description || product.description}</p>

              {variations.map((v: any) => (
                <div key={v.type} className="mb-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">{v.type}</label>
                  <div className="flex flex-wrap gap-2">
                    {(v.options ?? []).map((opt: any) => {
                      const optValue = typeof opt === 'string' ? opt : opt.value;
                      const priceDiff = typeof opt === 'object' ? opt.price_diff : undefined;
                      const optStock = typeof opt === 'object' ? opt.stock : undefined;
                      const isSelected = selectedVariations[v.type] === optValue;
                      return (
                        <button key={optValue} onClick={() => setSelectedVariations((prev) => ({ ...prev, [v.type]: optValue }))}
                          className={`px-4 py-2 rounded-lg border text-sm transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'} ${optStock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={optStock === 0}>
                          {optValue}
                          {priceDiff ? ` (${priceDiff > 0 ? '+' : ''}${formatPrice(priceDiff)})` : ''}
                          {optStock === 0 && ' - Out of Stock'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mb-6">
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${product.stock_status === 'in_stock' ? 'text-green-600' : product.stock_status === 'low_stock' ? 'text-secondary' : 'text-destructive'}`}>
                  <span className={`w-2 h-2 rounded-full ${product.stock_status === 'in_stock' ? 'bg-green-500' : product.stock_status === 'low_stock' ? 'bg-secondary' : 'bg-destructive'}`} />
                  {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-foreground">Quantity</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-muted transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{qty}</span>
                  <button onClick={() => setQty(qty + 1)} className="p-2 hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-row gap-3">
                  <Button size="lg" variant="outline" className="flex-1 py-3" onClick={handleAddToCart} disabled={addToCart.isPending}>
                    <ShoppingCart className="w-4 h-4 mr-2" /> {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
                  </Button>
                  {settings?.buy_now_enabled !== false && (
                    <Button size="lg" className="flex-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBuyNow}>
                      <Zap className="w-4 h-4 mr-2" /> Buy Now
                    </Button>
                  )}
                </div>
                {(settings as any)?.whatsapp_enabled && whatsappNumber && typeof whatsappNumber === 'string' && (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I'm interested in: ${product.title} (${window.location.href})`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button size="lg" className="w-full bg-[#25D366] hover:bg-[#1da851] text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      {typeof whatsappBtnText === 'string' && whatsappBtnText ? whatsappBtnText : 'Order via WhatsApp'}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Full Description Tab Section */}
          {product.description && (
            <div className="mt-4 border border-border rounded-xl overflow-hidden">
              <div className="flex border-b border-border">
                <button className="px-6 py-3 text-sm font-semibold text-primary border-b-2 border-primary bg-background">
                  Description
                </button>
              </div>
              <div className="p-6 bg-card text-muted-foreground leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }} />
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Page Sections from Admin */}
      {pageSections.length > 0 && (
        <DynamicPageSections sections={pageSections} />
      )}
    </Layout>
  );
};

export default ProductDetail;
