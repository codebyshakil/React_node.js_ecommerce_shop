import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Enter a valid email address'); return false; }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-auth-email', {
        body: {
          action: 'send_reset',
          email: trimmedEmail,
          redirect_to: `${window.location.origin}/reset-password`,
        },
      });

      if (fnError) throw fnError;

      if (data?.sent) {
        setSent(true);
        toast({ title: 'Check your email', description: 'A password reset link has been sent.' });
      } else if (data?.reason) {
        console.warn('Custom SMTP reset failed:', data.reason);
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          setSent(true);
          toast({ title: 'Check your email', description: 'A password reset link has been sent.' });
        }
      }
    } catch (e) {
      console.warn('Custom auth email failed, using built-in:', e);
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setSent(true);
        toast({ title: 'Check your email', description: 'A password reset link has been sent.' });
      }
    }

    setLoading(false);
  };

  return (
    <Layout>
      <section className="section-padding bg-muted/30 min-h-[70vh] flex items-center">
        <div className="container-wide max-w-[520px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-card rounded-2xl border border-border p-8 md:p-10 card-elevated"
          >
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Reset Password</h1>
              <p className="text-muted-foreground mt-2">Enter your email to receive a reset link</p>
            </div>
            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-muted-foreground">We've sent a password reset link to <strong className="text-foreground">{email}</strong>. Please check your inbox.</p>
                <Link to="/login" className="text-secondary font-medium hover:underline inline-block">Back to Login</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="john@email.com"
                      className={`pl-10 h-11 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      required
                    />
                  </div>
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>
                <Button type="submit" size="lg" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-secondary font-medium hover:underline">Back to Login</Link>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default ForgotPassword;
