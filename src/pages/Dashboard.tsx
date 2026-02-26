import { useState, useRef, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { Package, User, ShoppingBag, LogOut, Lock, LayoutDashboard, Eye, ChevronLeft, CheckCircle2, Clock, XCircle, Printer, Menu, Mail, ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import OrderStatusTracker from '@/components/OrderStatusTracker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { COUNTRY_CODES } from '@/pages/Register';

const Dashboard = () => {
  const { user, signOut, isAdmin } = useAuth();
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState('dashboard');
  const [orderFilter, setOrderFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const isEmailVerified = !!profile?.email_verified;

  const { data: orders = [] } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*, order_items(*)').eq('user_id', user!.id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const [profileForm, setProfileForm] = useState<any>(null);
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchCountry) return COUNTRY_CODES;
    const q = searchCountry.toLowerCase();
    return COUNTRY_CODES.filter(c => c.country.toLowerCase().includes(q) || c.code.includes(q));
  }, [searchCountry]);

  const initProfileForm = () => {
    if (profile && !profileForm) {
      setProfileForm({ full_name: profile.full_name, phone: profile.phone, address: profile.address, city: profile.city, zip_code: profile.zip_code, country: profile.country || '', email: user?.email || '' });
    }
  };

  const saveProfile = async () => {
    if (!profileForm || !user) return;
    // If email changed and not verified, update auth email
    if (!isEmailVerified && profileForm.email && profileForm.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: profileForm.email });
      if (emailError) {
        toast({ title: 'Error updating email', description: emailError.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Verification email sent', description: 'Please check your new email to verify the change.' });
    }
    const { email, ...profileData } = profileForm;
    const { error } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Profile updated!' });
  };

  const changePassword = async () => {
    if (pwForm.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.password });
    setPwLoading(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Password changed successfully!' });
      setPwForm({ password: '', confirm: '' });
    }
  };

  const resendVerification = async () => {
    if (!user?.email) return;

    // Check 15-minute cooldown
    const lastSentKey = 'verification_last_sent';
    const lastSent = localStorage.getItem(lastSentKey);
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent, 10);
      const cooldown = 15 * 60 * 1000; // 15 minutes
      if (elapsed < cooldown) {
        const remaining = Math.ceil((cooldown - elapsed) / 60000);
        toast({ title: 'Please wait', description: `You can resend the verification email in ${remaining} minute${remaining > 1 ? 's' : ''}.`, variant: 'destructive' });
        return;
      }
    }

    setResendingVerification(true);
    try {
      await supabase.functions.invoke('send-auth-email', {
        body: {
          action: 'send_verification',
          email: user.email,
          redirect_to: window.location.origin + '/verify-email',
        },
      });
      localStorage.setItem(lastSentKey, Date.now().toString());
      toast({ title: 'Verification email sent!', description: 'Please check your inbox.' });
    } catch {
      toast({ title: 'Failed to send verification email', variant: 'destructive' });
    }
    setResendingVerification(false);
  };

  if (isAdmin) return <Navigate to="/admin" replace />;

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o: any) => o.status === 'delivered').length;
  const pendingOrders = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing' || o.status === 'shipped').length;
  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;

  const filteredOrders = orderFilter
    ? orders.filter((o: any) => {
        if (orderFilter === 'completed') return o.status === 'delivered';
        if (orderFilter === 'pending') return o.status === 'pending' || o.status === 'processing' || o.status === 'shipped';
        if (orderFilter === 'cancelled') return o.status === 'cancelled';
        return true;
      })
    : orders;

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'orders', label: 'My Orders', icon: Package },
    { key: 'profile', label: 'My Profile', icon: User },
    { key: 'password', label: 'Password Change', icon: Lock },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const handlePrintOrder = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Order Invoice</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .header h1 { font-size: 24px; margin-bottom: 5px; }
        .header p { color: #666; font-size: 14px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-block h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; color: #444; }
        .info-block p { font-size: 13px; color: #555; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f5f5f5; text-align: left; padding: 10px 12px; font-size: 13px; font-weight: 600; border-bottom: 2px solid #ddd; }
        td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
        .text-right { text-align: right; }
        .totals { margin-top: 20px; text-align: right; }
        .totals .row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 6px; font-size: 14px; }
        .totals .total { font-size: 18px; font-weight: 700; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${printContent.innerHTML}
      <script>window.onload=function(){window.print();window.close();}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handleTabClick = (key: string) => {
    setTab(key);
    setOrderFilter(null);
    setSelectedOrder(null);
    if (key === 'profile') initProfileForm();
    if (isMobile) setMobileSidebarOpen(false);
  };

  // Sidebar component
  const SidebarContent = () => (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-col items-center text-center mb-6 pb-5 border-b border-border">
        <Avatar className="w-16 h-16 mb-3">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
            {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-display font-semibold text-foreground text-sm">{profile?.full_name || 'User'}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user?.email}</p>
          {isEmailVerified ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-green-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Email Verified</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[10px] text-amber-600 hover:text-amber-700"
              onClick={resendVerification}
              disabled={resendingVerification}
            >
              {resendingVerification ? '...' : <span className="flex items-center gap-1.5">Verify Now<ShieldAlert className="w-3 h-3" /></span>}
            </Button>
          )}
        </div>
      </div>
      <nav className="space-y-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => handleTabClick(t.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${tab === t.key && !selectedOrder ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </nav>
      <div className="mt-5 pt-4 border-t border-border">
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="lg:hidden mb-4">
            <Button variant="outline" size="sm" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
              <Menu className="w-4 h-4 mr-2" /> Menu
            </Button>
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className={`lg:w-64 shrink-0 ${isMobile && !mobileSidebarOpen ? 'hidden' : 'block'}`}>
              <div className="lg:sticky lg:top-32">
                <SidebarContent />
              </div>
            </aside>
            <div className="flex-1 min-w-0">
              {selectedOrder ? (
                <OrderDetailView
                  order={selectedOrder}
                  profile={profile}
                  user={user}
                  statusColor={statusColor}
                  onBack={() => setSelectedOrder(null)}
                  onPrint={handlePrintOrder}
                  printRef={printRef}
                />
              ) : (
                <>
                  {tab === 'dashboard' && (
                    <div>
                      <div className="bg-card rounded-xl border border-border p-6 mb-6">
                        <h1 className="text-2xl font-display font-bold text-foreground">Welcome back, {profile?.full_name || 'User'}!</h1>
                        <p className="text-muted-foreground mt-1">Dashboard Overview</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Total Orders', value: totalOrders, filter: null, icon: Package, color: 'bg-primary/10 text-primary' },
                          { label: 'Completed', value: completedOrders, filter: 'completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
                          { label: 'Pending', value: pendingOrders, filter: 'pending', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
                          { label: 'Cancelled', value: cancelledOrders, filter: 'cancelled', icon: XCircle, color: 'bg-red-100 text-red-700' },
                        ].map((card) => (
                          <button key={card.label} onClick={() => { setTab('orders'); setOrderFilter(card.filter); }}
                            className="bg-card rounded-xl border border-border p-5 text-left hover:shadow-md transition-shadow group">
                            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                              <card.icon className="w-5 h-5" />
                            </div>
                            <p className="text-2xl font-bold text-foreground">{card.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === 'orders' && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-display font-bold text-foreground">
                          {orderFilter ? `${orderFilter.charAt(0).toUpperCase() + orderFilter.slice(1)} Orders` : 'My Orders'}
                        </h2>
                        {orderFilter && (
                          <Button variant="ghost" size="sm" onClick={() => setOrderFilter(null)}>Show All</Button>
                        )}
                      </div>
                      {filteredOrders.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-border">
                          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground">No orders found</p>
                        </div>
                      ) : (
                        <div className="bg-card rounded-xl border border-border overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Order ID</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredOrders.map((order: any) => (
                                  <TableRow key={order.id}>
                                    <TableCell className="font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                                    <TableCell className="text-sm">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatPrice(Number(order.total), 2)}</TableCell>
                                    <TableCell>
                                      <Badge className={`${statusColor(order.status)} border-0 text-xs`}>{order.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                                        <Eye className="w-3 h-3 mr-1" /> View
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profile */}
                  {tab === 'profile' && profileForm && (
                    <div>
                      <h2 className="text-xl font-display font-bold text-foreground mb-6">My Profile</h2>
                      <div className="bg-card rounded-xl border border-border p-6 space-y-4 max-w-lg">
                        {/* Full Name */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                          <Input value={profileForm.full_name ?? ''} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                          <Input value={profileForm.phone ?? ''} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                        </div>

                        {/* Email field - readonly with verified badge (moved below phone) */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              value={isEmailVerified ? (user?.email || '') : (profileForm?.email ?? '')}
                              readOnly={isEmailVerified}
                              onChange={!isEmailVerified ? (e) => setProfileForm({ ...profileForm, email: e.target.value }) : undefined}
                              className={`pl-10 pr-24 h-11 ${isEmailVerified ? 'bg-muted/50 cursor-not-allowed' : ''}`}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              {isEmailVerified ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                      <ShieldCheck className="w-3 h-3" /> Verified
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Email Verified</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-amber-600 hover:text-amber-700"
                                  onClick={resendVerification}
                                  disabled={resendingVerification}
                                >
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {resendingVerification ? 'Sending...' : 'Verify Now'}
                                </Button>
                              )}
                            </div>
                          </div>
                          {!isEmailVerified && (
                            <p className="text-xs text-amber-600 mt-1">Your email is not verified. Click "Verify Now" to receive a verification link.</p>
                          )}
                        </div>

                        {/* Address */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                          <Input value={profileForm.address ?? ''} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
                        </div>

                        {/* City */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
                          <Input value={profileForm.city ?? ''} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                        </div>

                        {/* Zip Code */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Zip Code</label>
                          <Input value={profileForm.zip_code ?? ''} onChange={(e) => setProfileForm({ ...profileForm, zip_code: e.target.value })} />
                        </div>

                        {/* Country - searchable dropdown */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Country</label>
                          <Select value={profileForm.country || ''} onValueChange={(v) => setProfileForm({ ...profileForm, country: v })}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[280px]">
                              <div className="p-2">
                                <input
                                  type="text"
                                  placeholder="Search country..."
                                  value={searchCountry}
                                  onChange={(e) => setSearchCountry(e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                              </div>
                              {filteredCountries.map((c) => (
                                <SelectItem key={`${c.code}-${c.country}`} value={c.country}>
                                  <span className="flex items-center gap-1.5">
                                    <span>{c.flag}</span>
                                    <span>{c.country}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button onClick={saveProfile} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Save Changes</Button>
                      </div>
                    </div>
                  )}

                  {/* Password */}
                  {tab === 'password' && (
                    <div>
                      <h2 className="text-xl font-display font-bold text-foreground mb-6">Change Password</h2>
                      <div className="bg-card rounded-xl border border-border p-6 space-y-4 max-w-lg">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                          <Input type="password" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} placeholder="Min 6 characters" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm Password</label>
                          <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Re-enter password" />
                        </div>
                        <Button onClick={changePassword} disabled={pwLoading} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                          {pwLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

// Extracted Order Detail component
const OrderDetailView = ({ order, profile, user, statusColor, onBack, onPrint, printRef }: {
  order: any; profile: any; user: any; statusColor: (s: string) => string;
  onBack: () => void; onPrint: () => void; printRef: React.RefObject<HTMLDivElement>;
}) => {
  const { formatPrice } = useCurrency();
  return (
  <div>
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" onClick={onBack}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Orders
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint}>
        <Printer className="w-4 h-4 mr-1" /> Print Invoice
      </Button>
    </div>

    <OrderStatusTracker status={order.status} />

    <div ref={printRef}>
      <div className="header" />

      <div className="bg-card rounded-xl border border-border p-6 mb-4">
        <h3 className="font-semibold text-foreground mb-4">Order Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Order ID:</span><p className="font-mono font-medium">#{order.id.slice(0, 8)}</p></div>
          <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p></div>
          <div><span className="text-muted-foreground">Status:</span><p><Badge className={`${statusColor(order.status)} border-0 text-xs`}>{order.status}</Badge></p></div>
          <div><span className="text-muted-foreground">Payment:</span><p className="font-medium">{order.payment_method || '—'} ({order.payment_status})</p></div>
        </div>
      </div>

      {order.shipping_address && (
        <div className="bg-card rounded-xl border border-border p-6 mb-4">
          <h3 className="font-semibold text-foreground mb-3">Shipping Address</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">{(order.shipping_address as any).name || profile?.full_name}</p>
            <p>{(order.shipping_address as any).address}</p>
            <p>{(order.shipping_address as any).city}{(order.shipping_address as any).zip_code ? `, ${(order.shipping_address as any).zip_code}` : ''}</p>
            <p>{(order.shipping_address as any).phone || profile?.phone}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(order.order_items || []).map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.product_name}</p>
                  {item.variation && Object.keys(item.variation).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(item.variation).map(([k, v]) => `${k}: ${v}`).join(', ')}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatPrice(Number(item.price), 2)}</TableCell>
                <TableCell className="text-right font-medium">{formatPrice(Number(item.price) * item.quantity, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t border-border text-right">
          <p className="text-lg font-bold text-foreground">Total: {formatPrice(Number(order.total), 2)}</p>
        </div>
      </div>
    </div>
  </div>
);
};

export default Dashboard;
