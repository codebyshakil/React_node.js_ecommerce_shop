import { useState, useMemo, useCallback } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Eye, Pencil, Trash2, Ban, ShieldOff, Users, UserPlus, RefreshCw, Lock, Mail, Check, X, ChevronLeft, ArrowUpDown, Package } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePagination, PaginationControls, FormField, ROLE_COLORS, ROLE_LABELS } from './AdminShared';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';

// Inline editable field component
const InlineEditField = ({ label, value, field, onSave }: { label: string; value: string; field: string; onSave: (field: string, value: string) => Promise<void> }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(field, editValue);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => { setEditValue(value); setEditing(false); };

  if (editing) {
    return (
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
            disabled={saving}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSave} disabled={saving}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={handleCancel} disabled={saving}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5 mt-0.5">
        <p className="font-medium text-sm">{value || '—'}</p>
        <button
          onClick={() => { setEditValue(value); setEditing(true); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
          title={`Edit ${label}`}
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  'send to courier': 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  unpaid: 'bg-red-100 text-red-700',
};

const CustomersPanel = ({ can = () => true, logActivity }: { can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const queryClient = useQueryClient();
  const { formatPrice } = useCurrency();
  const { user, userRole: authUserRole } = useAuth();
  const [viewCustomer, setViewCustomer] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; customer: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'repeated' | 'blocked'>('all');
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderSort, setOrderSort] = useState<'date' | 'status'>('date');
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PER_PAGE = 10;

  const { data: profiles = [] } = useQuery({ queryKey: ['admin-profiles'], queryFn: async () => { const { data } = await supabase.from('profiles').select('*').eq('is_deleted', false).order('created_at', { ascending: false }); return data ?? []; } });
  const { data: roles = [] } = useQuery({ queryKey: ['admin-user-roles'], queryFn: async () => { const { data } = await supabase.from('user_roles').select('*'); return data ?? []; } });
  const { data: orders = [] } = useQuery({ queryKey: ['admin-orders'], queryFn: async () => { const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }); return data ?? []; } });

  const { data: authUsersMap = {} } = useQuery({
    queryKey: ['admin-auth-users', profiles.map((p: any) => p.user_id).join(',')],
    queryFn: async () => {
      if (profiles.length === 0) return {};
      const userIds = profiles.map((p: any) => p.user_id);
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { action: 'get_users_info', user_ids: userIds }
      });
      if (error || !data?.users) return {};
      return data.users as Record<string, { email: string; email_confirmed_at: string | null }>;
    },
    enabled: profiles.length > 0,
  });

  // Fetch order items for selected order
  const { data: orderItems = [] } = useQuery({
    queryKey: ['order-items', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data } = await supabase.from('order_items').select('*, products(title, image_url)').eq('order_id', selectedOrder.id);
      return data ?? [];
    },
    enabled: !!selectedOrder,
  });

  const customers = useMemo(() => {
    return profiles.filter((p: any) => {
      const userRoles = roles.filter((r: any) => r.user_id === p.user_id);
      const hasStaffRole = userRoles.some((r: any) => ['admin', 'sales_manager', 'account_manager', 'support_assistant', 'marketing_manager'].includes(r.role));
      return !hasStaffRole;
    }).map((p: any) => {
      const customerOrders = orders.filter((o: any) => o.user_id === p.user_id);
      const completedOrders = customerOrders.filter((o: any) => o.status === 'delivered');
      const totalSpent = customerOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
      const now = new Date();
      const createdAt = new Date(p.created_at);
      const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const lastOrderDate = customerOrders.length > 0 ? new Date(customerOrders[0].created_at) : null;
      const daysSinceLastOrder = lastOrderDate ? (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24) : null;

      let customerType: 'new' | 'repeated' | 'blocked' | 'regular' = 'regular';
      if (p.is_blocked) customerType = 'blocked';
      else if (completedOrders.length >= 2) customerType = 'repeated';
      else if (customerOrders.length === 0 || (customerOrders.length === 1 && daysSinceLastOrder !== null && daysSinceLastOrder <= 2) || (daysSinceCreated <= 60 && customerOrders.length === 0) || (customerOrders.length >= 1 && daysSinceLastOrder !== null && daysSinceLastOrder <= 7)) customerType = 'new';

      const authInfo = authUsersMap[p.user_id];
      return { ...p, orderCount: customerOrders.length, completedOrders: completedOrders.length, totalSpent, customerType, _email: authInfo?.email || '', _email_verified: !!p.email_verified };
    });
  }, [profiles, roles, orders, authUsersMap]);

  const cities = useMemo(() => [...new Set(customers.map((c: any) => c.city).filter(Boolean))], [customers]);

  const totalCustomers = customers.length;
  const newCustomers = customers.filter((c: any) => c.customerType === 'new').length;
  const repeatedCustomers = customers.filter((c: any) => c.customerType === 'repeated').length;
  const blockedCustomers = customers.filter((c: any) => c.customerType === 'blocked').length;

  const cards = [
    { label: 'Total Customers', count: totalCustomers, filter: 'all' as const, color: 'from-blue-500/10 to-blue-600/5 border-blue-200', textColor: 'text-blue-700', icon: Users },
    { label: 'Repeated', count: repeatedCustomers, filter: 'repeated' as const, color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', textColor: 'text-emerald-700', icon: RefreshCw },
    { label: 'New', count: newCustomers, filter: 'new' as const, color: 'from-violet-500/10 to-violet-600/5 border-violet-200', textColor: 'text-violet-700', icon: UserPlus },
    { label: 'Blocked', count: blockedCustomers, filter: 'blocked' as const, color: 'from-rose-500/10 to-rose-600/5 border-rose-200', textColor: 'text-rose-700', icon: Ban },
  ];

  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c._email || '').toLowerCase().includes(q) ||
        (c.user_id || '').toLowerCase().includes(q) ||
        orders.some((o: any) => o.user_id === c.user_id && o.id.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all') result = result.filter((c: any) => c.customerType === statusFilter);
    if (cityFilter !== 'all') result = result.filter((c: any) => c.city === cityFilter);
    if (dateFilter !== 'all') {
      const now = new Date();
      const days = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 }[dateFilter] || 0;
      if (days > 0) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        result = result.filter((c: any) => new Date(c.created_at) >= cutoff);
      }
    }
    return result;
  }, [customers, searchQuery, statusFilter, cityFilter, dateFilter, orders]);

  const { paged, page, totalPages, setPage } = usePagination(filteredCustomers);

  const blockCustomer = async (customer: any) => {
    await supabase.from('profiles').update({ is_blocked: true } as any).eq('id', customer.id);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: `${customer.full_name || 'Customer'} has been blocked` });
    logActivity('block_customer', 'customer', customer.user_id, `Blocked customer: ${customer.full_name}`);
  };

  const unblockCustomer = async (customer: any) => {
    await supabase.from('profiles').update({ is_blocked: false } as any).eq('id', customer.id);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: `${customer.full_name || 'Customer'} has been unblocked` });
    logActivity('unblock_customer', 'customer', customer.user_id, `Unblocked customer: ${customer.full_name}`);
  };

  const deleteCustomer = async (customer: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: customer.user_id }
      });
      if (error || data?.error) {
        const msg = data?.error || error?.message || 'Deletion failed';
        const details = data?.details ? `\n${data.details.join(', ')}` : '';
        toast({ title: 'Delete failed', description: `${msg}${details}`, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Customer permanently deleted' });
      logActivity('permanent_delete_customer', 'customer', customer.user_id, `Permanently deleted customer: ${customer.full_name}`);
      setViewCustomer(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Could not delete customer.', variant: 'destructive' });
    }
  };

  const changePassword = async () => {
    if (!viewCustomer || !passwordForm.password || passwordForm.password !== passwordForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    const { error } = await supabase.functions.invoke('admin-reset-password', {
      body: { action: 'reset_password', user_id: viewCustomer.user_id, new_password: passwordForm.password }
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Password changed successfully' });
    setShowPasswordDialog(false);
    setPasswordForm({ password: '', confirm: '' });
    logActivity('change_password', 'customer', viewCustomer.user_id, `Changed password for: ${viewCustomer.full_name}`);
  };

  // Inline save handler for individual fields
  const saveField = useCallback(async (field: string, value: string) => {
    if (!viewCustomer) return;

    if (field === 'email') {
      // Handle email change via edge function
      if (value === viewCustomer._email) return;
      try {
        const { error } = await supabase.functions.invoke('admin-reset-password', {
          body: { action: 'update_email', user_id: viewCustomer.user_id, new_email: value.trim().toLowerCase() }
        });
        if (error) { toast({ title: 'Email update failed', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Email updated' });
        queryClient.invalidateQueries({ queryKey: ['admin-auth-users'] });
        logActivity('edit_customer_email', 'customer', viewCustomer.user_id, `Updated email to ${value}`);
      } catch (err: any) {
        toast({ title: 'Email update failed', variant: 'destructive' });
      }
      return;
    }

    // Profile field update
    const { error } = await supabase.from('profiles').update({ [field]: value } as any).eq('id', viewCustomer.id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }

    // Update local state immediately
    setViewCustomer((prev: any) => prev ? { ...prev, [field]: value } : prev);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: 'Updated successfully' });
    logActivity('edit_customer', 'customer', viewCustomer.user_id, `Updated ${field} for: ${viewCustomer.full_name}`);
  }, [viewCustomer, queryClient]);

  // logActivity is now passed via props, remove the local one
  // Using the logActivity prop directly

  const customerOrders = useMemo(() => {
    if (!viewCustomer) return [];
    let result = orders.filter((o: any) => o.user_id === viewCustomer.user_id);
    if (orderSort === 'status') {
      result.sort((a: any, b: any) => (a.status || '').localeCompare(b.status || ''));
    }
    // date sort is default (already sorted by created_at desc)
    return result;
  }, [viewCustomer, orders, orderSort]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDERS_PER_PAGE;
    return customerOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [customerOrders, orderPage]);

  const orderTotalPages = Math.ceil(customerOrders.length / ORDERS_PER_PAGE);

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    const { type, customer } = confirmAction;
    if (type === 'block') blockCustomer(customer);
    else if (type === 'unblock') unblockCustomer(customer);
    else if (type === 'delete') deleteCustomer(customer);
    setConfirmAction(null);
  };

  return (
    <div>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map((card) => (
          <button key={card.label} onClick={() => setStatusFilter(card.filter)} className={`bg-gradient-to-br ${card.color} rounded-xl border p-4 text-left transition-all hover:shadow-md ${statusFilter === card.filter ? 'ring-2 ring-primary shadow-md' : ''}`}>
            <card.icon className={`w-4 h-4 ${card.textColor} mb-2`} />
            <p className={`text-xl font-bold ${card.textColor}`}>{card.count}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Name, Phone, Email, Order ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Period</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last 1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City</label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filteredCustomers.length}</span> Customers</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No customers found.</TableCell></TableRow>
            ) : paged.map((c: any) => (
              <TableRow key={c.id} className={`hover:bg-muted/50 ${c.is_blocked ? 'opacity-60' : ''}`}>
                <TableCell className="font-medium">{c.full_name || '—'}</TableCell>
                <TableCell>{c.phone || '—'}</TableCell>
                <TableCell>{c.city || '—'}</TableCell>
                <TableCell><Badge variant="secondary">{c.orderCount}</Badge></TableCell>
                <TableCell className="font-medium">{formatPrice(c.totalSpent, 0)}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.customerType === 'repeated' ? 'bg-emerald-100 text-emerald-700' :
                    c.customerType === 'new' ? 'bg-violet-100 text-violet-700' :
                    c.customerType === 'blocked' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {c.customerType === 'repeated' ? 'Repeated' : c.customerType === 'new' ? 'New' : c.customerType === 'blocked' ? 'Blocked' : 'Regular'}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => { setViewCustomer(c); setSelectedOrder(null); setOrderPage(1); }}><Eye className="w-3 h-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to continue?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete' && 'This will PERMANENTLY delete the customer and ALL related data including orders, reviews, cart, activity logs, and their account. This action cannot be undone.'}
              {confirmAction?.type === 'block' && 'This will block the customer from accessing the store.'}
              {confirmAction?.type === 'unblock' && 'This will restore the customer\'s access to the store.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className={confirmAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {confirmAction?.type === 'delete' ? 'Permanently Delete' : confirmAction?.type === 'block' ? 'Block' : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Customer Password</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <FormField label="New Password" required><Input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} /></FormField>
            <FormField label="Confirm Password" required><Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} /></FormField>
            <Button onClick={changePassword} className="w-full">Change Password</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={!!viewCustomer} onOpenChange={(o) => { if (!o) { setViewCustomer(null); setSelectedOrder(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {viewCustomer && !selectedOrder && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="px-6 pt-6 pb-3 border-b border-border">
                <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
              </div>
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-5">
                  {/* Customer Info with inline edit icons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {can('customer_edit') ? (
                      <InlineEditField label="Name" value={viewCustomer.full_name || ''} field="full_name" onSave={saveField} />
                    ) : (
                      <div><span className="text-xs text-muted-foreground">Name</span><p className="font-medium text-sm mt-0.5">{viewCustomer.full_name || '—'}</p></div>
                    )}
                    {can('customer_edit') ? (
                      <InlineEditField label="Phone" value={viewCustomer.phone || ''} field="phone" onSave={saveField} />
                    ) : (
                      <div><span className="text-xs text-muted-foreground">Phone</span><p className="font-medium text-sm mt-0.5">{viewCustomer.phone || '—'}</p></div>
                    )}
                    {can('customer_edit') ? (
                      <InlineEditField label="Email" value={viewCustomer._email || ''} field="email" onSave={saveField} />
                    ) : (
                      <div><span className="text-xs text-muted-foreground">Email</span><p className="font-medium text-sm mt-0.5">{viewCustomer._email || '—'}</p></div>
                    )}
                    <div className="group">
                      <span className="text-xs text-muted-foreground">Email Status</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={async () => {
                            const newVerified = !viewCustomer._email_verified;
                            // Update profile
                            await supabase.from('profiles').update({ email_verified: newVerified } as any).eq('id', viewCustomer.id);
                            // Update auth user email_confirm
                            await supabase.functions.invoke('admin-reset-password', {
                              body: { action: 'update_email', user_id: viewCustomer.user_id, email_confirm: newVerified }
                            });
                            setViewCustomer((prev: any) => prev ? { ...prev, _email_verified: newVerified } : prev);
                            queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
                            toast({ title: `Email marked as ${newVerified ? 'verified' : 'unverified'}` });
                            logActivity('toggle_email_verified', 'customer', viewCustomer.user_id, `Set email ${newVerified ? 'verified' : 'unverified'} for: ${viewCustomer.full_name}`);
                          }}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                            viewCustomer._email_verified
                              ? 'text-green-700 bg-green-100 hover:bg-green-200'
                              : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                          }`}
                        >
                          {viewCustomer._email_verified ? '✓ Verified' : '✗ Not Verified'}
                        </button>
                        <span className="text-[10px] text-muted-foreground">Click to toggle</span>
                      </div>
                    </div>
                    {can('customer_edit') ? (
                      <InlineEditField label="City" value={viewCustomer.city || ''} field="city" onSave={saveField} />
                    ) : (
                      <div><span className="text-xs text-muted-foreground">City</span><p className="font-medium text-sm mt-0.5">{viewCustomer.city || '—'}</p></div>
                    )}
                    {can('customer_edit') ? (
                      <InlineEditField label="Country" value={viewCustomer.country || ''} field="country" onSave={saveField} />
                    ) : (
                      <div><span className="text-xs text-muted-foreground">Country</span><p className="font-medium text-sm mt-0.5">{viewCustomer.country || '—'}</p></div>
                    )}
                    {can('customer_edit') ? (
                      <InlineEditField label="Address" value={viewCustomer.address || ''} field="address" onSave={saveField} />
                    ) : (
                      <div><span className="text-xs text-muted-foreground">Address</span><p className="font-medium text-sm mt-0.5">{viewCustomer.address || '—'}</p></div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-4 text-sm">
                    <div className="bg-muted/40 rounded-lg px-4 py-2">
                      <span className="text-muted-foreground text-xs">Joined</span>
                      <p className="font-medium">{new Date(viewCustomer.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-4 py-2">
                      <span className="text-muted-foreground text-xs">Orders</span>
                      <p className="font-bold">{viewCustomer.orderCount}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-4 py-2">
                      <span className="text-muted-foreground text-xs">Total Spent</span>
                      <p className="font-bold">{formatPrice(viewCustomer.totalSpent, 0)}</p>
                    </div>
                  </div>

                  {viewCustomer.is_blocked && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm font-semibold text-destructive">⛔ This customer is blocked</p>
                    </div>
                  )}

                  {/* Purchase History */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">Purchase History</h4>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setOrderSort(orderSort === 'date' ? 'status' : 'date')}>
                        <ArrowUpDown className="w-3 h-3" /> Sort by {orderSort === 'date' ? 'Status' : 'Date'}
                      </Button>
                    </div>
                    {customerOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
                    ) : (
                      <>
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-border"><th className="text-left p-2 text-muted-foreground text-xs">Order ID</th><th className="text-left p-2 text-muted-foreground text-xs">Date</th><th className="text-right p-2 text-muted-foreground text-xs">Total</th><th className="text-center p-2 text-muted-foreground text-xs">Status</th></tr></thead>
                            <tbody>
                              {pagedOrders.map((o: any) => (
                                <tr key={o.id} className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedOrder(o)}>
                                  <td className="p-2 font-mono text-xs text-primary">#{o.id.slice(0, 8)}</td>
                                  <td className="p-2">{new Date(o.created_at).toLocaleDateString()}</td>
                                  <td className="p-2 text-right font-medium">{formatPrice(Number(o.total), 0)}</td>
                                  <td className="p-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLORS[o.status] || 'bg-muted'}`}>{o.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {orderTotalPages > 1 && (
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <span className="text-muted-foreground">Page {orderPage} of {orderTotalPages}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)}>Previous</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={orderPage >= orderTotalPages} onClick={() => setOrderPage(p => p + 1)}>Next</Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" onClick={() => { setShowPasswordDialog(true); }}>
                      <Lock className="w-3 h-3 mr-1" /> Change Password
                    </Button>
                    {can('customer_edit') && (viewCustomer.is_blocked ? (
                      <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'unblock', customer: viewCustomer })}>
                        <ShieldOff className="w-3 h-3 mr-1" /> Unblock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={() => setConfirmAction({ type: 'block', customer: viewCustomer })}>
                        <Ban className="w-3 h-3 mr-1" /> Block
                      </Button>
                    ))}
                    {can('customer_delete') && <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: 'delete', customer: viewCustomer })}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Order Detail View */}
          {viewCustomer && selectedOrder && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="px-6 pt-6 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedOrder(null)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <DialogHeader><DialogTitle className="text-base">Order #{selectedOrder.id.slice(0, 8)}</DialogTitle></DialogHeader>
                </div>
              </div>
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  {/* Order status badges */}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Order Status</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[selectedOrder.status] || 'bg-muted'}`}>{selectedOrder.status}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Payment Status</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[selectedOrder.payment_status] || 'bg-muted'}`}>{selectedOrder.payment_status}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Payment Method</span>
                      <span className="text-xs font-medium">{selectedOrder.payment_method || '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Date</span>
                      <span className="text-xs font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Products */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Products</h4>
                    <div className="space-y-2">
                      {orderItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Loading items...</p>
                      ) : orderItems.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                            {item.products?.image_url ? (
                              <img src={item.products.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.product_name}</p>
                            {item.variation && Object.keys(item.variation).length > 0 && (
                              <p className="text-xs text-muted-foreground">{Object.entries(item.variation).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-sm shrink-0">{formatPrice(Number(item.price), 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Info */}
                  {selectedOrder.shipping_address && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Shipping Information</h4>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                        {typeof selectedOrder.shipping_address === 'object' && Object.entries(selectedOrder.shipping_address as Record<string, any>).map(([key, val]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground capitalize min-w-[80px]">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">{String(val || '—')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order Total */}
                  <div className="bg-muted/30 rounded-lg p-3 flex justify-between items-center">
                    <span className="font-semibold text-sm">Total</span>
                    <span className="font-bold text-lg">{formatPrice(Number(selectedOrder.total), 0)}</span>
                  </div>

                  {selectedOrder.notes && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPanel;
