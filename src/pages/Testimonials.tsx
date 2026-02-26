import Layout from '@/components/layout/Layout';
import { useTestimonials } from '@/hooks/useProducts';
import { Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Testimonials = () => {
  const { data: testimonials = [], isLoading } = useTestimonials();

  return (
    <Layout>
      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">Testimonials</h1>
          <p className="mt-3 text-primary-foreground/70">What our clients say about us</p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide max-w-4xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : testimonials.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No testimonials yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((t: any) => (
                <div key={t.id} className="bg-card rounded-xl border border-border p-6 card-elevated">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.rating ?? 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-foreground italic mb-4">"{t.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                      {t.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Testimonials;
