import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyEmail = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'expired' | 'error'>('verifying');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    const markEmailVerified = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('profiles').update({ email_verified: true }).eq('user_id', currentUser.id);
      }
    };

    if (type === 'signup' && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(async ({ error }) => {
        if (error) {
          if (error.message?.toLowerCase().includes('expired')) {
            setStatus('expired');
          } else {
            setStatus('error');
          }
        } else {
          await markEmailVerified();
          setStatus('success');
          toast({ title: 'Email verified successfully!' });
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      });
    } else if (type === 'email_change' && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(async ({ error }) => {
        if (error) {
          setStatus('error');
        } else {
          await markEmailVerified();
          setStatus('success');
          toast({ title: 'Email updated successfully!' });
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      });
    } else {
      // Check for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_IN') {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            await supabase.from('profiles').update({ email_verified: true }).eq('user_id', currentUser.id);
          }
          setStatus('success');
          toast({ title: 'Email verified successfully!' });
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      });

      // If no hash tokens, might be already processed or invalid
      setTimeout(() => {
        setStatus((prev) => prev === 'verifying' ? 'error' : prev);
      }, 5000);

      return () => subscription.unsubscribe();
    }
  }, [navigate]);

  const handleResend = async () => {
    if (!resendEmail) {
      toast({ title: 'Please enter your email', variant: 'destructive' });
      return;
    }
    setResendLoading(true);
    try {
      await supabase.functions.invoke('send-auth-email', {
        body: {
          action: 'send_verification',
          email: resendEmail,
          redirect_to: window.location.origin,
        },
      });
      toast({ title: 'Verification email sent!', description: 'Please check your inbox.' });
    } catch {
      toast({ title: 'Failed to send email', variant: 'destructive' });
    }
    setResendLoading(false);
  };

  return (
    <Layout>
      <section className="section-padding bg-muted/30 min-h-[70vh] flex items-center">
        <div className="container-wide max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-8 card-elevated text-center"
          >
            {status === 'verifying' && (
              <div className="space-y-4">
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                <h1 className="text-2xl font-display font-bold text-foreground">Verifying your email...</h1>
                <p className="text-muted-foreground">Please wait while we verify your email address.</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">Email Verified!</h1>
                <p className="text-muted-foreground">Your email has been verified successfully. Redirecting to dashboard...</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">Verification Link Expired</h1>
                <p className="text-muted-foreground">This verification link has expired. Enter your email to receive a new one.</p>
                <div className="space-y-3 max-w-sm mx-auto">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button onClick={handleResend} disabled={resendLoading} className="w-full">
                    {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">Verification Failed</h1>
                <p className="text-muted-foreground">This verification link is invalid, has already been used, or your email is already verified.</p>
                <div className="space-y-3 max-w-sm mx-auto">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your email to resend"
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button onClick={handleResend} disabled={resendLoading} className="w-full">
                    {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default VerifyEmail;
