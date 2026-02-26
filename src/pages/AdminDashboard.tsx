import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, BookOpen, MessageSquare, Star, Users, LogOut, Tag,
  Plus, Pencil, Trash2, Settings, ChevronLeft, ChevronRight, FileEdit, Truck, DollarSign,
  Search, Printer, Download, Eye, TrendingUp, Clock, CheckCircle, XCircle, Send,
  Mail, MailOpen, MessageCircle, Filter, Calendar, UserCheck, Shield, ScrollText, Briefcase, Layers, RotateCcw, ImageIcon, FilterX, Archive, Menu, X,
  Sun, Moon, Bell, User, Lock
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, PieChart, Pie, Cell, Legend, ComposedChart } from 'recharts';
import { usePagination, usePaginationWithSize, PaginationControls, FormField, hasPermission, ROLE_OPTIONS, ROLE_COLORS, ROLE_LABELS, ROLE_PERMISSIONS } from '@/components/admin/AdminShared';
import ProductsPanel from '@/components/admin/ProductsPanel';
import SettingsPanel from '@/components/admin/SettingsPanel';
import PagesPanel from '@/components/admin/PagesPanel';

import CustomersPanel from '@/components/admin/CustomersPanel';
import EmployeesPanel from '@/components/admin/EmployeesPanel';
import PermissionsPanel from '@/components/admin/PermissionsPanel';
import LogsPanel from '@/components/admin/LogsPanel';
import MediaPanel from '@/components/admin/MediaPanel';
import { MediaGalleryModal } from '@/components/admin/MediaPanel';
import ImagePicker from '@/components/admin/ImagePicker';
import MarketingPanel from '@/components/admin/MarketingPanel';
import BlogPanel from '@/components/admin/BlogPanel';
import TestimonialsPanel from '@/components/admin/TestimonialsPanel';
import ContactsPanel from '@/components/admin/ContactsPanel';
import CouponsPanel from '@/components/admin/CouponsPanel';
import ShippingPanel from '@/components/admin/ShippingPanel';
import OrderStatusTracker from '@/components/OrderStatusTracker';
import { usePageContent } from '@/hooks/usePageContent';
import { usePermissions } from '@/hooks/usePermissions';
import { useLogActivity } from '@/hooks/useLogActivity';
import { useCurrency } from '@/hooks/useCurrency';

type Tab = 'dashboard' | 'products' | 'categories' | 'orders' | 'coupons' | 'blog' | 'testimonials' | 'contacts' | 'customers' | 'employees' | 'permissions' | 'pages' | 'settings' | 'revenue' | 'logs' | 'variants' | 'media' | 'marketing' | 'shipping';

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100, 200, 500, 1000];

// Map DB permission keys to sidebar tab keys
const PERMISSION_TO_TAB: Record<string, string> = {
  dashboard_access: 'dashboard',
  product_view: 'products', product_add: 'products', product_edit: 'products', product_delete: 'products',
  category_view: 'categories', category_add: 'categories', category_edit: 'categories',
  variant_view: 'variants', variant_add: 'variants',
  order_view: 'orders', order_manage: 'orders',
  coupon_view: 'coupons', coupon_add: 'coupons',
  revenue_access: 'revenue',
  blog_view: 'blog', blog_add: 'blog',
  testimonial_view: 'testimonials', testimonial_add: 'testimonials',
  message_access: 'contacts',
  media_access: 'media',
  page_access: 'pages',
  customer_view: 'customers',
  marketing_access: 'marketing',
  logs_access: 'logs',
  settings_access: 'settings',
  shipping_access: 'shipping',
};

// Admin always has full access; staff check DB permissions
const getStaffAllowedTabs = (permissions: any[]): string[] => {
  const tabs = new Set<string>();
  permissions.filter((p: any) => p.enabled).forEach((p: any) => {
    const tab = PERMISSION_TO_TAB[p.permission];
    if (tab) tabs.add(tab);
  });
  return Array.from(tabs);
};

const ADMIN_ALL_TABS = ['dashboard', 'products', 'categories', 'variants', 'orders', 'coupons', 'revenue', 'blog', 'testimonials', 'contacts', 'customers', 'employees', 'permissions', 'pages', 'settings', 'logs', 'media', 'marketing', 'shipping'];

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'send_to_courier', 'delivered', 'returned', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'unpaid', 'cod', 'refunded'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  send_to_courier: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  returned: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing',
  send_to_courier: 'Send to Courier', shipped: 'Shipped', delivered: 'Delivered',
  returned: 'Returned', cancelled: 'Cancelled',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700', cod: 'bg-blue-100 text-blue-700',
  refunded: 'bg-violet-100 text-violet-700',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', paid: 'Paid', unpaid: 'Unpaid', cod: 'COD', refunded: 'Refunded',
};

const SIDEBAR_ICON_COLORS: Record<string, string> = {
  dashboard: 'text-blue-500', products: 'text-emerald-500', categories: 'text-amber-500',
  variants: 'text-purple-500', orders: 'text-violet-500', revenue: 'text-green-500',
  blog: 'text-pink-500', testimonials: 'text-yellow-500',
  contacts: 'text-teal-500', media: 'text-rose-500', pages: 'text-indigo-500',
  customers: 'text-orange-500', employees: 'text-fuchsia-500', permissions: 'text-sky-500',
  settings: 'text-gray-500', logs: 'text-slate-500',
  marketing: 'text-pink-600',
  coupons: 'text-lime-600',
  shipping: 'text-cyan-500',
};

const getPaymentDisplay = (order: any) => {
  const method = order.payment_method || 'N/A';
  const payStatus = order.payment_status || 'pending';
  const methodName = method === 'manual_payment' ? 'Manual' : method === 'cod' ? 'Cash on Delivery' : method === 'sslcommerz' ? 'SSLCommerz' : method === 'bkash' ? 'bKash' : method === 'nagad' ? 'Nagad' : method;
  return `${methodName} (${PAYMENT_STATUS_LABELS[payStatus] || payStatus})`;
};

// Premium chart color palette
const CHART_COLORS = {
  primary: 'hsl(220, 70%, 50%)',
  primaryLight: 'hsl(220, 70%, 65%)',
  secondary: 'hsl(160, 60%, 45%)',
  secondaryLight: 'hsl(160, 60%, 60%)',
  accent: 'hsl(280, 55%, 55%)',
  accentLight: 'hsl(280, 55%, 70%)',
  amber: 'hsl(35, 85%, 55%)',
  amberLight: 'hsl(35, 85%, 70%)',
};

const DOUGHNUT_COLORS = [CHART_COLORS.primary, 'hsl(220, 15%, 80%)'];

const AdminDashboard = () => {
  const { signOut, isAdmin } = useAuth();
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('admin-active-tab');
    return (saved as Tab) || 'dashboard';
  });
  const handleSetTab = (newTab: Tab) => {
    setTab(newTab);
    localStorage.setItem('admin-active-tab', newTab);
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin-dark-mode');
    if (saved !== null) {
      const isDark = saved === 'true';
      document.documentElement.classList.toggle('dark', isDark);
      return isDark;
    }
    return document.documentElement.classList.contains('dark');
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<any>(null);
  const [pwForm, setPwForm] = useState({ current: '', password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'password'>('info');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = usePermissions();

  const { data: userRole } = useQuery({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id);
      if (!data || data.length === 0) return 'user';
      const roles = data.map((r: any) => r.role);
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('sales_manager')) return 'sales_manager';
      if (roles.includes('account_manager')) return 'account_manager';
      if (roles.includes('support_assistant')) return 'support_assistant';
      if (roles.includes('marketing_manager')) return 'marketing_manager';
      return roles[0] || 'user';
    },
    enabled: !!user,
  });
  const role = (userRole as string) || 'admin';
  const isAdminRole = role === 'admin';

  // Fetch DB-based role permissions for staff
  const { data: dbRolePermissions = [] } = useQuery({
    queryKey: ['admin-permissions', role],
    queryFn: async () => {
      const { data } = await supabase.from('role_permissions').select('*').eq('role', role);
      return data ?? [];
    },
    enabled: !!role && role !== 'admin',
  });

  const allowedTabs = isAdminRole ? ADMIN_ALL_TABS : getStaffAllowedTabs(dbRolePermissions);
  // Staff always get dashboard + employees/permissions are admin-only
  const canAccessTab = (tabKey: string) => {
    if (isAdminRole) return true;
    // Staff never see employees, permissions (admin only)
    if (['employees', 'permissions'].includes(tabKey)) return false;
    return allowedTabs.includes(tabKey);
  };

  const { data: adminProfile } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const { data: sidebarSiteTitle } = usePageContent('site_title');

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('admin-dark-mode', String(next));
  };

  const openProfile = () => {
    setProfileForm({
      full_name: adminProfile?.full_name || '',
      phone: adminProfile?.phone || '',
      address: adminProfile?.address || '',
      city: adminProfile?.city || '',
      zip_code: adminProfile?.zip_code || '',
      country: adminProfile?.country || '',
    });
    setProfileTab('info');
    setPwForm({ current: '', password: '', confirm: '' });
    setProfileOpen(true);
  };

  const saveAdminProfile = async () => {
    if (!profileForm || !user) return;
    const { email, ...profileData } = profileForm;
    const { error } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    // Update email if changed
    if (email && email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) { toast({ title: 'Email update failed', description: emailError.message, variant: 'destructive' }); return; }
    }
    toast({ title: 'Profile updated!' });
    queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
  };

  const changeAdminPassword = async () => {
    if (!pwForm.current) { toast({ title: 'Please enter current password', variant: 'destructive' }); return; }
    if (pwForm.password.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    if (pwForm.password !== pwForm.confirm) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    setPwLoading(true);
    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: pwForm.current });
    if (signInError) { setPwLoading(false); toast({ title: 'Current password is incorrect', variant: 'destructive' }); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.password });
    setPwLoading(false);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Password changed!' }); setPwForm({ current: '', password: '', confirm: '' }); }
  };

  const sidebarGroups = [
    { label: 'Main', items: [{ key: 'dashboard' as Tab, label: 'Overview', icon: LayoutDashboard }] },
    {
      label: 'E-commerce',
      items: [
        { key: 'products' as Tab, label: 'Products', icon: Package },
        { key: 'categories' as Tab, label: 'Categories', icon: FolderTree },
        { key: 'variants' as Tab, label: 'Variants', icon: Layers },
        { key: 'orders' as Tab, label: 'Orders', icon: ShoppingCart },
        { key: 'coupons' as Tab, label: 'Coupons', icon: Tag },
        { key: 'revenue' as Tab, label: 'Sales Report', icon: DollarSign },
        { key: 'shipping' as Tab, label: 'Shipping', icon: Truck },
        { key: 'marketing' as Tab, label: 'Marketing', icon: Mail },
      ],
    },
    {
      label: 'Content',
      items: [
        { key: 'blog' as Tab, label: 'Blog Posts', icon: BookOpen },
        { key: 'testimonials' as Tab, label: 'Testimonials', icon: Star },
        { key: 'contacts' as Tab, label: 'Messages', icon: MessageSquare },
        { key: 'media' as Tab, label: 'Media', icon: ImageIcon },
        { key: 'pages' as Tab, label: 'Pages', icon: FileEdit },
      ],
    },
    {
      label: 'People',
      items: [
        { key: 'customers' as Tab, label: 'Customers', icon: UserCheck },
        { key: 'employees' as Tab, label: 'Employees', icon: Briefcase },
        { key: 'permissions' as Tab, label: 'Permissions', icon: Shield },
      ],
    },
    {
      label: 'System',
      items: [
        { key: 'logs' as Tab, label: 'Logs', icon: ScrollText },
        { key: 'settings' as Tab, label: 'Settings', icon: Settings },
      ],
    },
  ];

  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: async () => { const { data } = await supabase.from('products').select('*, category:categories(name)').order('created_at', { ascending: false }); return data ?? []; } });
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: async () => { const { data } = await supabase.from('categories').select('*').order('name'); return data ?? []; } });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: async () => { const { data } = await supabase.from('orders').select('*, order_items(*, products(title, image_url))').order('created_at', { ascending: false }); return data ?? []; } });
  const { data: blogs = [] } = useQuery({ queryKey: ['admin-blogs'], queryFn: async () => { const { data } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false }); return data ?? []; } });
  const { data: testimonials = [] } = useQuery({ queryKey: ['admin-testimonials'], queryFn: async () => { const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false }); return data ?? []; } });
  const { data: contacts = [] } = useQuery({ queryKey: ['admin-contacts'], queryFn: async () => { const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }); return data ?? []; } });

  const unreadMessages = useMemo(() => {
    return contacts.filter((c: any) => !c.is_read && !c.is_deleted).length;
  }, [contacts]);

  const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered').length;
  const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;
  const courierOrders = orders.filter((o: any) => o.status === 'send_to_courier' || o.status === 'shipped').length;
  const returnedOrders = orders.filter((o: any) => o.status === 'returned').length;
  const returnedPct = orders.length > 0 ? ((returnedOrders / orders.length) * 100).toFixed(1) : '0';
  const revenue = orders.filter((o: any) => o.status !== 'cancelled' && o.status !== 'returned').reduce((sum: number, o: any) => sum + Number(o.total), 0);

  const dashboardCards = [
    { label: 'Complete Orders', count: deliveredOrders, tab: 'orders' as Tab, icon: CheckCircle, color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', iconColor: 'text-emerald-600', textColor: 'text-emerald-700' },
    { label: 'Pending', count: pendingOrders, tab: 'orders' as Tab, icon: Clock, color: 'from-amber-500/10 to-amber-600/5 border-amber-200', iconColor: 'text-amber-600', textColor: 'text-amber-700' },
    { label: 'Delivered', count: deliveredOrders, tab: 'orders' as Tab, icon: CheckCircle, color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', iconColor: 'text-emerald-600', textColor: 'text-emerald-700' },
    { label: 'Send to Courier', count: courierOrders, tab: 'orders' as Tab, icon: Send, color: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200', iconColor: 'text-indigo-600', textColor: 'text-indigo-700' },
    { label: 'Returned', count: returnedOrders, tab: 'orders' as Tab, icon: RotateCcw, color: 'from-orange-500/10 to-orange-600/5 border-orange-200', iconColor: 'text-orange-600', textColor: 'text-orange-700', pct: `${returnedPct}%` },
    { label: 'Cancelled', count: cancelledOrders, tab: 'orders' as Tab, icon: XCircle, color: 'from-rose-500/10 to-rose-600/5 border-rose-200', iconColor: 'text-rose-600', textColor: 'text-rose-700' },
    { label: 'Revenue', count: formatPrice(revenue, 0), tab: 'revenue' as Tab, icon: DollarSign, color: 'from-violet-500/10 to-violet-600/5 border-violet-200', iconColor: 'text-violet-600', textColor: 'text-violet-700' },
    { label: 'Products', count: products.length, tab: 'products' as Tab, icon: Package, color: 'from-cyan-500/10 to-cyan-600/5 border-cyan-200', iconColor: 'text-cyan-600', textColor: 'text-cyan-700' },
  ];

  const logActivity = useLogActivity();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border p-4 flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-4 px-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">{((sidebarSiteTitle as string) || 'S').charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground truncate max-w-[150px] leading-tight">{(sidebarSiteTitle as string) || 'Admin Panel'}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{ROLE_LABELS[role] || role}</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {sidebarGroups.map((group) => {
            const visibleItems = group.items.filter((item) => canAccessTab(item.key));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 mb-1 font-semibold">{group.label}</p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <button key={item.key} onClick={() => { handleSetTab(item.key); setSidebarOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${tab === item.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}>
                      <item.icon className={`w-4 h-4 ${tab === item.key ? '' : SIDEBAR_ICON_COLORS[item.key] || ''}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="pt-4 border-t border-border space-y-2">
          <Link to="/"><Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">← Back to Site</Button></Link>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={signOut}><LogOut className="w-4 h-4 mr-2" /> Logout</Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto">
        {/* Header bar */}
        <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted lg:hidden">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <span className="font-display text-sm font-bold text-foreground capitalize lg:hidden">{tab === 'dashboard' ? 'Overview' : tab.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Dark/Light mode */}
            <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-muted transition-colors" title={darkMode ? 'Light mode' : 'Dark mode'}>
              {darkMode ? <Sun className="w-4.5 h-4.5 text-muted-foreground" /> : <Moon className="w-4.5 h-4.5 text-muted-foreground" />}
            </button>

            {/* Messages */}
            <button onClick={() => handleSetTab('contacts')} className="relative p-2 rounded-lg hover:bg-muted transition-colors" title="Messages">
              <MessageSquare className="w-4.5 h-4.5 text-muted-foreground" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </button>

            {/* Admin profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {(adminProfile?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                    {adminProfile?.full_name || 'Admin'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">{adminProfile?.full_name || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openProfile} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { openProfile(); setTimeout(() => setProfileTab('password'), 50); }} className="cursor-pointer">
                  <Lock className="w-4 h-4 mr-2" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {tab === 'dashboard' && <DashboardOverview orders={orders} dashboardCards={dashboardCards} setTab={handleSetTab} />}
          {tab === 'revenue' && <RevenuePanel orders={orders} can={can} />}
          {tab === 'products' && <ProductsPanel products={products} categories={categories} qc={queryClient} can={can} logActivity={logActivity} />}
          {tab === 'categories' && <CategoriesPanel categories={categories} products={products} qc={queryClient} can={can} logActivity={logActivity} />}
          {tab === 'variants' && <VariantsPanel can={can} logActivity={logActivity} />}
          {tab === 'orders' && <OrdersPanel orders={orders} qc={queryClient} logActivity={logActivity} can={can} />}
          {tab === 'coupons' && <CouponsPanel can={can} logActivity={logActivity} />}
          {tab === 'blog' && <BlogPanel blogs={blogs} qc={queryClient} can={can} logActivity={logActivity} />}
          {tab === 'testimonials' && <TestimonialsPanel testimonials={testimonials} qc={queryClient} can={can} logActivity={logActivity} />}
          {tab === 'contacts' && <ContactsPanel contacts={contacts} qc={queryClient} can={can} logActivity={logActivity} />}
          {tab === 'customers' && <CustomersPanel can={can} logActivity={logActivity} />}
          {tab === 'employees' && <EmployeesPanel logActivity={logActivity} />}
          {tab === 'permissions' && <PermissionsPanel logActivity={logActivity} />}
          {tab === 'logs' && <LogsPanel isAdmin={isAdmin} />}
          {tab === 'media' && <MediaPanel can={can} isAdmin={isAdminRole} />}
          {tab === 'pages' && <PagesPanel can={can} logActivity={logActivity} />}
          
          {tab === 'settings' && <SettingsPanel can={can} logActivity={logActivity} />}
          {tab === 'marketing' && <MarketingPanel can={can} logActivity={logActivity} />}
          {tab === 'shipping' && <ShippingPanel can={can} logActivity={logActivity} />}
        </div>
      </main>

      {/* Admin Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAdminRole ? 'Admin Profile' : 'My Profile'}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button variant={profileTab === 'info' ? 'default' : 'outline'} size="sm" onClick={() => setProfileTab('info')}>
              <User className="w-3.5 h-3.5 mr-1.5" /> Profile Info
            </Button>
            <Button variant={profileTab === 'password' ? 'default' : 'outline'} size="sm" onClick={() => setProfileTab('password')}>
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Change Password
            </Button>
          </div>

          {profileTab === 'info' && profileForm && (
            <div className="space-y-3">
              <FormField label="Full Name" required>
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              </FormField>
              <FormField label="Email" description={!isAdminRole ? 'Staff members cannot edit email' : undefined}>
                <Input
                  value={profileForm.email ?? user?.email ?? ''}
                  onChange={(e) => isAdminRole && setProfileForm({ ...profileForm, email: e.target.value })}
                  readOnly={!isAdminRole}
                  disabled={!isAdminRole}
                  className={!isAdminRole ? 'opacity-60 cursor-not-allowed' : ''}
                />
              </FormField>
              <FormField label="Phone">
                <Input value={profileForm.phone || ''} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </FormField>
              <FormField label="Address">
                <Input value={profileForm.address || ''} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City">
                  <Input value={profileForm.city || ''} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} />
                </FormField>
                <FormField label="Zip Code">
                  <Input value={profileForm.zip_code || ''} onChange={(e) => setProfileForm({ ...profileForm, zip_code: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Country">
                <Input value={profileForm.country || ''} onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })} />
              </FormField>
              <Button onClick={saveAdminProfile} className="w-full">Save Profile</Button>
            </div>
          )}

          {profileTab === 'password' && (
            <div className="space-y-3">
              <FormField label="Current Password" required>
                <Input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} placeholder="Enter current password" />
              </FormField>
              <FormField label="New Password" required>
                <Input type="password" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} placeholder="Min 6 characters" />
              </FormField>
              <FormField label="Confirm Password" required>
                <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="Re-enter password" />
              </FormField>
              <Button onClick={changeAdminPassword} disabled={pwLoading} className="w-full">
                {pwLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* =================== PREMIUM CHART TOOLTIP =================== */
const PremiumTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl shadow-xl px-4 py-3 backdrop-blur-sm">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-foreground">{formatter ? formatter(p.value) : p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

/* =================== DASHBOARD OVERVIEW =================== */
const DashboardOverview = ({ orders, dashboardCards, setTab }: { orders: any[]; dashboardCards: any[]; setTab: (t: Tab) => void }) => {
  const { formatPrice } = useCurrency();
  const [sparklineRange, setSparklineRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [revenueChartRange, setRevenueChartRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [compareRange, setCompareRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [pieCardRange, setPieCardRange] = useState('monthly');

  const getGroupedData = (range: string, filterFn?: (o: any) => boolean) => {
    const filtered = filterFn ? orders.filter(filterFn) : orders;
    const map: Record<string, number> = {};
    filtered.forEach((o: any) => {
      const d = new Date(o.created_at);
      let key: string;
      if (range === 'daily') key = d.toISOString().split('T')[0];
      else if (range === 'weekly') { const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); key = ws.toISOString().split('T')[0]; }
      else if (range === 'yearly') key = `${d.getFullYear()}`;
      else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([k, v]) => ({ label: k.length > 7 ? k.slice(5) : k, count: v }));
  };

  const totalSparkline = getGroupedData(sparklineRange);
  const pendingSparkline = getGroupedData(sparklineRange, (o) => o.status === 'pending');
  const deliveredSparkline = getGroupedData(sparklineRange, (o) => o.status === 'delivered');

  const revenueChartData = useMemo(() => {
    const now = new Date();
    const validOrders = orders.filter((o: any) => o.status !== 'cancelled' && o.status !== 'returned');

    if (revenueChartRange === 'daily') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hourlyMap: Record<number, { rev: number; count: number }> = {};
      for (let h = 0; h <= now.getHours(); h++) hourlyMap[h] = { rev: 0, count: 0 };
      validOrders.forEach((o: any) => {
        const d = new Date(o.created_at);
        if (d >= todayStart && d <= now) { const h = d.getHours(); hourlyMap[h] = { rev: (hourlyMap[h]?.rev || 0) + Number(o.total), count: (hourlyMap[h]?.count || 0) + 1 }; }
      });
      return Object.entries(hourlyMap).map(([h, v]) => ({
        label: `${Number(h) % 12 || 12}${Number(h) < 12 ? 'AM' : 'PM'}`,
        revenue: Math.round(v.rev),
        sales: v.count,
      }));
    } else if (revenueChartRange === 'weekly') {
      const result: { label: string; revenue: number; sales: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const dayOrders = validOrders.filter((o: any) => { const od = new Date(o.created_at); return od >= dayStart && od < dayEnd; });
        result.push({ label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), revenue: Math.round(dayOrders.reduce((s: number, o: any) => s + Number(o.total), 0)), sales: dayOrders.length });
      }
      return result;
    } else if (revenueChartRange === 'monthly') {
      const result: { label: string; revenue: number; sales: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        const dayOrders = validOrders.filter((o: any) => { const od = new Date(o.created_at); return od >= dayStart && od < dayEnd; });
        result.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: Math.round(dayOrders.reduce((s: number, o: any) => s + Number(o.total), 0)), sales: dayOrders.length });
      }
      return result;
    } else {
      const result: { label: string; revenue: number; sales: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthOrders = validOrders.filter((o: any) => { const od = new Date(o.created_at); return od >= monthStart && od < monthEnd; });
        result.push({ label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: Math.round(monthOrders.reduce((s: number, o: any) => s + Number(o.total), 0)), sales: monthOrders.length });
      }
      return result;
    }
  }, [orders, revenueChartRange]);

  const compareData = useMemo(() => {
    const now = new Date();
    const getRevenue = (from: Date, to: Date) => orders.filter((o: any) => { const d = new Date(o.created_at); return d >= from && d <= to && o.status !== 'cancelled' && o.status !== 'returned'; }).reduce((s: number, o: any) => s + Number(o.total), 0);
    const getSales = (from: Date, to: Date) => orders.filter((o: any) => { const d = new Date(o.created_at); return d >= from && d <= to && o.status !== 'cancelled' && o.status !== 'returned'; }).length;
    let currentLabel: string, prevLabel: string, currentRev: number, prevRev: number, currentSales: number, prevSales: number;
    if (compareRange === 'day') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      currentRev = getRevenue(todayStart, now); prevRev = getRevenue(yesterdayStart, todayStart);
      currentSales = getSales(todayStart, now); prevSales = getSales(yesterdayStart, todayStart);
      currentLabel = 'Today'; prevLabel = 'Yesterday';
    } else if (compareRange === 'week') {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      currentRev = getRevenue(weekStart, now); prevRev = getRevenue(lastWeekStart, weekStart);
      currentSales = getSales(weekStart, now); prevSales = getSales(lastWeekStart, weekStart);
      currentLabel = 'This Week'; prevLabel = 'Last Week';
    } else if (compareRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      currentRev = getRevenue(monthStart, now); prevRev = getRevenue(lastMonthStart, monthStart);
      currentSales = getSales(monthStart, now); prevSales = getSales(lastMonthStart, monthStart);
      currentLabel = 'This Month'; prevLabel = 'Last Month';
    } else {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear(), 0, 1);
      currentRev = getRevenue(yearStart, now); prevRev = getRevenue(lastYearStart, lastYearEnd);
      currentSales = getSales(yearStart, now); prevSales = getSales(lastYearStart, lastYearEnd);
      currentLabel = 'This Year'; prevLabel = 'Last Year';
    }
    const total = currentRev + prevRev || 1;
    const revChange = prevRev > 0 ? (((currentRev - prevRev) / prevRev) * 100).toFixed(1) : currentRev > 0 ? '100.0' : '0.0';
    const salesChange = prevSales > 0 ? (((currentSales - prevSales) / prevSales) * 100).toFixed(1) : currentSales > 0 ? '100.0' : '0.0';
    return {
      data: [{ name: currentLabel, value: currentRev }, { name: prevLabel, value: prevRev }],
      currentPct: ((currentRev / total) * 100).toFixed(1),
      currentLabel, prevLabel,
      current: { revenue: currentRev, sales: currentSales },
      prev: { revenue: prevRev, sales: prevSales },
      revChange, salesChange,
    };
  }, [orders, compareRange]);

  const sparkColors = [
    { title: 'Total Orders', color: CHART_COLORS.primary, gradientId: 'spark-total' },
    { title: 'Pending Orders', color: CHART_COLORS.amber, gradientId: 'spark-pending' },
    { title: 'Delivered Orders', color: CHART_COLORS.secondary, gradientId: 'spark-delivered' },
  ];

  const SparklineCard = ({ title, data, color, gradientId }: { title: string; data: any[]; color: string; gradientId: string }) => (
    <div className="bg-card rounded-xl border border-border p-4 flex-1 min-w-[200px] hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-lg font-bold text-foreground">{data.reduce((s, d) => s + d.count, 0)}</p>
      </div>
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={data}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {dashboardCards.map((card: any) => (
          <button key={card.label} onClick={() => setTab(card.tab)} className={`bg-gradient-to-br ${card.color} rounded-xl border p-5 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group relative`}>
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.iconColor} opacity-80`} />
              {card.pct && <span className="text-xs font-semibold text-muted-foreground">{card.pct}</span>}
              {!card.pct && <TrendingUp className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className={`text-2xl font-bold ${card.textColor}`}>{card.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </button>
        ))}
      </div>

      {(() => {
        const PIE_RANGE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, '3months': 90, '6months': 180, '12months': 365 };
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (PIE_RANGE_DAYS[pieCardRange] || 30));
        const filtered = orders.filter((o: any) => new Date(o.created_at) >= cutoff);
        const totalNonCancelled = filtered.filter((o: any) => o.status !== 'cancelled').length || 1;
        const completeCount = filtered.filter((o: any) => o.status === 'delivered').length;
        const incompleteCount = filtered.filter((o: any) => o.status !== 'delivered' && o.status !== 'returned' && o.status !== 'cancelled').length;
        const returnCount = filtered.filter((o: any) => o.status === 'returned').length;

        const cards = [
          { title: 'Complete Orders', count: completeCount, pct: ((completeCount / totalNonCancelled) * 100).toFixed(1), color: '#10b981', textClass: 'text-emerald-600' },
          { title: 'Incomplete Orders', count: incompleteCount, pct: ((incompleteCount / totalNonCancelled) * 100).toFixed(1), color: '#f59e0b', textClass: 'text-amber-600' },
          { title: 'Return Rate', count: returnCount, pct: ((returnCount / totalNonCancelled) * 100).toFixed(1), color: '#ef4444', textClass: 'text-red-600' },
        ];

        return (
          <div className="relative mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-foreground text-sm">Order Status Overview</h3>
              <Select value={pieCardRange} onValueChange={setPieCardRange}>
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="3months">3 Month</SelectItem>
                  <SelectItem value="6months">6 Month</SelectItem>
                  <SelectItem value="12months">12 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 flex-wrap">
              {cards.map((card) => {
                const pieData = [{ name: card.title, value: card.count }, { name: 'Others', value: totalNonCancelled - card.count }];
                return (
                  <div key={card.title} className="bg-card rounded-xl border border-border p-4 flex-1 min-w-[200px] hover:shadow-md transition-shadow flex flex-col items-center">
                    <p className="text-sm font-semibold text-foreground">{card.title}</p>
                    <ResponsiveContainer width="100%" height={100}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" strokeWidth={0}>
                          <Cell fill={card.color} />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <span className={`text-xs font-semibold ${card.textClass} mt-1`}>{card.pct}%</span>
                    <p className="text-[10px] text-muted-foreground">{card.count} of {totalNonCancelled} orders</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-display font-semibold text-foreground">Revenue & Sales Trend</h3>
            <Select value={revenueChartRange} onValueChange={(v: any) => setRevenueChartRange(v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">1 Week</SelectItem><SelectItem value="monthly">1 Month</SelectItem><SelectItem value="yearly">1 Year</SelectItem></SelectContent>
            </Select>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={revenueChartData}>
                <defs>
                  <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={CHART_COLORS.primaryLight} stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="dashSalesGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.secondaryLight} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: revenueChartRange === 'monthly' ? 9 : 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={revenueChartRange === 'monthly' ? 2 : 0} angle={revenueChartRange === 'monthly' ? -45 : 0} textAnchor={revenueChartRange === 'monthly' ? 'end' : 'middle'} height={revenueChartRange === 'monthly' ? 50 : 30} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<PremiumTooltip formatter={(v: number, key: string) => key === 'revenue' ? formatPrice(v, 0) : v} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="revenue" fill="url(#dashRevGrad)" radius={[6, 6, 0, 0]} barSize={revenueChartRange === 'monthly' ? 12 : 32} />
                <Line yAxisId="right" type="monotone" dataKey="sales" stroke={CHART_COLORS.secondary} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.secondary }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-20">No revenue data yet.</p>}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground text-sm">Revenue Comparison</h3>
            <Select value={compareRange} onValueChange={(v: any) => setCompareRange(v)}>
              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="month">Monthly</SelectItem><SelectItem value="year">Yearly</SelectItem></SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={compareData.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {compareData.data.map((_, i) => <Cell key={i} fill={DOUGHNUT_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<PremiumTooltip formatter={(v: number) => formatPrice(v, 0)} />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">{compareData.currentLabel} Revenue</span><span className="font-bold text-foreground">{formatPrice(compareData.current.revenue, 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{compareData.prevLabel} Revenue</span><span className="font-bold text-foreground">{formatPrice(compareData.prev.revenue, 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Revenue Change</span><span className={`font-bold ${Number(compareData.revChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(compareData.revChange) >= 0 ? '+' : ''}{compareData.revChange}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sales Change</span><span className={`font-bold ${Number(compareData.salesChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(compareData.salesChange) >= 0 ? '+' : ''}{compareData.salesChange}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =================== SALES REPORT =================== */
const REVENUE_PRESETS = [
  { label: 'Last 7 days', days: 7 }, { label: 'Last 15 days', days: 15 },
  { label: 'Last 1 month', days: 30 }, { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 }, { label: 'Last 12 months', days: 365 },
  { label: 'All time', days: 0 },
];

const RevenuePanel = ({ orders, can = () => true }: { orders: any[]; can?: (p: string) => boolean }) => {
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const [preset, setPreset] = useState(6);
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
const [compareRange, setCompareRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [cardPreset, setCardPreset] = useState(2); // default "Last 1 month"
  const [returnedPreset, setReturnedPreset] = useState(6);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [useCustomDate, setUseCustomDate] = useState(false);
  // Separate state for report download
  const [reportPreset, setReportPreset] = useState(6);
  const [reportDateFrom, setReportDateFrom] = useState<Date | undefined>();
  const [reportDateTo, setReportDateTo] = useState<Date | undefined>();
  const [useReportCustomDate, setUseReportCustomDate] = useState(false);
  const [reportPieRange, setReportPieRange] = useState('monthly');

  const filteredOrders = useMemo(() => {
    if (useCustomDate && customDateFrom) {
      const from = new Date(customDateFrom); from.setHours(0,0,0,0);
      const to = customDateTo ? new Date(customDateTo) : new Date(); to.setHours(23,59,59,999);
      return orders.filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= from && new Date(o.created_at) <= to);
    }
    const selectedPreset = REVENUE_PRESETS[preset] || REVENUE_PRESETS[6];
    if (selectedPreset.days === 0) return orders.filter((o: any) => o.status !== 'cancelled');
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - selectedPreset.days);
    return orders.filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= cutoff);
  }, [orders, preset, useCustomDate, customDateFrom, customDateTo]);

  // Separate filtered orders for report download only
  const reportFilteredOrders = useMemo(() => {
    if (useReportCustomDate && reportDateFrom) {
      const from = new Date(reportDateFrom); from.setHours(0,0,0,0);
      const to = reportDateTo ? new Date(reportDateTo) : new Date(); to.setHours(23,59,59,999);
      return orders.filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= from && new Date(o.created_at) <= to);
    }
    const selectedPreset = REVENUE_PRESETS[reportPreset] || REVENUE_PRESETS[6];
    if (selectedPreset.days === 0) return orders.filter((o: any) => o.status !== 'cancelled');
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - selectedPreset.days);
    return orders.filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= cutoff);
  }, [orders, reportPreset, useReportCustomDate, reportDateFrom, reportDateTo]);

  const CARD_PRESETS = [
    { label: 'Daily', days: 1 }, { label: 'Weekly', days: 7 }, { label: 'Monthly', days: 30 },
    { label: '3 Month', days: 90 }, { label: '6 Month', days: 180 }, { label: '12 Month', days: 365 },
  ];
  const cardFilteredOrders = useMemo(() => {
    const p = CARD_PRESETS[cardPreset] || CARD_PRESETS[2];
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - p.days);
    return orders.filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= cutoff);
  }, [orders, cardPreset]);

  const totalRevenue = cardFilteredOrders.filter((o: any) => o.status !== 'returned').reduce((s: number, o: any) => s + Number(o.total), 0);
  const totalSales = cardFilteredOrders.filter((o: any) => o.status !== 'returned').length;
  const totalOrders = cardFilteredOrders.length;
  const avgOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

  const returnedFilteredOrders = useMemo(() => {
    const p = REVENUE_PRESETS[returnedPreset] || REVENUE_PRESETS[6];
    if (p.days === 0) return orders;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - p.days);
    return orders.filter((o: any) => new Date(o.created_at) >= cutoff);
  }, [orders, returnedPreset]);
  const returnedCount = cardFilteredOrders.filter((o: any) => o.status === 'returned').length;
  const returnedPct = cardFilteredOrders.length > 0 ? ((returnedCount / cardFilteredOrders.length) * 100).toFixed(1) : '0';

  const chartData = useMemo(() => {
    const now = new Date();
    const validOrders = filteredOrders.filter((o: any) => o.status !== 'returned');

    if (groupBy === 'daily') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hourlyMap: Record<number, { revenue: number; count: number }> = {};
      for (let h = 0; h <= now.getHours(); h++) hourlyMap[h] = { revenue: 0, count: 0 };
      validOrders.forEach((o: any) => { const d = new Date(o.created_at); if (d >= todayStart && d <= now) { hourlyMap[d.getHours()] = { revenue: (hourlyMap[d.getHours()]?.revenue || 0) + Number(o.total), count: (hourlyMap[d.getHours()]?.count || 0) + 1 }; } });
      return Object.entries(hourlyMap).map(([h, v]) => ({ label: `${Number(h) % 12 || 12}${Number(h) < 12 ? 'AM' : 'PM'}`, revenue: Math.round(v.revenue), sales: v.count }));
    } else if (groupBy === 'weekly') {
      const result: any[] = [];
      for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1); const dayOrders = validOrders.filter((o: any) => { const od = new Date(o.created_at); return od >= dayStart && od < dayEnd; }); result.push({ label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }), revenue: Math.round(dayOrders.reduce((s: number, o: any) => s + Number(o.total), 0)), sales: dayOrders.length }); }
      return result;
    } else if (groupBy === 'monthly') {
      const result: any[] = [];
      for (let i = 29; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1); const dayOrders = validOrders.filter((o: any) => { const od = new Date(o.created_at); return od >= dayStart && od < dayEnd; }); result.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: Math.round(dayOrders.reduce((s: number, o: any) => s + Number(o.total), 0)), sales: dayOrders.length }); }
      return result;
    } else {
      const result: any[] = [];
      for (let i = 11; i >= 0; i--) { const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1); const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); const monthOrders = validOrders.filter((o: any) => { const od = new Date(o.created_at); return od >= monthStart && od < monthEnd; }); result.push({ label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: Math.round(monthOrders.reduce((s: number, o: any) => s + Number(o.total), 0)), sales: monthOrders.length }); }
      return result;
    }
  }, [filteredOrders, groupBy]);

  const compareData = useMemo(() => {
    const now = new Date();
    const getStats = (from: Date, to: Date) => { const matched = orders.filter((o: any) => { const d = new Date(o.created_at); return d >= from && d <= to && o.status !== 'cancelled' && o.status !== 'returned'; }); return { revenue: matched.reduce((s: number, o: any) => s + Number(o.total), 0), sales: matched.length }; };
    let currentLabel: string, prevLabel: string, current: { revenue: number; sales: number }, prev: { revenue: number; sales: number };
    if (compareRange === 'day') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      current = getStats(todayStart, now); prev = getStats(yesterdayStart, todayStart); currentLabel = 'Today'; prevLabel = 'Yesterday';
    } else if (compareRange === 'week') {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      current = getStats(weekStart, now); prev = getStats(lastWeekStart, weekStart); currentLabel = 'This Week'; prevLabel = 'Last Week';
    } else if (compareRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      current = getStats(monthStart, now); prev = getStats(lastMonthStart, monthStart); currentLabel = 'This Month'; prevLabel = 'Last Month';
    } else {
      const yearStart = new Date(now.getFullYear(), 0, 1); const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      current = getStats(yearStart, now); prev = getStats(lastYearStart, yearStart); currentLabel = 'This Year'; prevLabel = 'Last Year';
    }
    const total = current.revenue + prev.revenue || 1;
    const revChange = prev.revenue > 0 ? (((current.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) : current.revenue > 0 ? '100.0' : '0.0';
    const salesChange = prev.sales > 0 ? (((current.sales - prev.sales) / prev.sales) * 100).toFixed(1) : current.sales > 0 ? '100.0' : '0.0';
    return { data: [{ name: currentLabel, value: current.revenue }, { name: prevLabel, value: prev.revenue }], currentPct: ((current.revenue / total) * 100).toFixed(1), current, prev, currentLabel, prevLabel, revChange, salesChange };
  }, [orders, compareRange]);

  // Sales comparison table data (weekly/monthly/yearly breakdown)
  const salesComparisonData = useMemo(() => {
    const now = new Date();
    const validOrders = orders.filter((o: any) => o.status !== 'cancelled' && o.status !== 'returned');
    const getWeekData = (weeksAgo: number) => {
      const end = new Date(now); end.setDate(now.getDate() - (weeksAgo * 7));
      const start = new Date(end); start.setDate(start.getDate() - 7);
      const matched = validOrders.filter((o: any) => { const d = new Date(o.created_at); return d >= start && d < end; });
      return { label: weeksAgo === 0 ? 'This Week' : weeksAgo === 1 ? 'Last Week' : `${weeksAgo} Weeks Ago`, revenue: matched.reduce((s: number, o: any) => s + Number(o.total), 0), sales: matched.length };
    };
    const getMonthData = (monthsAgo: number) => {
      const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
      const matched = validOrders.filter((o: any) => { const d = new Date(o.created_at); return d >= start && d < end; });
      return { label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), revenue: matched.reduce((s: number, o: any) => s + Number(o.total), 0), sales: matched.length };
    };
    const getYearData = (yearsAgo: number) => {
      const start = new Date(now.getFullYear() - yearsAgo, 0, 1);
      const end = new Date(now.getFullYear() - yearsAgo + 1, 0, 1);
      const matched = validOrders.filter((o: any) => { const d = new Date(o.created_at); return d >= start && d < end; });
      return { label: `${now.getFullYear() - yearsAgo}`, revenue: matched.reduce((s: number, o: any) => s + Number(o.total), 0), sales: matched.length };
    };
    return {
      weekly: Array.from({ length: 4 }, (_, i) => getWeekData(i)),
      monthly: Array.from({ length: 6 }, (_, i) => getMonthData(i)),
      yearly: Array.from({ length: 3 }, (_, i) => getYearData(i)),
    };
  }, [orders]);

  // Export functions
  const getExportData = () => chartData.map(d => ({ Period: d.label, Revenue: d.revenue, Sales: d.sales }));

  const exportExcel = () => {
    const data = getExportData();
    const headers = Object.keys(data[0] || {});
    let html = '<table><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    data.forEach(row => { html += '<tr>' + headers.map(h => `<td>${(row as any)[h]}</td>`).join('') + '</tr>'; });
    html += `<tr><td><b>Total</b></td><td><b>${totalRevenue}</b></td><td><b>${totalSales}</b></td></tr></table>`;
    const blob = new Blob([`<html><body>${html}</body></html>`], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `sales-report-${new Date().toISOString().split('T')[0]}.xls`; a.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const data = getExportData();
    const headers = Object.keys(data[0] || {});
    const w = window.open('', '', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>Sales Report</title><style>
      @media print { @page { size: A4; margin: 15mm; } }
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 20px; margin-bottom: 5px; }
      h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background: #f3f4f6; padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
      td { padding: 8px 10px; border: 1px solid #e5e7eb; font-size: 13px; }
      .summary { display: flex; gap: 20px; margin-bottom: 20px; }
      .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; flex: 1; }
      .summary-card .label { font-size: 12px; color: #6b7280; }
      .summary-card .value { font-size: 22px; font-weight: bold; margin-top: 4px; }
      tfoot td { font-weight: bold; background: #f9fafb; }
    </style></head><body>
      <h1>Sales Report</h1>
      <h2>Period: ${REVENUE_PRESETS[preset]?.label || 'All time'} | Group: ${groupBy} | Generated: ${new Date().toLocaleString()}</h2>
      <div class="summary">
        <div class="summary-card"><div class="label">Total Revenue</div><div class="value">${currencySymbol}${totalRevenue.toLocaleString('en-IN')}</div></div>
        <div class="summary-card"><div class="label">Total Sales</div><div class="value">${totalSales}</div></div>
        <div class="summary-card"><div class="label">Avg. Order Value</div><div class="value">${currencySymbol}${avgOrderValue.toLocaleString('en-IN')}</div></div>
        <div class="summary-card"><div class="label">Returned (${returnedPct}%)</div><div class="value">${returnedCount}</div></div>
      </div>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${data.map(row => `<tr>${headers.map(h => `<td>${h === 'Revenue' ? currencySymbol + (row as any)[h].toLocaleString('en-IN') : (row as any)[h]}</td>`).join('')}</tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td>${currencySymbol}${totalRevenue.toLocaleString('en-IN')}</td><td>${totalSales}</td></tr></tfoot></table>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Sales Report</h2>
          <p className="text-sm text-muted-foreground">Comprehensive sales & revenue analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="relative grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6 pt-2">
        <div className="absolute -top-6 right-0 z-10">
          <Select value={cardPreset.toString()} onValueChange={(v) => setCardPreset(Number(v))}>
            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover z-50">{CARD_PRESETS.map((p, i) => <SelectItem key={i} value={i.toString()}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-200 rounded-xl p-5">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-700">{formatPrice(totalRevenue, 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200 rounded-xl p-5">
          <p className="text-xs text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold text-blue-700">{totalSales}</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-200 rounded-xl p-5">
          <p className="text-xs text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold text-violet-700">{totalOrders}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-200 rounded-xl p-5">
          <p className="text-xs text-muted-foreground">Avg. Order Value</p>
          <p className="text-2xl font-bold text-cyan-700">{formatPrice(avgOrderValue, 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-200 rounded-xl p-5">
          <p className="text-xs text-muted-foreground">Returned</p>
          <p className="text-2xl font-bold text-orange-700">{returnedCount}</p>
          <span className="text-xs font-semibold text-orange-600">{returnedPct}%</span>
        </div>
      </div>

      {/* Report Download */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Download className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-semibold text-foreground mr-2">Report Download</span>
            <span className="text-muted-foreground text-xs">|</span>
            {REVENUE_PRESETS.map((p, i) => (<Button key={p.label} size="sm" variant={!useReportCustomDate && reportPreset === i ? 'default' : 'outline'} onClick={() => { setReportPreset(i); setUseReportCustomDate(false); setReportDateFrom(undefined); setReportDateTo(undefined); }} className="text-xs h-7">{p.label}</Button>))}
            <span className="text-muted-foreground text-xs">|</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant={useReportCustomDate ? 'default' : 'outline'} className="text-xs h-7">
                  <Calendar className="w-3 h-3 mr-1" />
                  {useReportCustomDate && reportDateFrom ? format(reportDateFrom, 'dd MMM yy') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DayPicker mode="single" selected={reportDateFrom} onSelect={(d) => { setReportDateFrom(d || undefined); setUseReportCustomDate(true); }} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant={useReportCustomDate ? 'default' : 'outline'} className="text-xs h-7">
                  <Calendar className="w-3 h-3 mr-1" />
                  {useReportCustomDate && reportDateTo ? format(reportDateTo, 'dd MMM yy') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DayPicker mode="single" selected={reportDateTo} onSelect={(d) => { setReportDateTo(d || undefined); setUseReportCustomDate(true); }} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {useReportCustomDate && <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => { setUseReportCustomDate(false); setReportDateFrom(undefined); setReportDateTo(undefined); }}>✕</Button>}
          </div>
          <div className="flex gap-2 items-center">
            {can('revenue_export') && (
              <>
                <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white border-0" onClick={() => {
                  const rptRevenue = reportFilteredOrders.filter((o: any) => o.status !== 'returned' && o.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total), 0);
                  const rptSales = reportFilteredOrders.filter((o: any) => o.status !== 'returned' && o.status !== 'cancelled').length;
                  const rptTotal = reportFilteredOrders.length;
                  const rptCancelled = reportFilteredOrders.filter((o: any) => o.status === 'cancelled').length;
                  const rptAvg = rptSales > 0 ? Math.round(rptRevenue / rptSales) : 0;
                  const rptReturned = reportFilteredOrders.filter((o: any) => o.status === 'returned').length;
                  const rptReturnRate = rptTotal > 0 ? ((rptReturned / rptTotal) * 100).toFixed(1) : '0.0';
                  const rptComplete = reportFilteredOrders.filter((o: any) => o.status === 'delivered').length;
                  const rptIncomplete = reportFilteredOrders.filter((o: any) => o.status !== 'delivered').length;
                  const rptCompleteRate = rptTotal > 0 ? ((rptComplete / rptTotal) * 100).toFixed(1) : '0.0';
                  const rptIncompleteRate = rptTotal > 0 ? ((rptIncomplete / rptTotal) * 100).toFixed(1) : '0.0';
                  const period = useReportCustomDate && reportDateFrom ? `${format(reportDateFrom, 'dd MMM yyyy')} - ${reportDateTo ? format(reportDateTo, 'dd MMM yyyy') : 'Now'}` : REVENUE_PRESETS[reportPreset]?.label;
                  const summaryRows = [
                    ['Period', period],
                    ['Total Revenue', `${rptRevenue}`],
                    ['Total Sales', `${rptSales}`],
                    ['Total Orders', `${rptTotal}`],
                    ['Avg Order Value', `${rptAvg}`],
                    ['Cancelled Orders', `${rptCancelled}`],
                    ['Total Returns', `${rptReturned}`],
                    ['Return Rate', `${rptReturnRate}%`],
                    ['Total Complete Orders (Delivered)', `${rptComplete}`],
                    ['Total Incomplete Orders', `${rptIncomplete}`],
                    ['Complete Rate', `${rptCompleteRate}%`],
                    ['Incomplete Rate', `${rptIncompleteRate}%`],
                  ];
                  const statuses = ['pending', 'confirmed', 'processing', 'send_to_courier', 'delivered', 'returned', 'cancelled'];
                  const orderHeaders = ['Date', 'Order ID', 'Customer', 'Payment', 'Total'];
                  let csv = '--- Summary ---\nMetric,Value\n' + summaryRows.map(r => r.join(',')).join('\n') + '\n';
                  statuses.forEach(st => {
                    const ords = reportFilteredOrders.filter((o: any) => o.status === st);
                    if (ords.length === 0) return;
                    csv += `\n--- ${st.replace(/_/g, ' ').toUpperCase()} Orders (${ords.length}) ---\n`;
                    csv += orderHeaders.join(',') + '\n';
                    const stTotal = ords.reduce((s: number, o: any) => s + Number(o.total), 0);
                    csv += ords.map((o: any) => [format(new Date(o.created_at), 'yyyy-MM-dd'), o.id?.slice(0, 8), (o.shipping_address as any)?.name || '-', o.payment_status, o.total].join(',')).join('\n') + '\n';
                    csv += `,,,Total,${stTotal}\n`;
                  });
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click(); URL.revokeObjectURL(url);
                }}>
                  <Download className="w-3 h-3 mr-1 text-white" /> Excel
                </Button>
                <Button size="sm" className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white border-0" onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (!printWin) return;
                  const rptRevenue = reportFilteredOrders.filter((o: any) => o.status !== 'returned' && o.status !== 'cancelled').reduce((s: number, o: any) => s + Number(o.total), 0);
                  const rptSales = reportFilteredOrders.filter((o: any) => o.status !== 'returned' && o.status !== 'cancelled').length;
                  const rptTotal = reportFilteredOrders.length;
                  const rptCancelled = reportFilteredOrders.filter((o: any) => o.status === 'cancelled').length;
                  const rptAvg = rptSales > 0 ? Math.round(rptRevenue / rptSales) : 0;
                  const rptReturned = reportFilteredOrders.filter((o: any) => o.status === 'returned').length;
                  const rptReturnRate = rptTotal > 0 ? ((rptReturned / rptTotal) * 100).toFixed(1) : '0.0';
                  const rptComplete = reportFilteredOrders.filter((o: any) => o.status === 'delivered').length;
                  const rptIncomplete = reportFilteredOrders.filter((o: any) => o.status !== 'delivered').length;
                  const rptCompleteRate = rptTotal > 0 ? ((rptComplete / rptTotal) * 100).toFixed(1) : '0.0';
                  const rptIncompleteRate = rptTotal > 0 ? ((rptIncomplete / rptTotal) * 100).toFixed(1) : '0.0';
                  const period = useReportCustomDate && reportDateFrom ? `${format(reportDateFrom, 'dd MMM yyyy')} → ${reportDateTo ? format(reportDateTo, 'dd MMM yyyy') : 'Now'}` : REVENUE_PRESETS[reportPreset]?.label;
                  const statuses = ['pending', 'confirmed', 'processing', 'send_to_courier', 'delivered', 'returned', 'cancelled'];
                  const statusTables = statuses.map(st => {
                    const ords = reportFilteredOrders.filter((o: any) => o.status === st);
                    if (ords.length === 0) return '';
                    const rows = ords.map((o: any) => `<tr><td>${format(new Date(o.created_at), 'yyyy-MM-dd')}</td><td>${o.id?.slice(0, 8)}</td><td>${(o.shipping_address as any)?.name || '-'}</td><td>${o.payment_status}</td><td>${formatPrice(Number(o.total), 0)}</td></tr>`).join('');
                    const stTotal = ords.reduce((s: number, o: any) => s + Number(o.total), 0);
                    return `<h3 style="margin-top:24px;font-size:14px;text-transform:capitalize">${st.replace(/_/g, ' ')} Orders <span style="color:#6b7280;font-weight:normal">(${ords.length})</span></h3><table><thead><tr><th>Date</th><th>Order ID</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">Total</td><td style="font-weight:bold">${formatPrice(stTotal, 0)}</td></tr></tfoot></table>`;
                  }).join('');
                  printWin.document.write(`<html><head><title>Sales Report</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5}h2{margin-bottom:4px}h3{margin-bottom:4px}p{color:#666;font-size:13px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.summary-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}.summary-card .label{font-size:11px;color:#6b7280;margin-bottom:4px}.summary-card .value{font-size:18px;font-weight:700;color:#111}@media print{.page-break{page-break-before:always}}</style></head><body><h2>Sales Report</h2><p>${period}</p><div class="summary"><div class="summary-card"><div class="label">Total Revenue</div><div class="value">${formatPrice(rptRevenue, 0)}</div></div><div class="summary-card"><div class="label">Total Sales</div><div class="value">${rptSales}</div></div><div class="summary-card"><div class="label">Total Orders</div><div class="value">${rptTotal}</div></div><div class="summary-card"><div class="label">Avg Order Value</div><div class="value">${formatPrice(rptAvg, 0)}</div></div><div class="summary-card"><div class="label">Cancelled Orders</div><div class="value">${rptCancelled}</div></div><div class="summary-card"><div class="label">Total Returns</div><div class="value">${rptReturned}</div></div><div class="summary-card"><div class="label">Return Rate</div><div class="value">${rptReturnRate}%</div></div><div class="summary-card"><div class="label">Complete (Delivered)</div><div class="value">${rptComplete}</div></div><div class="summary-card"><div class="label">Incomplete</div><div class="value">${rptIncomplete}</div></div><div class="summary-card"><div class="label">Complete Rate</div><div class="value">${rptCompleteRate}%</div></div><div class="summary-card"><div class="label">Incomplete Rate</div><div class="value">${rptIncompleteRate}%</div></div></div>${statusTables}</body></html>`);
                  printWin.document.close();
                  printWin.print();
                }}>
                  <Printer className="w-3 h-3 mr-1 text-white" /> PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Revenue & Sales Chart */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-display font-semibold text-foreground">Revenue & Sales Trend</h3>
              <div className="flex items-center gap-2">
                <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">1 Week</SelectItem>
                    <SelectItem value="monthly">1 Month</SelectItem>
                    <SelectItem value="yearly">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="revTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={CHART_COLORS.primaryLight} stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="salesLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={1} />
                    <stop offset="100%" stopColor={CHART_COLORS.secondaryLight} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: groupBy === 'monthly' ? 9 : 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={groupBy === 'monthly' ? 2 : 0} angle={groupBy === 'monthly' ? -45 : 0} textAnchor={groupBy === 'monthly' ? 'end' : 'middle'} height={groupBy === 'monthly' ? 50 : 30} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<PremiumTooltip formatter={(v: number, key: string) => key === 'revenue' ? formatPrice(v, 0) : v} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="revenue" fill="url(#revTrendGrad)" radius={[6, 6, 0, 0]} barSize={groupBy === 'monthly' ? 12 : 32} />
                <Line yAxisId="right" type="monotone" dataKey="sales" stroke={CHART_COLORS.secondary} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS.secondary }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Comparison Doughnut */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground text-sm">Revenue Comparison</h3>
              <Select value={compareRange} onValueChange={(v: any) => setCompareRange(v)}>
                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="day">Day</SelectItem><SelectItem value="week">Week</SelectItem><SelectItem value="month">Month</SelectItem><SelectItem value="year">Year</SelectItem></SelectContent>
              </Select>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={compareData.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {compareData.data.map((_, i) => <Cell key={i} fill={DOUGHNUT_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<PremiumTooltip formatter={(v: number) => formatPrice(v, 0)} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{compareData.currentLabel} Revenue</span><span className="font-bold text-foreground">{formatPrice(compareData.current.revenue, 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{compareData.prevLabel} Revenue</span><span className="font-bold text-foreground">{formatPrice(compareData.prev.revenue, 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Revenue Change</span><span className={`font-bold ${Number(compareData.revChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(compareData.revChange) >= 0 ? '+' : ''}{compareData.revChange}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sales Change</span><span className={`font-bold ${Number(compareData.salesChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(compareData.salesChange) >= 0 ? '+' : ''}{compareData.salesChange}%</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Order Status Report Cards */}
      {(() => {
        const PIE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (PIE_DAYS[reportPieRange] || 30));
        const pieOrders = orders.filter((o: any) => o.status !== 'cancelled' && new Date(o.created_at) >= cutoff);
        const total = pieOrders.length || 1;
        const completeOrders = pieOrders.filter((o: any) => o.status === 'delivered').length;
        const returnedOrders = pieOrders.filter((o: any) => o.status === 'returned').length;
        const incompleteOrders = pieOrders.filter((o: any) => o.status !== 'delivered' && o.status !== 'returned').length;

        const cards = [
          { title: 'Complete Orders', count: completeOrders, pct: ((completeOrders / total) * 100).toFixed(1), color: '#10b981', colors: ['#10b981', '#e5e7eb'], data: [{ name: 'Complete', value: completeOrders }, { name: 'Others', value: total - completeOrders }] },
          { title: 'Incomplete Orders', count: incompleteOrders, pct: ((incompleteOrders / total) * 100).toFixed(1), color: '#f59e0b', colors: ['#f59e0b', '#e5e7eb'], data: [{ name: 'Incomplete', value: incompleteOrders }, { name: 'Others', value: total - incompleteOrders }] },
          { title: 'Return Rate', count: returnedOrders, pct: ((returnedOrders / total) * 100).toFixed(1), color: '#ef4444', colors: ['#ef4444', '#e5e7eb'], data: [{ name: 'Returned', value: returnedOrders }, { name: 'Others', value: total - returnedOrders }] },
        ];

        return (
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-foreground text-sm">Order Status Overview</h3>
              <Select value={reportPieRange} onValueChange={setReportPieRange}>
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cards.map((card) => (
                <div key={card.title} className="bg-card rounded-xl border border-border p-5 flex flex-col items-center">
                  <h3 className="font-display font-semibold text-foreground text-sm mb-2">{card.title}</h3>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={card.data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                        {card.data.map((_, i) => <Cell key={i} fill={card.colors[i]} />)}
                      </Pie>
                      <Tooltip content={<PremiumTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-1">
                    <span className="text-2xl font-bold" style={{ color: card.color }}>{card.pct}%</span>
                    <p className="text-xs text-muted-foreground mt-1">{card.count} of {total} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Sales Comparison Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
          <div key={period} className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-foreground text-sm mb-3 capitalize">{period} Comparison</h3>
            <Table>
              <TableHeader><TableRow><TableHead className="text-xs">Period</TableHead><TableHead className="text-xs text-right">Revenue</TableHead><TableHead className="text-xs text-right">Sales</TableHead></TableRow></TableHeader>
              <TableBody>
                {salesComparisonData[period].map((row, i) => (
                  <TableRow key={i}><TableCell className="text-xs py-2">{row.label}</TableCell><TableCell className="text-xs py-2 text-right font-medium">{formatPrice(row.revenue, 0)}</TableCell><TableCell className="text-xs py-2 text-right">{row.sales}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =================== VARIANTS =================== */
const VariantsPanel = ({ can = () => true, logActivity }: { can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', options: [{ value: '' }] as { value: string }[] });
  const [showTrash, setShowTrash] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<string | null>(null);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [bulkPermDeleteConfirm, setBulkPermDeleteConfirm] = useState(false);

  const { data: allVariants = [] } = useQuery({ queryKey: ['admin-variants'], queryFn: async () => { const { data } = await supabase.from('variants').select('*').order('name'); return data ?? []; } });
  const variants = useMemo(() => allVariants.filter((v: any) => !v.is_deleted), [allVariants]);
  const trashedVariants = useMemo(() => allVariants.filter((v: any) => v.is_deleted), [allVariants]);
  const currentList = showTrash ? trashedVariants : variants;
  const reset = () => { setForm({ name: '', options: [{ value: '' }] }); setEditing(null); };
  const save = async () => { if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; } const opts = form.options.filter(o => o.value.trim()).map(o => ({ value: o.value })); if (opts.length === 0) { toast({ title: 'At least one option required', variant: 'destructive' }); return; } const payload = { name: form.name, options: opts as any }; const { error } = editing ? await supabase.from('variants').update(payload).eq('id', editing.id) : await supabase.from('variants').insert(payload); if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; } queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); setOpen(false); reset(); toast({ title: editing ? 'Variant updated!' : 'Variant created!' }); logActivity?.(editing ? 'variant_update' : 'variant_create', 'variant', editing?.id || '', `${editing ? 'Updated' : 'Created'} variant: ${form.name}`); };
  const moveToTrash = async (id: string) => { await supabase.from('variants').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); toast({ title: 'Moved to trash' }); logActivity?.('variant_trash', 'variant', id, 'Variant moved to trash'); setTrashConfirm(null); };
  const permDelete = async (id: string) => { await supabase.from('variants').delete().eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); toast({ title: 'Permanently deleted' }); logActivity?.('variant_delete', 'variant', id, 'Variant permanently deleted'); setPermDeleteConfirm(null); };
  const restoreItem = async (id: string) => { await supabase.from('variants').update({ is_deleted: false, deleted_at: null } as any).eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); toast({ title: 'Restored' }); };
  const bulkMoveToTrash = async () => { for (const id of selectedIds) await supabase.from('variants').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); setSelectedIds(new Set()); setBulkTrashConfirm(false); toast({ title: `${selectedIds.size} trashed` }); };
  const bulkPermDelete = async () => { for (const id of selectedIds) await supabase.from('variants').delete().eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); setSelectedIds(new Set()); setBulkPermDeleteConfirm(false); toast({ title: 'Permanently deleted' }); };
  const bulkRestore = async () => { for (const id of selectedIds) await supabase.from('variants').update({ is_deleted: false, deleted_at: null } as any).eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-variants'] }); setSelectedIds(new Set()); toast({ title: 'Restored' }); };
  const toggleSelect = (id: string) => { const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); };
  const toggleAll = () => { if (selectedIds.size === currentList.length) setSelectedIds(new Set()); else setSelectedIds(new Set(currentList.map((v: any) => v.id))); };
  const daysLeft = (d: string) => Math.max(0, 30 - Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
  const parseOptions = (opts: any): { value: string }[] => { if (!Array.isArray(opts)) return [{ value: '' }]; return opts.map((o: any) => typeof o === 'string' ? { value: o } : { value: o.value || '' }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Variants</h1>
        <div className="flex gap-2">
          <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}><Archive className="w-4 h-4 mr-1" /> Trash ({trashedVariants.length})</Button>
          {!showTrash && can('variant_add') && <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}><DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Variant</Button></DialogTrigger><DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add New'} Variant</DialogTitle></DialogHeader><div className="space-y-4 mt-4"><FormField label="Variant Name" required description="e.g. Size, Color, Weight"><Input placeholder="e.g. Size" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField><FormField label="Options" required description="Add option values"><div className="space-y-2">{form.options.map((opt, i) => (<div key={i} className="flex gap-2"><Input placeholder="e.g. S, M, L..." value={opt.value} onChange={(e) => { const o = [...form.options]; o[i] = { value: e.target.value }; setForm({ ...form, options: o }); }} />{form.options.length > 1 && <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}><Trash2 className="w-3 h-3 text-destructive" /></Button>}</div>))}<Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, options: [...form.options, { value: '' }] })}><Plus className="w-3 h-3 mr-1" /> Add Option</Button></div></FormField><Button onClick={save} className="w-full">{editing ? 'Update' : 'Create'} Variant</Button></div></DialogContent></Dialog>}
        </div>
      </div>
      <AlertDialog open={!!trashConfirm} onOpenChange={(o) => { if (!o) setTrashConfirm(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move to Trash?</AlertDialogTitle><AlertDialogDescription>Auto-deleted after 30 days.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => trashConfirm && moveToTrash(trashConfirm)}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={bulkTrashConfirm} onOpenChange={setBulkTrashConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move {selectedIds.size} to trash?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkMoveToTrash}>Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!permDeleteConfirm} onOpenChange={(o) => { if (!o) setPermDeleteConfirm(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>Cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => permDeleteConfirm && permDelete(permDeleteConfirm)} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={bulkPermDeleteConfirm} onOpenChange={setBulkPermDeleteConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete {selectedIds.size}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkPermDelete} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {selectedIds.size > 0 && <div className="flex items-center gap-2 mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2"><span className="text-sm font-medium">{selectedIds.size} selected</span>{showTrash ? (<><Button size="sm" variant="outline" onClick={bulkRestore}><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button><Button size="sm" variant="destructive" onClick={() => setBulkPermDeleteConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete Forever</Button></>) : (<Button size="sm" variant="outline" onClick={() => setBulkTrashConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>)}<Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button></div>}
      {showTrash && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800"><Archive className="w-4 h-4 inline mr-1" /> Auto-deleted after 30 days. <Button variant="ghost" size="sm" className="ml-2" onClick={() => { setShowTrash(false); setSelectedIds(new Set()); }}>← Back</Button></div>}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={selectedIds.size === currentList.length && currentList.length > 0} onCheckedChange={toggleAll} /></TableHead><TableHead>Name</TableHead><TableHead>Options</TableHead>{showTrash && <TableHead>Auto-delete</TableHead>}<TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {currentList.length === 0 ? <TableRow><TableCell colSpan={showTrash ? 5 : 4} className="text-center py-12 text-muted-foreground">{showTrash ? 'Trash is empty' : 'No variants yet.'}</TableCell></TableRow> : currentList.map((v: any) => {
              const opts = Array.isArray(v.options) ? v.options : [];
              return (<TableRow key={v.id}><TableCell><Checkbox checked={selectedIds.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} /></TableCell><TableCell className="font-medium">{v.name}</TableCell><TableCell><div className="flex flex-wrap gap-1">{opts.map((o: any, i: number) => <Badge key={i} variant="secondary">{typeof o === 'string' ? o : o.value}</Badge>)}</div></TableCell>{showTrash && <TableCell><span className="text-xs text-muted-foreground">{v.deleted_at ? `${daysLeft(v.deleted_at)} days` : '30 days'}</span></TableCell>}<TableCell><div className="flex gap-1">{showTrash ? (<><Button size="sm" variant="ghost" onClick={() => restoreItem(v.id)}><RotateCcw className="w-3 h-3 text-green-600" /></Button><Button size="sm" variant="ghost" onClick={() => setPermDeleteConfirm(v.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button></>) : (<>{can('variant_add') && <Button size="sm" variant="ghost" onClick={() => { setEditing(v); setForm({ name: v.name, options: parseOptions(v.options) }); setOpen(true); }}><Pencil className="w-3 h-3" /></Button>}{can('variant_delete') && <Button size="sm" variant="ghost" onClick={() => setTrashConfirm(v.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}</>)}</div></TableCell></TableRow>);
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/* =================== CATEGORIES =================== */
const CategoriesPanel = ({ categories, products, qc, can = () => true, logActivity }: any) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', slug: '', image_url: '', parent_id: '' });
  const [mediaOpen, setMediaOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<string | null>(null);
  const [bulkPermDeleteConfirm, setBulkPermDeleteConfirm] = useState(false);
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false);

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const productCounts = useMemo(() => { const counts: Record<string, number> = {}; products.forEach((p: any) => { if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1; }); return counts; }, [products]);

  const activeCategories = useMemo(() => categories.filter((c: any) => !c.is_deleted), [categories]);
  const trashedCategories = useMemo(() => categories.filter((c: any) => c.is_deleted), [categories]);
  const displayedCategories = showTrash ? trashedCategories : activeCategories;

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); };

  const save = async () => {
    if (!form.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    const payload = { ...form, parent_id: form.parent_id || null };
    const { error } = editing ? await supabase.from('categories').update(payload).eq('id', editing.id) : await supabase.from('categories').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    invalidate();
    setOpen(false); setEditing(null); setForm({ name: '', slug: '', image_url: '', parent_id: '' });
    toast({ title: editing ? 'Category updated!' : 'Category created!' });
    logActivity?.(editing ? 'category_update' : 'category_create', 'category', editing?.id || '', `${editing ? 'Updated' : 'Created'} category: ${form.name}`);
  };

  // Soft delete (move to trash)
  const softDelete = async (id: string) => {
    await supabase.from('categories').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
    invalidate(); setTrashConfirm(null);
    toast({ title: 'Category moved to trash' });
    logActivity?.('category_trash', 'category', id, 'Category moved to trash');
  };

  // Permanent delete
  const permDelete = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id);
    invalidate(); setPermDeleteConfirm(null);
    toast({ title: 'Category permanently deleted' });
    logActivity?.('category_delete', 'category', id, 'Category permanently deleted');
  };

  // Restore from trash
  const restore = async (id: string) => {
    await supabase.from('categories').update({ is_deleted: false, deleted_at: null }).eq('id', id);
    invalidate();
    toast({ title: 'Category restored' });
  };

  // Bulk operations
  const bulkSoftDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('categories').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
    invalidate(); setSelectedIds(new Set()); setBulkTrashConfirm(false);
    toast({ title: `${ids.length} categories moved to trash` });
  };

  const bulkPermDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('categories').delete().eq('id', id);
    invalidate(); setSelectedIds(new Set()); setBulkPermDeleteConfirm(false);
    toast({ title: `${ids.length} categories permanently deleted` });
  };

  const bulkRestore = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('categories').update({ is_deleted: false, deleted_at: null }).eq('id', id);
    invalidate(); setSelectedIds(new Set()); setBulkRestoreConfirm(false);
    toast({ title: `${ids.length} categories restored` });
  };

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleAll = () => { if (selectedIds.size === displayedCategories.length) setSelectedIds(new Set()); else setSelectedIds(new Set(displayedCategories.map((c: any) => c.id))); };

  const getDaysLeft = (deletedAt: string) => {
    const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Categories</h1>
        <div className="flex gap-2">
          <Button variant={showTrash ? 'default' : 'outline'} onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}>
            <Trash2 className="w-4 h-4 mr-2" /> Trash {trashedCategories.length > 0 && `(${trashedCategories.length})`}
          </Button>
          {!showTrash && can('category_add') && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ name: '', slug: '', image_url: '', parent_id: '' }); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Category</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add New'} Category</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <FormField label="Category Name" required><Input placeholder="e.g. Organic Spices" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) })} /></FormField>
                  <FormField label="URL Slug" required><Input placeholder="organic-spices" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></FormField>
                  <FormField label="Parent Category">
                    <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                      <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                      <SelectContent>{activeCategories.filter((c: any) => c.id !== editing?.id).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Category Image" description="Upload, select from gallery, or paste URL">
                    <ImagePicker value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
                  </FormField>
                  <Button onClick={save} className="w-full">{editing ? 'Update' : 'Create'} Category</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <MediaGalleryModal open={mediaOpen} onOpenChange={setMediaOpen} onSelect={(url) => setForm({ ...form, image_url: url })} />

      {showTrash && trashedCategories.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Trashed categories will be permanently deleted after 30 days.
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          {showTrash ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setBulkRestoreConfirm(true)}>
                <RotateCcw className="w-3 h-3 mr-1" /> Restore
              </Button>
              {can('category_delete') && (
                <Button size="sm" variant="destructive" onClick={() => setBulkPermDeleteConfirm(true)}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete Permanently
                </Button>
              )}
            </>
          ) : (
            can('category_delete') && (
              <Button size="sm" variant="outline" onClick={() => setBulkTrashConfirm(true)}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            )
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={displayedCategories.length > 0 && selectedIds.size === displayedCategories.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              {!showTrash && <TableHead>Products</TableHead>}
              {showTrash && <TableHead>Auto-delete in</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedCategories.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{showTrash ? 'Trash is empty' : 'No categories found'}</TableCell></TableRow>
            )}
            {displayedCategories.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-muted/50">
                <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                <TableCell>{c.image_url ? <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-md object-cover" /> : <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">N/A</div>}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">/{c.slug}</TableCell>
                {!showTrash && <TableCell><Badge variant="secondary">{productCounts[c.id] || 0}</Badge></TableCell>}
                {showTrash && <TableCell><span className="text-sm text-amber-600 dark:text-amber-400">{getDaysLeft(c.deleted_at)} days</span></TableCell>}
                <TableCell>
                  <div className="flex gap-1">
                    {showTrash ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => restore(c.id)}><RotateCcw className="w-3 h-3" /></Button>
                        {can('category_delete') && <Button size="sm" variant="ghost" onClick={() => setPermDeleteConfirm(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                      </>
                    ) : (
                      <>
                        {can('category_edit') && <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setForm({ name: c.name, slug: c.slug, image_url: c.image_url ?? '', parent_id: c.parent_id ?? '' }); setOpen(true); }}><Pencil className="w-3 h-3" /></Button>}
                        {can('category_delete') && <Button size="sm" variant="ghost" onClick={() => setTrashConfirm(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Single soft delete confirmation */}
      <AlertDialog open={!!trashConfirm} onOpenChange={(o) => !o && setTrashConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>This category will be moved to Trash. It will be permanently deleted after 30 days if not restored.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => trashConfirm && softDelete(trashConfirm)}>Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single permanent delete confirmation */}
      <AlertDialog open={!!permDeleteConfirm} onOpenChange={(o) => !o && setPermDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>This category will be permanently deleted and cannot be recovered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => permDeleteConfirm && permDelete(permDeleteConfirm)}>Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk trash confirmation */}
      <AlertDialog open={bulkTrashConfirm} onOpenChange={setBulkTrashConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedIds.size} categories to Trash?</AlertDialogTitle>
            <AlertDialogDescription>These categories will be moved to Trash and permanently deleted after 30 days if not restored.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkSoftDelete}>Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk permanent delete confirmation */}
      <AlertDialog open={bulkPermDeleteConfirm} onOpenChange={setBulkPermDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {selectedIds.size} categories?</AlertDialogTitle>
            <AlertDialogDescription>These categories will be permanently deleted and cannot be recovered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={bulkPermDelete}>Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk restore confirmation */}
      <AlertDialog open={bulkRestoreConfirm} onOpenChange={setBulkRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {selectedIds.size} categories?</AlertDialogTitle>
            <AlertDialogDescription>These categories will be restored from trash.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =================== ORDERS =================== */
const OrdersPanel = ({ orders, qc, logActivity, can = () => true }: any) => {
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; status: string } | null>(null);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<string | null>(null);
  const [paymentStatusConfirm, setPaymentStatusConfirm] = useState<{ id: string; status: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const { data: siteLogo } = usePageContent('site_logo_url');
  const { data: siteTitle } = usePageContent('site_title');

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (statusFilter !== 'all') result = result.filter((o: any) => o.status === statusFilter);
    if (searchQuery) result = result.filter((o: any) => o.id.toLowerCase().includes(searchQuery.toLowerCase()));
    if (dateFrom) result = result.filter((o: any) => new Date(o.created_at) >= new Date(dateFrom));
    if (dateTo) result = result.filter((o: any) => new Date(o.created_at) <= new Date(dateTo + 'T23:59:59'));
    if (priceMin) result = result.filter((o: any) => Number(o.total) >= Number(priceMin));
    if (priceMax) result = result.filter((o: any) => Number(o.total) <= Number(priceMax));
    return result;
  }, [orders, statusFilter, searchQuery, dateFrom, dateTo, priceMin, priceMax]);

  const hasFilters = statusFilter !== 'all' || searchQuery || dateFrom || dateTo || priceMin || priceMax;
  const resetFilters = () => { setStatusFilter('all'); setSearchQuery(''); setDateFrom(''); setDateTo(''); setPriceMin(''); setPriceMax(''); };

  const { paged, page, totalPages, setPage, pageSize, changeSize } = usePaginationWithSize(filteredOrders, 25);

  const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
  const courierCount = orders.filter((o: any) => o.status === 'send_to_courier' || o.status === 'shipped').length;
  const deliveredCount = orders.filter((o: any) => o.status === 'delivered').length;
  const returnedCount = orders.filter((o: any) => o.status === 'returned').length;
  const cancelledCount = orders.filter((o: any) => o.status === 'cancelled').length;
  const returnedPct = orders.length > 0 ? ((returnedCount / orders.length) * 100).toFixed(1) : '0';

  const orderCards = [
    { label: 'Total', count: orders.length, filter: 'all', color: 'from-blue-500/10 to-blue-600/5 border-blue-200', textColor: 'text-blue-700' },
    { label: 'Pending', count: pendingCount, filter: 'pending', color: 'from-amber-500/10 to-amber-600/5 border-amber-200', textColor: 'text-amber-700' },
    { label: 'Send to Courier', count: courierCount, filter: 'send_to_courier', color: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200', textColor: 'text-indigo-700' },
    { label: 'Delivered', count: deliveredCount, filter: 'delivered', color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', textColor: 'text-emerald-700' },
    { label: 'Returned', count: returnedCount, filter: 'returned', color: 'from-orange-500/10 to-orange-600/5 border-orange-200', textColor: 'text-orange-700', pct: `${returnedPct}%` },
    { label: 'Cancelled', count: cancelledCount, filter: 'cancelled', color: 'from-rose-500/10 to-rose-600/5 border-rose-200', textColor: 'text-rose-700' },
  ];

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status });
    toast({ title: `Order marked as ${STATUS_LABELS[status] || status}` });
    logActivity?.('order_status_change', 'order', id, `Status changed to ${status}`);
  };

  const updatePaymentStatus = async (id: string, paymentStatus: string) => {
    await supabase.from('orders').update({ payment_status: paymentStatus } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, payment_status: paymentStatus });
    toast({ title: `Payment status changed to ${PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus}` });
    logActivity?.('payment_status_change', 'order', id, `Payment status changed to ${paymentStatus}`);
  };

  const deleteOrder = async (id: string) => {
    await supabase.from('order_items').delete().eq('order_id', id);
    await supabase.from('orders').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    setSelectedOrder(null); setDeleteConfirm(null);
    toast({ title: 'Order deleted' });
    logActivity?.('order_delete', 'order', id, 'Order deleted');
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('orders').update({ status }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    setSelectedIds(new Set());
    toast({ title: `${ids.length} orders updated to ${STATUS_LABELS[status] || status}` });
  };

  const bulkDeleteCancelled = async () => {
    const ids = Array.from(selectedIds).filter(id => orders.find((o: any) => o.id === id && o.status === 'cancelled'));
    for (const id of ids) {
      await supabase.from('order_items').delete().eq('order_id', id);
      await supabase.from('orders').delete().eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
    setSelectedIds(new Set()); setBulkDeleteConfirm(false);
    toast({ title: `${ids.length} cancelled orders deleted` });
    logActivity?.('bulk_order_delete', 'order', ids.join(','), `${ids.length} cancelled orders deleted`);
  };

  const bulkPrintDocs = (type: 'invoice' | 'packing' | 'label') => {
    const selectedOrders = orders.filter((o: any) => selectedIds.has(o.id));
    if (selectedOrders.length === 0) return;
    const allHtml = selectedOrders.map((o: any) => `<div style="page-break-after:always">${generatePrintDoc(o, type)}</div>`).join('');
    const w = window.open('', '', 'width=800,height=600');
    if (w) { w.document.write(`<html><head><title>${type}</title><style>@media print { @page { size: A4; margin: 15mm; } }</style></head><body>${allHtml}</body></html>`); w.document.close(); w.print(); }
  };

  const allSelectedCancelled = selectedIds.size > 0 && Array.from(selectedIds).every(id => orders.find((o: any) => o.id === id)?.status === 'cancelled');

  const parseManualNotes = (order: any) => { if (order.payment_method !== 'manual_payment') return null; try { return JSON.parse(order.notes); } catch { return null; } };
  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleAll = () => { if (selectedIds.size === paged.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paged.map((o: any) => o.id))); };

  const generatePrintDoc = (order: any, type: 'invoice' | 'packing' | 'label') => {
    const addr = order.shipping_address || {};
    const items = order.order_items || [];
    const logoHtml = typeof siteLogo === 'string' && siteLogo ? `<img src="${siteLogo}" style="height:40px;margin-bottom:12px" />` : '';
    const titleText = typeof siteTitle === 'string' ? siteTitle : 'Store';
    if (type === 'invoice') {
      const rows = items.map((i: any) => `<tr><td style="padding:6px;border:1px solid #ddd">${i.product_name}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${i.quantity}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${formatPrice(Number(i.price), 0)}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${formatPrice(i.price * i.quantity, 0)}</td></tr>`).join('');
      return `<div style="font-family:sans-serif;max-width:700px;margin:auto;padding:30px">${logoHtml}<h2>${titleText} - Invoice</h2><p><strong>Order ID:</strong> #${order.id.slice(0, 8)}</p><p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p><p><strong>Customer:</strong> ${addr.name || 'N/A'}</p><p><strong>Address:</strong> ${addr.address || ''}, ${addr.city || ''}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Product</th><th style="padding:8px;border:1px solid #ddd;text-align:center">Qty</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Price</th><th style="padding:8px;border:1px solid #ddd;text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><p style="font-size:18px;text-align:right"><strong>Total: ${formatPrice(Number(order.total), 0)}</strong></p></div>`;
    } else if (type === 'packing') {
      const rows = items.map((i: any) => `<tr><td style="padding:6px;border:1px solid #ddd">${i.product_name}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${i.quantity}</td></tr>`).join('');
      return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:30px">${logoHtml}<h2>${titleText} - Packing Slip</h2><p><strong>Order ID:</strong> #${order.id.slice(0, 8)}</p><p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Product</th><th style="padding:8px;border:1px solid #ddd;text-align:center">Qty</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    } else {
      return `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:30px;border:2px dashed #ccc">${logoHtml}<h2>${titleText}</h2><h3>Shipping Label</h3><hr/><p><strong>${addr.name || 'N/A'}</strong></p><p>${addr.address || ''}</p><p>${addr.city || ''} ${addr.zip || ''}</p><p>${addr.phone || ''}</p><hr/><p><strong>Order:</strong> #${order.id.slice(0, 8)}</p></div>`;
    }
  };

  const printDoc = (order: any, type: 'invoice' | 'packing' | 'label') => {
    const html = generatePrintDoc(order, type);
    const w = window.open('', '', 'width=800,height=600');
    if (w) { w.document.write(`<html><head><title>${type}</title><style>@media print { @page { size: A4; margin: 15mm; } }</style></head><body>${html}</body></html>`); w.document.close(); w.print(); }
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {orderCards.map((card) => (
          <button key={card.label} onClick={() => setStatusFilter(card.filter)} className={`bg-gradient-to-br ${card.color} rounded-xl border p-4 text-left transition-all hover:shadow-md ${statusFilter === card.filter ? 'ring-2 ring-primary shadow-md' : ''} relative`}>
            <p className={`text-xl font-bold ${card.textColor}`}>{card.count}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {card.pct && <span className="absolute top-2 right-2 text-xs font-semibold text-muted-foreground">{card.pct}</span>}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search Order ID</label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search by order ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Order Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">From</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">To</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Min Price</label><Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-24" placeholder={currencySymbol} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Max Price</label><Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-24" placeholder={currencySymbol} /></div>
          {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground"><FilterX className="w-4 h-4 mr-1" /> Reset</Button>}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex flex-wrap gap-1">
            {ORDER_STATUSES.map((s) => (<Button key={s} size="sm" variant="outline" onClick={() => setBulkStatusConfirm(s)} className="text-xs">{STATUS_LABELS[s]}</Button>))}
          </div>
          <div className="h-6 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => bulkPrintDocs('invoice')}><Printer className="w-3 h-3 mr-1" /> Invoice</Button>
          <Button size="sm" variant="outline" onClick={() => bulkPrintDocs('packing')}><Download className="w-3 h-3 mr-1" /> Packing Slip</Button>
          <Button size="sm" variant="outline" onClick={() => bulkPrintDocs('label')}><Send className="w-3 h-3 mr-1" /> Shipping Label</Button>
          {allSelectedCancelled && can('order_delete') && (
            <>
              <div className="h-6 w-px bg-border" />
              <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <AlertDialog open={!!statusConfirm} onOpenChange={(o) => { if (!o) setStatusConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Status Change</AlertDialogTitle><AlertDialogDescription>Are you sure you want to change this order's status to "{statusConfirm ? STATUS_LABELS[statusConfirm.status] : ''}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (statusConfirm) { updateStatus(statusConfirm.id, statusConfirm.status); setStatusConfirm(null); } }}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!bulkStatusConfirm} onOpenChange={(o) => { if (!o) setBulkStatusConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Bulk Status Change</AlertDialogTitle><AlertDialogDescription>Are you sure you want to change {selectedIds.size} orders to "{bulkStatusConfirm ? STATUS_LABELS[bulkStatusConfirm] : ''}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (bulkStatusConfirm) { bulkUpdateStatus(bulkStatusConfirm); setBulkStatusConfirm(null); } }}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!paymentStatusConfirm} onOpenChange={(o) => { if (!o) setPaymentStatusConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Payment Status Change</AlertDialogTitle><AlertDialogDescription>Are you sure you want to change the payment status to "{paymentStatusConfirm ? PAYMENT_STATUS_LABELS[paymentStatusConfirm.status] : ''}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (paymentStatusConfirm) { updatePaymentStatus(paymentStatusConfirm.id, paymentStatusConfirm.status); setPaymentStatusConfirm(null); } }}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Order</AlertDialogTitle><AlertDialogDescription>Are you sure you want to permanently delete this cancelled order? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteConfirm) deleteOrder(deleteConfirm); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedIds.size} Cancelled Orders</AlertDialogTitle><AlertDialogDescription>Are you sure you want to permanently delete these cancelled orders? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkDeleteCancelled} className="bg-destructive hover:bg-destructive/90">Delete All</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedOrder} onOpenChange={(o) => { if (!o) setSelectedOrder(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {selectedOrder && (() => {
            const manualData = parseManualNotes(selectedOrder);
            return (
              <div className="space-y-4 mt-2">
                <OrderStatusTracker status={selectedOrder.status} />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Order ID:</span><p className="font-mono font-medium">#{selectedOrder.id.slice(0, 8)}</p></div>
                  <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString()}</p></div>
                  <div><span className="text-muted-foreground">Total:</span><p className="font-bold">{formatPrice(Number(selectedOrder.total), 0)}</p></div>
                  <div><span className="text-muted-foreground">Order Status:</span><p><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selectedOrder.status] || 'bg-muted'}`}>{STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</span></p></div>
                  <div><span className="text-muted-foreground">Payment Method:</span><p className="font-medium text-xs">{selectedOrder.payment_method || 'N/A'}</p></div>
                  {selectedOrder.transaction_id && <div><span className="text-muted-foreground">TRX ID:</span><p className="font-mono font-medium">{selectedOrder.transaction_id}</p></div>}
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div><span className="text-xs text-muted-foreground">Payment Status:</span><p><span className={`text-xs px-2 py-1 rounded-full ${PAYMENT_STATUS_COLORS[selectedOrder.payment_status] || 'bg-muted'}`}>{PAYMENT_STATUS_LABELS[selectedOrder.payment_status] || selectedOrder.payment_status || 'Pending'}</span></p></div>
                    {can('order_manage') && (
                      <Select value={selectedOrder.payment_status || 'pending'} onValueChange={(v) => setPaymentStatusConfirm({ id: selectedOrder.id, status: v })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                {manualData && (
                  <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-secondary">Manual Payment Details</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Method:</span> <span className="font-medium">{manualData.manual_method}</span></p>
                      {manualData.account_number && <p><span className="text-muted-foreground">Account:</span> <span className="font-mono font-medium">{manualData.account_number}</span></p>}
                      {manualData.expected_amount && <p><span className="text-muted-foreground">Expected Amount:</span> <span className="font-bold">{formatPrice(Number(manualData.expected_amount), 0)}</span></p>}
                      <p><span className="text-muted-foreground">TRX ID:</span> <span className="font-mono font-medium">{manualData.transaction_id}</span></p>
                    </div>
                    {manualData.screenshot_url && (<div><p className="text-xs text-muted-foreground mb-1">Payment Screenshot:</p><a href={manualData.screenshot_url} target="_blank" rel="noopener noreferrer"><img src={manualData.screenshot_url} alt="Payment screenshot" className="w-full max-h-60 object-contain rounded-lg border border-border" /></a></div>)}
                  </div>
                )}
                {selectedOrder.order_items?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Items</h4>
                    <div className="bg-muted/30 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border"><th className="text-left p-2 text-muted-foreground">Product</th><th className="text-center p-2 text-muted-foreground">Qty</th><th className="text-right p-2 text-muted-foreground">Price</th><th className="text-right p-2 text-muted-foreground">Total</th></tr></thead>
                        <tbody>{selectedOrder.order_items.map((item: any) => (<tr key={item.id} className="border-b border-border last:border-0"><td className="p-2 font-medium"><div className="flex items-center gap-2"><div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">{item.products?.image_url ? <img src={item.products.image_url} alt={item.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground" /></div>}</div><span>{item.product_name}</span></div></td><td className="p-2 text-center">{item.quantity}</td><td className="p-2 text-right">{formatPrice(Number(item.price), 0)}</td><td className="p-2 text-right font-medium">{formatPrice(item.price * item.quantity, 0)}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {can('order_manage') && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => printDoc(selectedOrder, 'invoice')}><Printer className="w-3 h-3 mr-1" /> Invoice</Button>
                      <Button size="sm" variant="outline" onClick={() => printDoc(selectedOrder, 'packing')}><Download className="w-3 h-3 mr-1" /> Packing Slip</Button>
                      <Button size="sm" variant="outline" onClick={() => printDoc(selectedOrder, 'label')}><Send className="w-3 h-3 mr-1" /> Shipping Label</Button>
                    </>
                  )}
                  {selectedOrder.status === 'cancelled' && can('order_delete') && (<Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(selectedOrder.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete Order</Button>)}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> Orders</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selectedIds.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead>Update</TableHead><TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell><Checkbox checked={selectedIds.has(o.id)} onCheckedChange={() => toggleSelect(o.id)} /></TableCell>
                <TableCell className="font-mono text-sm">#{o.id.slice(0, 8)}</TableCell>
                <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{formatPrice(Number(o.total), 0)}</TableCell>
                <TableCell><span className="text-xs">{getPaymentDisplay(o)}</span></TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-muted'}`}>{STATUS_LABELS[o.status] || o.status}</span></TableCell>
                <TableCell>
                  {can('order_manage') ? (
                  <Select value={o.status} onValueChange={(v) => setStatusConfirm({ id: o.id, status: v })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                  </Select>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(o)}><Eye className="w-3 h-3 mr-1" /> View</Button>
                    {o.status === 'cancelled' && can('order_delete') && <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(o.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => changeSize(Number(v))}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{ITEMS_PER_PAGE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-3 h-3" /></Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-3 h-3" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
