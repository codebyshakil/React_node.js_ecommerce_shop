import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';

const GUEST_CART_KEY = 'guest_cart';

interface GuestCartItem {
  id: string;
  product_id: string;
  quantity: number;
  variation: any;
  product?: {
    id: string;
    title: string;
    slug: string;
    image_url: string | null;
    regular_price: number;
    discount_price: number | null;
    stock_quantity: number;
  };
}

const getGuestCart = (): GuestCartItem[] => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
  } catch { return []; }
};

const setGuestCart = (items: GuestCartItem[]) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [guestCart, setGuestCartState] = useState<GuestCartItem[]>(getGuestCart());

  // Sync guest cart to DB when user logs in
  useEffect(() => {
    if (user) {
      const guest = getGuestCart();
      if (guest.length > 0) {
        (async () => {
          for (const item of guest) {
            const { data: existing } = await supabase
              .from('cart_items')
              .select('id, quantity')
              .eq('user_id', user.id)
              .eq('product_id', item.product_id)
              .maybeSingle();
            if (existing) {
              await supabase.from('cart_items').update({ quantity: existing.quantity + item.quantity }).eq('id', existing.id);
            } else {
              await supabase.from('cart_items').insert({ user_id: user.id, product_id: item.product_id, quantity: item.quantity, variation: item.variation });
            }
          }
          localStorage.removeItem(GUEST_CART_KEY);
          setGuestCartState([]);
          queryClient.invalidateQueries({ queryKey: ['cart'] });
        })();
      }
    }
  }, [user]);

  const cartQuery = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(id, title, slug, image_url, regular_price, discount_price, stock_quantity)')
        .eq('user_id', user.id)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  // For guest users, fetch product details
  const guestCartQuery = useQuery({
    queryKey: ['guest-cart-products', guestCart.map(i => i.product_id).join(',')],
    queryFn: async () => {
      if (guestCart.length === 0) return [];
      const productIds = guestCart.map(i => i.product_id);
      const { data } = await supabase.from('products').select('id, title, slug, image_url, regular_price, discount_price, stock_quantity').in('id', productIds);
      return guestCart.map(item => ({
        ...item,
        product: (data ?? []).find((p: any) => p.id === item.product_id) || null,
      }));
    },
    enabled: !user && guestCart.length > 0,
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1, variation = null }: { productId: string; quantity?: number; variation?: any }) => {
      if (!user) {
        // Guest cart
        const cart = getGuestCart();
        const existing = cart.find(i => i.product_id === productId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          cart.push({ id: `guest-${Date.now()}`, product_id: productId, quantity, variation });
        }
        setGuestCart(cart);
        setGuestCartState([...cart]);
        return;
      }
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity, variation });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({ title: 'Added to cart' });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user) {
        const cart = getGuestCart();
        if (quantity <= 0) {
          const filtered = cart.filter(i => i.id !== itemId);
          setGuestCart(filtered);
          setGuestCartState(filtered);
        } else {
          const item = cart.find(i => i.id === itemId);
          if (item) item.quantity = quantity;
          setGuestCart(cart);
          setGuestCartState([...cart]);
        }
        return;
      }
      if (quantity <= 0) {
        const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) {
        const cart = getGuestCart().filter(i => i.id !== itemId);
        setGuestCart(cart);
        setGuestCartState(cart);
        return;
      }
      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!user) {
        localStorage.removeItem(GUEST_CART_KEY);
        setGuestCartState([]);
        return;
      }
      const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const items = user ? (cartQuery.data ?? []) : (guestCartQuery.data ?? guestCart);

  const cartTotal = items.reduce((sum: number, item: any) => {
    const price = item.product?.discount_price ?? item.product?.regular_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const cartCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return { cart: items, cartTotal, cartCount, isLoading: user ? cartQuery.isLoading : false, addToCart, updateQuantity, removeItem, clearCart };
};
