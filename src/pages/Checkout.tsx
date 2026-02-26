import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { Loader2, ShieldCheck, Truck, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Login from '@/pages/Login';
import ManualPaymentModal from '@/components/checkout/ManualPaymentModal';
import { useIsRecaptchaEnabled } from '@/hooks/useRecaptcha';
import ReCaptcha from '@/components/ReCaptcha';

interface CheckoutItem {
  product_id: string;
  title: string;
  image_url: string | null;
  quantity: number;
  price: number;
  variation?: any;
}

const Checkout = () => {
  const { user } = useAuth();
  const { cart, cartTotal, clearCart } = useCart();
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const recaptcha = useIsRecaptchaEnabled('checkout');

  // Buy Now item passed via location state
  const buyNowItem: CheckoutItem | null = location.state?.buyNowItem || null;

  // Determine checkout items
  const checkoutItems: CheckoutItem[] = useMemo(() => {
    if (buyNowItem) return [buyNowItem];
    return cart.map((item: any) => ({
      product_id: item.product_id,
      title: item.product?.title ?? 'Product',
      image_url: item.product?.image_url,
      quantity: item.quantity,
      price: item.product?.discount_price ?? item.product?.regular_price ?? 0,
      variation: item.variation,
    }));
  }, [buyNowItem, cart]);

  // Profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Shipping zones & rates
  const { data: shippingData } = useQuery({
    queryKey: ['shipping-rates-checkout'],
    queryFn: async () => {
      const { data: zones } = await supabase.from('shipping_zones').select('id, name, type').eq('is_active', true);
      const { data: rates } = await supabase.from('shipping_rates').select('*');
      return { zones: zones ?? [], rates: rates ?? [] };
    },
  });

  // Payment methods from admin settings
  const { data: paymentConfig } = useQuery({
    queryKey: ['payment-methods-config'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_enabled_payment_methods');
      if (error) throw error;
      return (data as any) ?? {};
    },
  });

  const enabledPaymentMethods = useMemo(() => {
    if (!paymentConfig) return [];
    const methods: { key: string; label: string }[] = [];
    if (paymentConfig.sslcommerz?.enabled) methods.push({ key: 'sslcommerz', label: 'SSLCommerz (Card/Mobile Banking)' });
    if (paymentConfig.bkash?.enabled) methods.push({ key: 'bkash', label: 'bKash' });
    if (paymentConfig.nagad?.enabled) methods.push({ key: 'nagad', label: 'Nagad' });
    if (paymentConfig.paypal?.enabled) methods.push({ key: 'paypal', label: 'PayPal' });
    if (paymentConfig.stripe?.enabled) methods.push({ key: 'stripe', label: 'Stripe (Card Payment)' });
    if (paymentConfig.manual_payment?.enabled) methods.push({ key: 'manual_payment', label: paymentConfig.manual_payment.gateway_name || 'Manual Payment' });
    if (paymentConfig.cod?.enabled) methods.push({ key: 'cod', label: 'Cash on Delivery' });
    return methods;
  }, [paymentConfig]);

  // PayPal SDK loading
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const paypalScriptRef = useRef<HTMLScriptElement | null>(null);

  // Form state
  const [address, setAddress] = useState('');
  const [addressEditing, setAddressEditing] = useState(false);
  const [selectedZone, setSelectedZone] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  useEffect(() => {
    if (profile?.address) {
      setAddress(profile.address);
      setAddressEditing(false);
    } else {
      setAddressEditing(true);
    }
  }, [profile]);

  useEffect(() => {
    if (enabledPaymentMethods.length === 1) setPaymentMethod(enabledPaymentMethods[0].key);
  }, [enabledPaymentMethods]);

  // Calculate delivery charge
  const deliveryCharge = useMemo(() => {
    if (!deliveryArea || !shippingData) return 0;
    const rate = shippingData.rates.find((r: any) => r.id === deliveryArea);
    if (!rate) return 0;
    const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0);
    if (rate.free_shipping_threshold && subtotal >= Number(rate.free_shipping_threshold)) return 0;
    return Number(rate.rate);
  }, [deliveryArea, shippingData, checkoutItems]);

  const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const grandTotal = subtotal + deliveryCharge - discount;

  // Build zone options and area options filtered by selected zone
  const zoneOptions = useMemo(() => {
    if (!shippingData) return [];
    return shippingData.zones.map((z: any) => ({ id: z.id, name: z.name }));
  }, [shippingData]);

  const areaOptions = useMemo(() => {
    if (!shippingData || !selectedZone) return [];
    return shippingData.rates
      .filter((r: any) => r.zone_id === selectedZone)
      .map((r: any) => ({
        id: r.id,
        label: r.area_name || 'Standard',
        rate: Number(r.rate),
      }));
  }, [shippingData, selectedZone]);

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    try {
      // Fetch coupon by code
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .ilike('code', code)
        .maybeSingle();

      if (error) throw error;
      if (!coupon) { toast({ title: 'Invalid promo code', variant: 'destructive' }); return; }

      // Check expiry
      if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
        toast({ title: 'This promo code has expired', variant: 'destructive' }); return;
      }

      // Check start date
      if (coupon.start_date && new Date(coupon.start_date) > new Date()) {
        toast({ title: 'This promo code is not yet active', variant: 'destructive' }); return;
      }

      // Check usage limit
      if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
        toast({ title: 'This promo code has reached its usage limit', variant: 'destructive' }); return;
      }

      // Check min order amount
      if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
        toast({ title: `Minimum order amount is ${formatPrice(Number(coupon.min_order_amount), 2)}`, variant: 'destructive' }); return;
      }

      // Check per-user limit
      if (user && coupon.per_user_limit) {
        const { count } = await supabase
          .from('coupon_usage')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', user.id);
        if ((count ?? 0) >= coupon.per_user_limit) {
          toast({ title: 'You have already used this promo code', variant: 'destructive' }); return;
        }
      }

      // Check applies_to restrictions
      if (coupon.applies_to === 'new_customers' && user) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if ((count ?? 0) > 0) {
          toast({ title: 'This promo is for new customers only', variant: 'destructive' }); return;
        }
      }

      if (coupon.applies_to === 'selected_customers' && user) {
        const customerIds = (coupon.selected_customer_ids as any) || [];
        if (!customerIds.includes(user.id)) {
          toast({ title: 'This promo code is not available for your account', variant: 'destructive' }); return;
        }
      }

      if (coupon.applies_to === 'selected_products') {
        const productIds = (coupon.selected_product_ids as any) || [];
        const hasEligible = checkoutItems.some(item => productIds.includes(item.product_id));
        if (!hasEligible) {
          toast({ title: 'This promo does not apply to your cart items', variant: 'destructive' }); return;
        }
      }

      // Calculate discount
      let discountAmt = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmt = subtotal * (Number(coupon.discount_value) / 100);
        if (coupon.max_discount_amount) {
          discountAmt = Math.min(discountAmt, Number(coupon.max_discount_amount));
        }
      } else {
        discountAmt = Number(coupon.discount_value);
      }
      discountAmt = Math.min(discountAmt, subtotal); // Can't exceed subtotal

      setDiscount(discountAmt);
      setPromoApplied(true);
      setAppliedCoupon(coupon);
      toast({ title: 'Promo applied!', description: `Discount: ${formatPrice(discountAmt, 2)}` });
    } catch (err: any) {
      toast({ title: 'Error applying promo', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setDiscount(0);
    setPromoCode('');
    setAppliedCoupon(null);
  };

  // Prompt login if not logged in
  useEffect(() => {
    if (!user) setShowAuthModal(true);
  }, [user]);

  // Check email_verified from profiles table
  const { data: userProfile } = useQuery({
    queryKey: ['checkout-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('email_verified').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const isEmailVerified = !!userProfile?.email_verified;

  const validate = () => {
    if (!user) { setShowAuthModal(true); return false; }
    if (!isEmailVerified) { toast({ title: 'Email verification required', description: 'Please verify your email before placing an order. Go to Dashboard → Profile to verify.', variant: 'destructive' }); return false; }
    if (!address.trim()) { toast({ title: 'Please enter your address', variant: 'destructive' }); return false; }
    if (areaOptions.length > 0 && !deliveryArea) { toast({ title: 'Please select a delivery area', variant: 'destructive' }); return false; }
    if (!paymentMethod) { toast({ title: 'Please select a payment method', variant: 'destructive' }); return false; }
    if (checkoutItems.length === 0) { toast({ title: 'No items to checkout', variant: 'destructive' }); return false; }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    if (recaptcha.enabled && !captchaToken) {
      toast({ title: 'Please complete the CAPTCHA', variant: 'destructive' });
      return;
    }

    // For manual payment, open the modal instead
    if (paymentMethod === 'manual_payment') {
      setShowManualPayment(true);
      return;
    }

    setPlacing(true);

    try {
      // Save shipping address to profile
      await supabase.from('profiles').update({ address }).eq('user_id', user!.id);

      const selectedRate = shippingData?.rates.find((r: any) => r.id === deliveryArea);

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          total: grandTotal,
          status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
          payment_method: paymentMethod,
          shipping_address: {
            address,
            delivery_area: selectedRate?.area_name || 'Standard',
            delivery_charge: deliveryCharge,
          } as any,
          notes: promoApplied && appliedCoupon ? `Promo: ${promoCode} (${appliedCoupon.discount_type === 'percentage' ? appliedCoupon.discount_value + '%' : currencySymbol + appliedCoupon.discount_value} off, -${formatPrice(discount, 2)})` : null,
        })
        .select('id')
        .single();
      if (orderErr) throw orderErr;

      // Insert order items
      const items = checkoutItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.title,
        quantity: item.quantity,
        price: item.price,
        variation: item.variation ?? null,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      // Track coupon usage
      if (appliedCoupon && user) {
        await supabase.from('coupon_usage').insert({ coupon_id: appliedCoupon.id, user_id: user.id, order_id: order.id } as any);
        await supabase.from('coupons').update({ usage_count: (appliedCoupon.usage_count || 0) + 1 } as any).eq('id', appliedCoupon.id);
      }

      // Clear cart if not buy-now
      if (!buyNowItem) {
        await clearCart.mutateAsync();
      }

      // Handle payment
      if (paymentMethod === 'cod') {
        toast({ title: 'Order placed successfully!' });
        navigate('/payment/success?method=cod');
        return;
      }

      // Determine which edge function to call
      const functionName = paymentMethod === 'bkash' ? 'bkash-init' : paymentMethod === 'nagad' ? 'nagad-init' : paymentMethod === 'stripe' ? 'stripe-create-checkout' : 'sslcommerz-init';
      console.log(`[Checkout] Calling ${functionName} for order ${order.id}`);

      // Use fetch directly for better error handling
      const session = (await supabase.auth.getSession()).data.session;
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
      const paymentRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ order_id: order.id }),
      });

      const paymentData = await paymentRes.json();
      console.log(`[Checkout] Payment response status=${paymentRes.status}:`, paymentData);

      if (!paymentRes.ok || !paymentData?.gateway_url) {
        throw new Error(paymentData?.error || paymentData?.details || 'Payment gateway error. Please check payment settings.');
      }

      // Redirect to payment gateway
      window.location.href = paymentData.gateway_url;
    } catch (err: any) {
      console.error('[Checkout] Payment error:', err);
      toast({ title: 'Payment failed', description: err.message, variant: 'destructive' });
      setPlacing(false);
    }
  };

  const handleManualPaymentSubmit = async (data: { method_name: string; account_number: string; transaction_id: string; screenshot_url?: string }) => {
    setPlacing(true);
    try {
      await supabase.from('profiles').update({ address }).eq('user_id', user!.id);

      const selectedRate = shippingData?.rates.find((r: any) => r.id === deliveryArea);

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          total: grandTotal,
          status: 'pending',
          payment_method: 'manual_payment',
          shipping_address: {
            address,
            delivery_area: selectedRate?.area_name || 'Standard',
            delivery_charge: deliveryCharge,
          } as any,
          transaction_id: data.transaction_id,
          notes: JSON.stringify({
            manual_method: data.method_name,
            account_number: data.account_number,
            transaction_id: data.transaction_id,
            screenshot_url: data.screenshot_url || null,
            expected_amount: grandTotal,
            promo: promoApplied ? promoCode : null,
          }),
        })
        .select('id')
        .single();
      if (orderErr) throw orderErr;

      const items = checkoutItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.title,
        quantity: item.quantity,
        price: item.price,
        variation: item.variation ?? null,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      // Track coupon usage
      if (appliedCoupon && user) {
        await supabase.from('coupon_usage').insert({ coupon_id: appliedCoupon.id, user_id: user.id, order_id: order.id } as any);
        await supabase.from('coupons').update({ usage_count: (appliedCoupon.usage_count || 0) + 1 } as any).eq('id', appliedCoupon.id);
      }

      if (!buyNowItem) {
        await clearCart.mutateAsync();
      }

      setShowManualPayment(false);
      toast({ title: 'Payment submitted!', description: 'Your payment is awaiting verification.' });
      navigate('/payment/success?method=manual');
    } catch (err: any) {
      console.error('[Checkout] Manual payment error:', err);
      toast({ title: 'Order failed', description: err.message, variant: 'destructive' });
    }
    setPlacing(false);
  };

  // PayPal: create order on backend, then render buttons
  const createPaypalDbOrder = useCallback(async () => {
    if (!user) return null;
    
    await supabase.from('profiles').update({ address }).eq('user_id', user.id);
    const selectedRate = shippingData?.rates.find((r: any) => r.id === deliveryArea);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total: grandTotal,
        status: 'pending',
        payment_method: 'paypal',
        shipping_address: {
          address,
          delivery_area: selectedRate?.area_name || 'Standard',
          delivery_charge: deliveryCharge,
        } as any,
        notes: promoApplied && appliedCoupon ? `Promo: ${promoCode} (${appliedCoupon.discount_type === 'percentage' ? appliedCoupon.discount_value + '%' : currencySymbol + appliedCoupon.discount_value} off, -${formatPrice(discount, 2)})` : null,
      })
      .select('id')
      .single();
    if (orderErr) throw orderErr;

    const items = checkoutItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.title,
      quantity: item.quantity,
      price: item.price,
      variation: item.variation ?? null,
    }));
    await supabase.from('order_items').insert(items);

    if (appliedCoupon && user) {
      await supabase.from('coupon_usage').insert({ coupon_id: appliedCoupon.id, user_id: user.id, order_id: order.id } as any);
      await supabase.from('coupons').update({ usage_count: (appliedCoupon.usage_count || 0) + 1 } as any).eq('id', appliedCoupon.id);
    }

    return order.id;
  }, [user, address, shippingData, deliveryArea, grandTotal, deliveryCharge, checkoutItems, promoApplied, appliedCoupon, promoCode, currencySymbol, formatPrice, discount]);

  // Load PayPal SDK when paypal is selected
  useEffect(() => {
    if (paymentMethod !== 'paypal' || !paymentConfig?.paypal?.client_id) {
      setPaypalReady(false);
      return;
    }

    const clientId = paymentConfig.paypal.client_id;
    const existingScript = document.querySelector('script[data-paypal-sdk]');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.setAttribute('data-paypal-sdk', 'true');
    script.async = true;
    script.onload = () => setPaypalReady(true);
    document.head.appendChild(script);
    paypalScriptRef.current = script;

    return () => {
      if (paypalScriptRef.current) {
        paypalScriptRef.current.remove();
        paypalScriptRef.current = null;
      }
    };
  }, [paymentMethod, paymentConfig?.paypal?.client_id]);

  // Render PayPal buttons
  useEffect(() => {
    if (!paypalReady || paymentMethod !== 'paypal' || !paypalContainerRef.current) return;
    const container = paypalContainerRef.current;
    container.innerHTML = '';

    const win = window as any;
    if (!win.paypal?.Buttons) return;

    win.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: async () => {
        if (!validate()) throw new Error('Validation failed');
        if (recaptcha.enabled && !captchaToken) {
          toast({ title: 'Please complete the CAPTCHA', variant: 'destructive' });
          throw new Error('CAPTCHA required');
        }

        // Create DB order + PayPal order on backend
        const dbOrderId = await createPaypalDbOrder();
        if (!dbOrderId) throw new Error('Order creation failed');
        setPaypalOrderId(dbOrderId);

        const session = (await supabase.auth.getSession()).data.session;
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-create-order`;
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ order_id: dbOrderId }),
        });
        const data = await res.json();
        if (!res.ok || !data.paypal_order_id) throw new Error(data.error || 'PayPal order failed');
        return data.paypal_order_id;
      },
      onApprove: async (data: any) => {
        setPlacing(true);
        try {
          const session = (await supabase.auth.getSession()).data.session;
          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-capture-order`;
          const res = await fetch(fnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ paypal_order_id: data.orderID, order_id: paypalOrderId }),
          });
          const result = await res.json();
          if (result.success) {
            if (!buyNowItem) await clearCart.mutateAsync();
            toast({ title: 'Payment successful!' });
            navigate('/payment/success?method=paypal');
          } else {
            toast({ title: 'Payment failed', description: result.error, variant: 'destructive' });
            navigate('/payment/fail');
          }
        } catch (err: any) {
          toast({ title: 'Payment error', description: err.message, variant: 'destructive' });
        }
        setPlacing(false);
      },
      onCancel: () => {
        toast({ title: 'Payment cancelled', variant: 'destructive' });
      },
      onError: (err: any) => {
        console.error('[PayPal] Button error:', err);
      },
    }).render(container);
  }, [paypalReady, paymentMethod]);

  if (checkoutItems.length === 0 && !buyNowItem) {
    return (
      <Layout>
        <section className="section-padding bg-background">
          <div className="container-wide text-center py-20">
            <p className="text-muted-foreground mb-4">No items to checkout.</p>
            <Button onClick={() => navigate('/products')}>Browse Products</Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Auth Modal for guest users */}
      <Dialog open={showAuthModal && !user} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login to Continue</DialogTitle>
          </DialogHeader>
          <AuthForm onSuccess={() => setShowAuthModal(false)} />
        </DialogContent>
      </Dialog>

      {/* Manual Payment Modal */}
      {paymentConfig?.manual_payment && (
        <ManualPaymentModal
          open={showManualPayment}
          onOpenChange={setShowManualPayment}
          config={{
            gateway_name: paymentConfig.manual_payment.gateway_name || 'Manual Payment',
            description: paymentConfig.manual_payment.description || '',
            accounts: paymentConfig.manual_payment.accounts || [],
          }}
          amount={grandTotal}
          onSubmit={handleManualPaymentSubmit}
        />
      )}

      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">Checkout</h1>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* LEFT SIDE */}
            <div className="lg:col-span-3 space-y-6">
              {/* Customer Information */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-secondary" /> Customer Information
                </h2>
                {user && profile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Name</Label>
                        <p className="font-medium text-foreground">{profile.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Phone</Label>
                        <p className="font-medium text-foreground">{profile.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="address" className="text-sm text-muted-foreground">Delivery Address *</Label>
                        {profile.address && !addressEditing && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 text-secondary" onClick={() => setAddressEditing(true)}>
                            Edit
                          </Button>
                        )}
                      </div>
                      {addressEditing ? (
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter your full delivery address"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground bg-muted/50 rounded-lg px-3 py-2.5 border border-border">
                          {address || 'No address saved'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : !user ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">Please login or register to continue</p>
                    <Button onClick={() => setShowAuthModal(true)}>Login / Register</Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading profile...</p>
                )}
              </div>

              {/* Delivery Area */}
              {zoneOptions.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-secondary" /> Delivery Area
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1.5 block">Zone</Label>
                      <Select value={selectedZone} onValueChange={(v) => { setSelectedZone(v); setDeliveryArea(''); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zoneOptions.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedZone && areaOptions.length > 0 && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">Area</Label>
                        <Select value={deliveryArea} onValueChange={setDeliveryArea}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select area" />
                          </SelectTrigger>
                          <SelectContent>
                            {areaOptions.map((area: any) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.label} — {formatPrice(area.rate, 0)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {selectedZone && areaOptions.length === 0 && (
                      <p className="text-sm text-muted-foreground">No areas available for this zone.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-secondary" /> Payment Method
                </h2>
                {enabledPaymentMethods.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No payment methods available. Please contact support.</p>
                ) : (
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    {enabledPaymentMethods.map((m) => (
                      <div key={m.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${paymentMethod === m.key ? 'border-secondary bg-secondary/5' : 'border-border'}`}>
                        <RadioGroupItem value={m.key} id={`pm-${m.key}`} />
                        <Label htmlFor={`pm-${m.key}`} className="cursor-pointer flex-1 text-sm font-medium">{m.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </div>

            {/* RIGHT SIDE - Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-xl border border-border p-6 sticky top-32 space-y-5">
                <h2 className="text-lg font-display font-bold text-foreground">Order Summary</h2>

                {/* Product list */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {checkoutItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img src={item.image_url || '/placeholder.svg'} alt={item.title} className="w-14 h-14 rounded-lg object-cover border border-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price, 2)}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatPrice(item.price * item.quantity, 2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Promo Code */}
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><Tag className="w-3 h-3" /> Promo Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                      className="flex-1"
                      disabled={promoApplied}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={promoApplied ? handleRemovePromo : handleApplyPromo}
                      className="shrink-0"
                    >
                      {promoApplied ? 'Remove' : 'Apply'}
                    </Button>
                  </div>
                  {promoApplied && <p className="text-xs text-green-600 mt-1">Promo applied: -{formatPrice(discount, 2)}</p>}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">{formatPrice(subtotal, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Charge</span>
                    <span className="font-medium text-foreground">{deliveryCharge > 0 ? formatPrice(deliveryCharge, 2) : 'Free'}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(discount, 2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-foreground">Grand Total</span>
                    <span className="text-foreground">{formatPrice(grandTotal, 2)}</span>
                  </div>
                </div>

                {recaptcha.enabled && (
                  <ReCaptcha siteKey={recaptcha.siteKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
                )}

                {/* PayPal Smart Buttons */}
                {paymentMethod === 'paypal' && (
                  <div ref={paypalContainerRef} className="w-full min-h-[50px]">
                    {!paypalReady && <p className="text-sm text-muted-foreground text-center">Loading PayPal...</p>}
                  </div>
                )}

                {/* Regular Place Order button (hidden for PayPal) */}
                {paymentMethod !== 'paypal' && (
                  <Button
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold"
                    size="lg"
                    disabled={placing || !user}
                    onClick={handlePlaceOrder}
                  >
                    {placing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Place Order'}
                  </Button>
                )}
                {paymentMethod === 'paypal' && placing && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing PayPal payment...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

// Inline auth form for the modal
const AuthForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
      else onSuccess();
    } else {
      const { error } = await signUp(email, password, fullName, phone);
      if (error) toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Please check your email to verify your account.' }); }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'register' && (
        <>
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </>
      )}
      <div>
        <Label>Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button type="button" className="text-secondary underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
    </form>
  );
};

export default Checkout;
