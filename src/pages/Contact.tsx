import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { usePageContent } from '@/hooks/usePageContent';
import { useIsRecaptchaEnabled } from '@/hooks/useRecaptcha';
import ReCaptcha from '@/components/ReCaptcha';

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const recaptcha = useIsRecaptchaEnabled('contact');
  const { data: contactInfo } = usePageContent('contact_info');
  const { data: mapsUrl } = usePageContent('google_maps_url');

  const info = contactInfo && typeof contactInfo === 'object' ? contactInfo as any : {
    address: '123 Business Avenue, Suite 100\nNew York, NY 10001',
    phone: '+1 (555) 123-4567',
    email: 'info@estelweb.com',
    hours: 'Mon - Fri: 9:00 AM - 6:00 PM\nSat: 10:00 AM - 4:00 PM',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recaptcha.enabled && !captchaToken) {
      toast({ title: 'Please complete the CAPTCHA', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('contact_messages').insert(form);
    setLoading(false);
    if (error) {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Message sent!', description: 'We will get back to you soon.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    }
  };

  const contactItems = [
    { icon: MapPin, title: 'Address', text: info.address },
    { icon: Phone, title: 'Phone', text: info.phone },
    { icon: Mail, title: 'Email', text: info.email },
    { icon: Clock, title: 'Business Hours', text: info.hours },
  ];

  return (
    <Layout>
      <section className="hero-gradient py-8 px-4">
        <div className="container-wide text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground">Contact Us</h1>
          <p className="mt-3 text-primary-foreground/70">We'd love to hear from you</p>
        </div>
      </section>

      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl border border-border p-8 card-elevated">
                <h2 className="text-2xl font-display font-bold text-foreground mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Name *</label>
                      <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
                      <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                    <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Message *</label>
                    <Textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message..." />
                  </div>
                  {recaptcha.enabled && (
                    <ReCaptcha siteKey={recaptcha.siteKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
                  )}
                  <Button type="submit" size="lg" disabled={loading} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold">
                    {loading ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              {contactItems.map((item) => (
                <div key={item.title} className="bg-card rounded-xl border border-border p-6 card-elevated">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Google Map */}
      {typeof mapsUrl === 'string' && mapsUrl && (
        <section className="section-padding bg-background">
          <div className="container-wide">
            <div className="bg-card rounded-2xl border border-border overflow-hidden card-elevated">
              <iframe
                src={mapsUrl}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Company Location"
              />
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Contact;
