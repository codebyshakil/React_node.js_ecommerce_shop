import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useIsRecaptchaEnabled } from '@/hooks/useRecaptcha';
import ReCaptcha from '@/components/ReCaptcha';

const STAFF_ROLES = ['admin', 'sales_manager', 'account_manager', 'support_assistant', 'marketing_manager'];

const AdminLogin = () => {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [captchaToken, setCaptchaToken] = useState('');
  const recaptcha = useIsRecaptchaEnabled('admin_login');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e: typeof errors = {};
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (recaptcha.enabled && !captchaToken) {
      toast({ title: 'Please complete the CAPTCHA', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    const result = await signIn(trimmedEmail, password);
    setLoading(false);

    if (result.error) {
      toast({
        title: result.blocked ? 'Account Restricted' : 'Login failed',
        description: result.error.message || '',
        variant: 'destructive'
      });
      return;
    }

    // Check if user has staff role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const userRoles = (roles || []).map((r: any) => r.role);
      if (userRoles.some((r: string) => STAFF_ROLES.includes(r))) {
        toast({ title: 'Welcome back!' });
        navigate('/admin');
        return;
      }
      // Not a staff user — sign them out and show error
      await supabase.auth.signOut();
      toast({
        title: 'Access Denied',
        description: 'This login is for administrators only.',
        variant: 'destructive'
      });
      return;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[440px] bg-card rounded-2xl border border-border p-8 md:p-10 shadow-lg"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Login</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to the admin panel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="admin@email.com"
                className={`pl-10 h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                required
              />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                placeholder="••••••••"
                className={`pl-10 pr-10 h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>
          {recaptcha.enabled && (
            <ReCaptcha siteKey={recaptcha.siteKey} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
          )}
          <Button type="submit" size="lg" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
