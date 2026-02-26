import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import { useCurrency } from '@/hooks/useCurrency';
import type { DbProduct } from '@/hooks/useProducts';
import VariantSelectionModal from './VariantSelectionModal';

const ProductCard = ({ product }: { product: DbProduct }) => {
  const hasDiscount = product.discount_price && product.discount_price < product.regular_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.regular_price - product.discount_price!) / product.regular_price) * 100)
    : 0;
  const price = hasDiscount ? product.discount_price! : product.regular_price;
  const { addToCart } = useCart();
  const { data: settings } = useSettings();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [variantModal, setVariantModal] = useState(false);
  const [variantAction, setVariantAction] = useState<'cart' | 'buy'>('cart');

  const variations = Array.isArray(product.variations) ? product.variations : [];
  const hasVariants = variations.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      setVariantAction('cart');
      setVariantModal(true);
    } else {
      addToCart.mutate({ productId: product.id });
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      setVariantAction('buy');
      setVariantModal(true);
    } else {
      navigate('/checkout', {
        state: {
          buyNowItem: {
            product_id: product.id,
            title: product.title,
            image_url: product.image_url,
            quantity: 1,
            price,
          },
        },
      });
    }
  };

  return (
    <>
      <div className="group bg-card rounded-xl border border-border overflow-hidden card-elevated flex flex-col">
        <Link to={`/products/${product.slug}`} className="block relative overflow-hidden aspect-square">
          <img
            src={product.image_url || '/placeholder.svg'}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
              -{discountPercent}%
            </span>
          )}
          {product.stock_status === 'low_stock' && (
            <span className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
              Low Stock
            </span>
          )}
        </Link>

        <div className="p-2.5 sm:p-4 flex flex-col flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{product.category?.name ?? ''}</p>
          <Link to={`/products/${product.slug}`}>
            <h3 className="font-display font-semibold text-foreground text-xs sm:text-sm mb-0.5 sm:mb-1 group-hover:text-secondary transition-colors line-clamp-1">
              {product.title}
            </h3>
          </Link>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-3 line-clamp-2 hidden sm:block">{product.short_description}</p>

          <div className="flex items-center gap-0.5 mb-1.5 sm:mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${i < Math.floor(product.rating ?? 0) ? 'fill-secondary text-secondary' : 'text-border'}`} />
            ))}
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">({product.review_count ?? 0})</span>
          </div>

          <div className="flex items-baseline gap-1 sm:gap-2 mb-2 sm:mb-4 mt-auto">
            <span className="text-sm sm:text-lg font-bold text-foreground">{formatPrice(price, 0)}</span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-sm text-muted-foreground line-through">{formatPrice(product.regular_price, 0)}</span>
            )}
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-sm sm:text-sm h-10 sm:h-10 px-2 sm:px-3 py-2.5 sm:py-2" onClick={handleAddToCart} disabled={addToCart.isPending}>
              <ShoppingCart className="w-4 h-4 sm:mr-1 shrink-0" /> <span className="hidden sm:inline">Cart</span>
            </Button>
            {settings?.buy_now_enabled !== false && (
              <Button size="sm" className="flex-1 text-sm sm:text-sm h-10 sm:h-10 px-2 sm:px-3 py-2.5 sm:py-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBuyNow}>
                <Zap className="w-4 h-4 mr-1 shrink-0 hidden sm:inline-block" /> <span>Buy Now</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasVariants && (
        <VariantSelectionModal
          product={product}
          open={variantModal}
          onOpenChange={setVariantModal}
          action={variantAction}
        />
      )}
    </>
  );
};

export default ProductCard;
