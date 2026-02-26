import Layout from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePageContent } from '@/hooks/usePageContent';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import DynamicPageSections from '@/components/DynamicPageSections';

const defaultFaqs = [
  { q: 'What is the minimum order quantity?', a: 'Our minimum order quantity varies by product. For most products, we accept orders starting from 10 units.' },
  { q: 'How do I request a quotation?', a: 'Navigate to our RFQ page, fill in the required details. Our team typically responds within 24 hours.' },
  { q: 'What payment methods do you accept?', a: 'We accept bank transfers, credit/debit cards, and cash on delivery for select regions.' },
  { q: 'Do you ship internationally?', a: 'Yes, we ship to over 100 countries worldwide.' },
  { q: 'What is your return policy?', a: 'We offer a 30-day return policy for products that are damaged, defective, or not as described.' },
];

const FAQ = () => {
  const { data: faqItems } = usePageContent('faq_items');
  const { data: sections = [] } = usePageSectionsBySlug('faq');
  const faqs = Array.isArray(faqItems) ? faqItems : defaultFaqs;
  const enabledSections = sections.filter(s => s.is_enabled);

  return (
    <Layout>
      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">Frequently Asked Questions</h1>
          <p className="mt-3 text-primary-foreground/70">Find answers to common questions</p>
        </div>
      </section>

      {enabledSections.length > 0 ? (
        <DynamicPageSections sections={enabledSections} />
      ) : (
        <section className="section-padding bg-background">
          <div className="container-wide max-w-3xl">
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq: any, i: number) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow">
                  <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline py-5">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default FAQ;
