import Layout from '@/components/layout/Layout';
import { usePageSectionsBySlug } from '@/hooks/usePageSections';
import DynamicPageSections from '@/components/DynamicPageSections';

const policyContent = {
  privacy: {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    sections: [
      { heading: 'Information We Collect', content: 'We collect information you provide directly to us, such as when you create an account, make a purchase, submit a request for quotation, or contact us.' },
      { heading: 'How We Use Your Information', content: 'We use the information we collect to process your orders, communicate with you about products and services, provide customer support, and improve our platform.' },
      { heading: 'Information Sharing', content: 'We do not sell, trade, or otherwise transfer your personal information to outside parties except as necessary to fulfill your orders.' },
      { heading: 'Data Security', content: 'We implement industry-standard security measures to protect your personal information.' },
      { heading: 'Cookies', content: 'We use cookies and similar tracking technologies to enhance your browsing experience.' },
      { heading: 'Contact', content: 'If you have questions about this Privacy Policy, please contact us.' },
    ],
  },
  returns: {
    title: 'Return Policy',
    slug: 'return-policy',
    sections: [
      { heading: 'Return Eligibility', content: 'Products may be returned within 30 days of delivery if they are damaged, defective, or significantly different from the description.' },
      { heading: 'How to Initiate a Return', content: 'Contact our customer support team with your order number and reason for return.' },
      { heading: 'Refund Process', content: 'Once we receive and inspect the returned product, we will process your refund within 5-10 business days.' },
      { heading: 'Exceptions', content: 'Perishable goods, custom-made products, and bulk orders may have different return policies.' },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    slug: 'terms',
    sections: [
      { heading: 'Acceptance of Terms', content: 'By accessing and using our services, you agree to be bound by these Terms and Conditions.' },
      { heading: 'Account Responsibility', content: 'You are responsible for maintaining the confidentiality of your account credentials.' },
      { heading: 'Orders and Payment', content: 'All orders are subject to product availability and price confirmation.' },
      { heading: 'Intellectual Property', content: 'All content on this website is protected by applicable intellectual property laws.' },
      { heading: 'Limitation of Liability', content: 'We shall not be liable for any indirect, incidental, special, or consequential damages.' },
      { heading: 'Governing Law', content: 'These terms shall be governed by and construed in accordance with applicable laws.' },
    ],
  },
};

const PolicyPage = ({ type }: { type: 'privacy' | 'returns' | 'terms' }) => {
  const policy = policyContent[type];
  const { data: sections = [] } = usePageSectionsBySlug(policy.slug);
  const enabledSections = sections.filter(s => s.is_enabled);

  return (
    <Layout>
      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">{policy.title}</h1>
        </div>
      </section>

      {enabledSections.length > 0 ? (
        <DynamicPageSections sections={enabledSections} />
      ) : (
        <section className="section-padding bg-background">
          <div className="container-wide max-w-3xl">
            <div className="bg-card rounded-2xl border border-border p-8 card-elevated">
              <p className="text-sm text-muted-foreground mb-8">Last updated: February 1, 2026</p>
              {policy.sections.map((section, i) => (
                <div key={i} className="mb-8 last:mb-0">
                  <h2 className="text-xl font-display font-bold text-foreground mb-3">{section.heading}</h2>
                  <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default PolicyPage;
