import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentCancel = () => {
  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-wide max-w-lg text-center py-20">
          <AlertCircle className="w-20 h-20 text-secondary mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-3">Payment Cancelled</h1>
          <p className="text-muted-foreground mb-6">You cancelled the payment. Your order is still pending — you can retry anytime.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/cart"><Button>Back to Cart</Button></Link>
            <Link to="/products"><Button variant="outline">Browse Products</Button></Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PaymentCancel;
