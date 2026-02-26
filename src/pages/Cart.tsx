import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

const Cart = () => {
const { cart, cartTotal, isLoading, updateQuantity, removeItem, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  return (
    <Layout>
      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">Shopping Cart</h1>
        </div>
      </section>
      <section className="section-padding bg-background">
        <div className="container-wide max-w-4xl">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading cart...</p>
          ) : cart.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Link to="/products"><Button>Browse Products</Button></Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item: any) => (
                <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                  <img src={item.product?.image_url || '/placeholder.svg'} alt={item.product?.title} className="w-20 h-20 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.product?.slug}`} className="font-display font-semibold text-foreground hover:text-secondary line-clamp-1">{item.product?.title}</Link>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.product?.discount_price ?? item.product?.regular_price ?? 0, 2)} each</p>
                  </div>
                  <div className="flex items-center border border-border rounded-lg">
                    <button onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity - 1 })} className="p-2 hover:bg-muted"><Minus className="w-3 h-3" /></button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity + 1 })} className="p-2 hover:bg-muted"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="font-bold text-foreground min-w-[5rem] text-right">
                    {formatPrice((item.product?.discount_price ?? item.product?.regular_price ?? 0) * item.quantity, 2)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xl font-display font-bold text-foreground">Total: {formatPrice(cartTotal, 2)}</span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => clearCart.mutate()} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    Clear Cart
                  </Button>
                  <Button size="lg" onClick={() => navigate('/checkout')} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
