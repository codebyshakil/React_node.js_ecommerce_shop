import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/SEOHead';
import DynamicPageSections from '@/components/DynamicPageSections';
import { useHeroVisible } from '@/hooks/useHeroVisible';

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ['page-by-slug', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .eq('is_deleted', false)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: sections = [], isLoading: sectionsLoading } = usePageSectionsBySlug(slug || '');
  const { data: heroVisible = true } = useHeroVisible(slug || '');

  if (pageLoading || sectionsLoading) {
    return <Layout><div className="min-h-[50vh] flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div></Layout>;
  }

  if (!page) {
    return <Layout><div className="min-h-[50vh] flex items-center justify-center"><div className="text-center"><h1 className="text-3xl font-display font-bold text-foreground mb-3">Page Not Found</h1><p className="text-muted-foreground">The page you're looking for doesn't exist.</p></div></div></Layout>;
  }

  const enabledSections = sections.filter(s => s.is_enabled);

  return (
    <Layout>
      <SEOHead title={page.title} description={page.meta_description || ''} />

      {heroVisible && (
        <section className="hero-gradient py-8 px-4">
          <div className="container-wide text-center">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">{page.title}</h1>
            {page.meta_description && <p className="mt-3 text-primary-foreground/70 max-w-2xl mx-auto">{page.meta_description}</p>}
          </div>
        </section>
      )}

      {enabledSections.length > 0 ? (
        <DynamicPageSections sections={enabledSections} />
      ) : page.content ? (
        <section className="section-padding bg-background">
          <div className="container-wide max-w-3xl">
            <div className="bg-card rounded-2xl border border-border p-8 card-elevated">
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{page.content}</div>
            </div>
          </div>
        </section>
      ) : null}
    </Layout>
  );
};

export default DynamicPage;
