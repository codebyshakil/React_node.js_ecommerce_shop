import { Link, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentFail = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-wide max-w-lg text-center py-20">
          <XCircle className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">Payment Failed</h1>
          <p className="text-muted-foreground mb-2">Unfortunately, your payment could not be processed.</p>
          {orderId && <p className="text-sm text-muted-foreground mb-6">Order ID: <span className="font-mono">{orderId.slice(0, 8)}</span></p>}
          <div className="flex gap-3 justify-center">
            <Link to="/cart"><Button>Try Again</Button></Link>
            <Link to="/"><Button variant="outline">Go Home</Button></Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PaymentFail;
