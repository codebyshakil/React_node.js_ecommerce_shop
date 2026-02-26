import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Settings, Rocket } from 'lucide-react';

const STEPS = [
  { id: 'database', title: 'Database', icon: Settings, desc: 'Connect your Supabase database' },
  { id: 'admin', title: 'Admin Account', icon: Settings, desc: 'Create your admin account' },
  { id: 'finish', title: 'Complete', icon: Rocket, desc: 'Finish installation' },
];

const Field = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">{label}</label>
    {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
    {children}
  </div>
);

const Install = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [installProgress, setInstallProgress] = useState('');

  const [dbUrl, setDbUrl] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const canNext = () => {
    if (step === 0) return dbUrl.trim().startsWith('postgresql://');
    if (step === 1) return adminName.trim() && adminEmail.trim() && adminPassword.length >= 6;
    return true;
  };

  const handleInstall = async () => {
    setLoading(true);
    try {
      setInstallProgress('📦 Creating database tables...');
      
      const { data, error } = await supabase.functions.invoke('initial-setup', {
        body: {
          db_url: dbUrl.trim(),
          admin_email: adminEmail.trim().toLowerCase(),
          admin_password: adminPassword,
          admin_name: adminName.trim(),
          site_title: 'CommerceX',
          site_description: '',
          site_logo: '',
          currency_code: 'BDT',
          currency_symbol: '৳',
          currency_position: 'before',
          payment_methods: {
            cod: { enabled: true },
            sslcommerz: { enabled: false },
            bkash: { enabled: false },
            nagad: { enabled: false },
            stripe: { enabled: false },
            paypal: { enabled: false, sandbox: true },
            manual_payment: { enabled: false },
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInstallProgress('');
      toast({ title: '✅ Installation Complete!', description: 'Your store is ready. Redirecting to admin login...' });
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err: any) {
      setInstallProgress('');
      toast({ title: 'Installation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Field label="Database URL" desc="Supabase Dashboard → Settings → Database → Connection string → URI">
              <Input
                type="text"
                value={dbUrl}
                onChange={e => setDbUrl(e.target.value)}
                placeholder="postgresql://postgres.xxxxx:PASSWORD@aws-0-....pooler.supabase.com:6543/postgres"
                className="font-mono text-xs"
              />
            </Field>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>📌 <strong>Where You Find This:</strong> Supabase Dashboard → Settings → Database → Connection string → URI</p>
              <p>⚠️ <code>[YOUR-PASSWORD]</code> Replace This with Your Database Password ( এর জায়গায় আপনার ডেটাবেস পাসওয়ার্ড বসান )</p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <Field label="Full Name" desc="Admin account holder's name">
              <Input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="John Doe" />
            </Field>
            <Field label="Email Address" desc="This will be your admin login email">
              <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
            </Field>
            <Field label="Password" desc="Minimum 6 characters">
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 text-center">
            {loading ? (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Installing...</h3>
                  <p className="text-sm text-muted-foreground mt-1">{installProgress || 'Please wait...'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-left">
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p>🔄 Creating 25+ database tables...</p>
                    <p>🔒 Setting up 100+ RLS security policies...</p>
                    <p>👤 Creating admin account...</p>
                    <p>⚙️ Configuring site settings...</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Ready to Install!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Review your settings and click Install to set up your store.</p>
                </div>
                <div className="text-left bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Admin:</span><span className="font-medium text-foreground">{adminEmail}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Name:</span><span className="font-medium text-foreground">{adminName}</span></div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-left">
                  <p className="text-xs text-muted-foreground">
                    <strong>🚀 One-click setup:</strong> Tables, RLS policies, admin account — সব অটোমেটিক তৈরি হবে। Site settings, payment, SMTP পরে Admin Panel থেকে setup করবেন।
                  </p>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 h-0.5 mx-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              {(() => { const Icon = STEPS[step].icon; return <Icon className="w-5 h-5 text-primary" />; })()}
              <div>
                <h2 className="text-lg font-semibold text-foreground">{STEPS[step].title}</h2>
                <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex items-center justify-between">
            <Button variant="outline" disabled={step === 0 || loading} onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16} className="mr-1" /> Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button disabled={loading} onClick={handleInstall}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Installing...</> : '🚀 Install Now'}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by Exceptional Software Tech
        </p>
      </div>
    </div>
  );
};

export default Install;
