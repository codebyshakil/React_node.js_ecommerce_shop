import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import { useCurrency } from '@/hooks/useCurrency';
import { ShoppingCart, Zap, Minus, Plus } from 'lucide-react';
import type { DbProduct } from '@/hooks/useProducts';

interface Props {
  product: DbProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'cart' | 'buy';
}

const VariantSelectionModal = ({ product, open, onOpenChange, action }: Props) => {
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [validationError, setValidationError] = useState('');
  const { addToCart } = useCart();
  const { data: settings } = useSettings();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const variations = Array.isArray(product.variations) ? product.variations : [];
  const hasDiscount = product.discount_price && product.discount_price < product.regular_price;
  const basePrice = hasDiscount ? product.discount_price! : product.regular_price;

  // Calculate price with variation diffs
  const priceDiff = variations.reduce((acc: number, v: any) => {
    const selected = selectedVariations[v.type];
    if (!selected) return acc;
    const opt = (v.options ?? []).find((o: any) => (typeof o === 'string' ? o : o.value) === selected);
    if (opt && typeof opt === 'object' && opt.price_diff) return acc + Number(opt.price_diff);
    return acc;
  }, 0);
  const finalPrice = basePrice + priceDiff;

  const validate = () => {
    for (const v of variations) {
      if (!selectedVariations[v.type]) {
        setValidationError(`Please select ${v.type}`);
        return false;
      }
    }
    setValidationError('');
    return true;
  };

  const variationData = Object.keys(selectedVariations).length > 0 ? selectedVariations : null;

  const handleAddToCart = () => {
    if (!validate()) return;
    addToCart.mutate({ productId: product.id, quantity: qty, variation: variationData });
    onOpenChange(false);
  };

  const handleBuyNow = () => {
    if (!validate()) return;
    onOpenChange(false);
    navigate('/checkout', {
      state: {
        buyNowItem: {
          product_id: product.id,
          title: product.title,
          image_url: product.image_url,
          quantity: qty,
          price: finalPrice,
          variation: variationData,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">Select Options</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <img
            src={product.image_url || '/placeholder.svg'}
            alt={product.title}
            className="w-24 h-24 rounded-lg object-cover border border-border shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2">{product.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.short_description}</p>
            <p className="text-lg font-bold text-foreground mt-2">{formatPrice(finalPrice, 2)}</p>
          </div>
        </div>

        {/* Variant selections */}
        {variations.map((v: any) => (
          <div key={v.type} className="mb-3">
            <label className="text-sm font-medium text-foreground mb-2 block">{v.type} *</label>
            <div className="flex flex-wrap gap-2">
              {(v.options ?? []).map((opt: any) => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const pDiff = typeof opt === 'object' ? opt.price_diff : undefined;
                const optStock = typeof opt === 'object' ? opt.stock : undefined;
                const isSelected = selectedVariations[v.type] === optValue;
                return (
                  <button
                    key={optValue}
                    onClick={() => {
                      setSelectedVariations((prev) => ({ ...prev, [v.type]: optValue }));
                      setValidationError('');
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'} ${optStock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={optStock === 0}
                  >
                    {optValue}
                    {pDiff ? ` (${pDiff > 0 ? '+' : ''}${formatPrice(pDiff)})` : ''}
                    {optStock === 0 && ' - Out'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <div className="flex items-center border border-border rounded-lg">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-muted transition-colors"><Minus className="w-4 h-4" /></button>
            <span className="px-3 py-1 text-sm font-medium min-w-[2.5rem] text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="p-2 hover:bg-muted transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
        </div>

        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={handleAddToCart} disabled={addToCart.isPending}>
            <ShoppingCart className="w-4 h-4 mr-1" /> Add to Cart
          </Button>
          {settings?.buy_now_enabled !== false && (
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleBuyNow}>
              <Zap className="w-4 h-4 mr-1" /> Buy Now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VariantSelectionModal;
