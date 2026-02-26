import { Link, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const method = params.get('method');
  const isManual = method === 'manual';

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-wide max-w-lg text-center py-20">
          {isManual ? (
            <Clock className="w-20 h-20 text-secondary mx-auto mb-6" />
          ) : (
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          )}
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">
            {isManual ? 'Payment Submitted!' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground mb-2">
            {isManual
              ? 'Your payment has been submitted and is awaiting verification. We will confirm your order shortly.'
              : 'Your order has been confirmed and is being processed.'}
          </p>
          {orderId && <p className="text-sm text-muted-foreground mb-6">Order ID: <span className="font-mono">{orderId.slice(0, 8)}</span></p>}
          <div className="flex gap-3 justify-center">
            <Link to="/dashboard"><Button>View Orders</Button></Link>
            <Link to="/products"><Button variant="outline">Continue Shopping</Button></Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PaymentSuccess;
