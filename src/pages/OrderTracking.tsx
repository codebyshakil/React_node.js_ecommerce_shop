import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/SEOHead';
import DynamicPageSections from '@/components/DynamicPageSections';
import { usePageSections } from '@/hooks/usePageSections';
import { useHeroVisible } from '@/hooks/useHeroVisible';
import { usePages } from '@/hooks/usePages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderStatusTracker from '@/components/OrderStatusTracker';
import { Search, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TrackedOrderItem {
  product_name: string;
  quantity: number;
  price: number;
  variation: any;
  image_url: string;
}

interface TrackedOrder {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  total: number;
  payment_method: string;
  items: TrackedOrderItem[];
}

const OrderTracking = () => {
  const [orderId, setOrderId] = useState('');
  const [contact, setContact] = useState('');
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState('');

  // Page sections support
  const { data: allPages = [] } = usePages(false);
  const trackingPage = allPages.find(p => p.slug === 'order-tracking');
  const { data: sections = [] } = usePageSections(trackingPage?.id || '');
  const heroVisible = useHeroVisible('order-tracking');

  const trackByOrderId = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    setSearched(true);
    setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('track-order', {
        body: { order_id: orderId.trim() },
      });
      if (error) throw error;
      setOrders(data?.orders || []);
      setMessage(data?.message || '');
    } catch {
      setOrders([]);
      setMessage('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const trackByContact = async () => {
    if (!contact.trim()) return;
    setLoading(true);
    setSearched(true);
    setMessage('');
    const isEmail = contact.includes('@');
    try {
      const { data, error } = await supabase.functions.invoke('track-order', {
        body: isEmail ? { email: contact.trim() } : { phone: contact.trim() },
      });
      if (error) throw error;
      setOrders(data?.orders || []);
      setMessage(data?.message || '');
    } catch {
      setOrders([]);
      setMessage('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Layout>
      <SEOHead title="Track Your Order" description="Track your order status in real-time." />

      {heroVisible && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Track Your Order</h1>
          <p className="text-muted-foreground mt-2">Enter your order ID or contact details to check delivery status</p>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Tabs defaultValue="order-id" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="order-id">Track by Order ID</TabsTrigger>
            <TabsTrigger value="contact">Track by Phone/Email</TabsTrigger>
          </TabsList>

          <TabsContent value="order-id" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter your Order ID..."
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && trackByOrderId()}
              />
              <Button onClick={trackByOrderId} disabled={loading || !orderId.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Phone Number or Email..."
                value={contact}
                onChange={e => setContact(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && trackByContact()}
              />
              <Button onClick={trackByContact} disabled={loading || !contact.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Shows all active (non-delivered) orders for the given phone/email.
            </p>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && searched && orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{message || 'No orders found.'}</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="space-y-6 mt-6">
            {orders.map(order => (
              <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Order header */}
                <div className="bg-muted/50 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Order ID</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Status tracker */}
                <div className="px-4 pt-4">
                  <OrderStatusTracker status={order.status} />
                </div>

                {/* Products */}
                <div className="px-4 pb-4 space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom page sections from admin */}
      {sections.length > 0 && (
        <div className="container mx-auto px-4 pb-8">
          <DynamicPageSections sections={sections} />
        </div>
      )}
    </Layout>
  );
};

export default OrderTracking;
