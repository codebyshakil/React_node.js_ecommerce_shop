import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Copy, Tag, Calendar, Users, Package, FilterX } from 'lucide-react';
import { format } from 'date-fns';
import { usePaginationWithSize, PaginationControls } from '@/components/admin/AdminShared';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  applies_to: string;
  selected_product_ids: string[];
  selected_customer_ids: string[];
  created_at: string;
}

const defaultCoupon = {
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 0,
  min_order_amount: 0,
  max_discount_amount: null as number | null,
  usage_limit: null as number | null,
  usage_count: 0,
  per_user_limit: 1,
  start_date: new Date().toISOString(),
  end_date: null as string | null,
  is_active: true,
  applies_to: 'all',
  selected_product_ids: [] as string[],
  selected_customer_ids: [] as string[],
};

const CouponsPanel = ({ can = () => true, logActivity }: { can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const qc = useQueryClient();
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultCoupon });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Coupon[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-for-coupons'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('id, title, image_url').eq('is_deleted', false).order('title');
      return data ?? [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['admin-customers-for-coupons'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name, phone').eq('is_deleted', false).order('full_name');
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = coupons;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') list = list.filter(c => c.is_active);
    if (statusFilter === 'inactive') list = list.filter(c => !c.is_active);
    if (statusFilter === 'expired') list = list.filter(c => c.end_date && new Date(c.end_date) < new Date());
    return list;
  }, [coupons, search, statusFilter]);

  const { paged, page, totalPages, setPage, pageSize, changeSize } = usePaginationWithSize(filtered, 25);

  const isExpired = (c: Coupon) => c.end_date && new Date(c.end_date) < new Date();
  const isUsedUp = (c: Coupon) => c.usage_limit !== null && c.usage_count >= c.usage_limit;

  const getStatus = (c: Coupon) => {
    if (!c.is_active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-600' };
    if (isExpired(c)) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
    if (isUsedUp(c)) return { label: 'Used Up', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-700' };
  };

  const openCreate = () => {
    setForm({ ...defaultCoupon, start_date: new Date().toISOString() });
    setEditingId(null);
    setEditOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      description: c.description || '',
      discount_type: c.discount_type as 'percentage' | 'fixed',
      discount_value: c.discount_value,
      min_order_amount: c.min_order_amount,
      max_discount_amount: c.max_discount_amount,
      usage_limit: c.usage_limit,
      usage_count: c.usage_count,
      per_user_limit: c.per_user_limit,
      start_date: c.start_date,
      end_date: c.end_date,
      is_active: c.is_active,
      applies_to: c.applies_to,
      selected_product_ids: (c.selected_product_ids as any) || [],
      selected_customer_ids: (c.selected_customer_ids as any) || [],
    });
    setEditingId(c.id);
    setEditOpen(true);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: 'Coupon code is required', variant: 'destructive' }); return; }
    if (form.discount_value <= 0) { toast({ title: 'Discount value must be greater than 0', variant: 'destructive' }); return; }
    if (form.discount_type === 'percentage' && form.discount_value > 100) { toast({ title: 'Percentage cannot exceed 100%', variant: 'destructive' }); return; }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order_amount: form.min_order_amount || 0,
      max_discount_amount: form.max_discount_amount || null,
      usage_limit: form.usage_limit || null,
      per_user_limit: form.per_user_limit || 1,
      start_date: form.start_date,
      end_date: form.end_date || null,
      is_active: form.is_active,
      applies_to: form.applies_to,
      selected_product_ids: form.selected_product_ids,
      selected_customer_ids: form.selected_customer_ids,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('coupons').update(payload as any).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Coupon updated' });
        logActivity?.('coupon_update', 'coupon', editingId, `Updated coupon: ${form.code}`);
      } else {
        const { error } = await supabase.from('coupons').insert(payload as any);
        if (error) throw error;
        toast({ title: 'Coupon created' });
        logActivity?.('coupon_create', 'coupon', '', `Created coupon: ${form.code}`);
      }
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('coupons').delete().eq('id', deleteId);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Coupon deleted' }); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); logActivity?.('coupon_delete', 'coupon', deleteId, 'Coupon deleted'); }
    setDeleteId(null);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('coupons').update({ is_active: active } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-coupons'] });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: code });
  };

  const filteredProducts = products.filter((p: any) =>
    !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter((c: any) =>
    !customerSearch || c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-secondary" /> Promo Codes / Coupons
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} coupon{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {can('coupon_add') && <Button onClick={openCreate} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" /> Create Coupon
        </Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search code or description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
            <FilterX className="w-4 h-4 mr-1" /> Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className="hidden md:table-cell">Min Order</TableHead>
              <TableHead className="hidden md:table-cell">Usage</TableHead>
              <TableHead className="hidden lg:table-cell">Expires</TableHead>
              <TableHead className="hidden lg:table-cell">Applies To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No coupons found</TableCell></TableRow>
            ) : paged.map(c => {
              const status = getStatus(c);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded text-sm">{c.code}</code>
                      <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatPrice(c.discount_value)}
                    </span>
                    {c.max_discount_amount && c.discount_type === 'percentage' && (
                      <span className="text-xs text-muted-foreground block">max {formatPrice(c.max_discount_amount)}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.min_order_amount > 0 ? formatPrice(c.min_order_amount) : '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {c.end_date ? format(new Date(c.end_date), 'dd MMM yyyy') : 'No expiry'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="text-xs capitalize">{c.applies_to.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch checked={c.is_active} onCheckedChange={v => toggleActive(c.id, v)} className="scale-75" />
                      {can('coupon_edit') && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>}
                      {can('coupon_delete') && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Code & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Coupon Code *</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SAVE20" className="font-mono" />
                  <Button type="button" variant="outline" size="sm" onClick={generateCode} className="shrink-0">Generate</Button>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="mt-1" />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v: any) => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ({currencySymbol})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value *</Label>
                <Input type="number" value={form.discount_value || ''} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} placeholder={form.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 100'} className="mt-1" />
              </div>
              {form.discount_type === 'percentage' && (
                <div>
                  <Label>Max Discount ({currencySymbol})</Label>
                  <Input type="number" value={form.max_discount_amount ?? ''} onChange={e => setForm(f => ({ ...f, max_discount_amount: e.target.value ? Number(e.target.value) : null }))} placeholder="No limit" className="mt-1" />
                </div>
              )}
            </div>

            {/* Min Order & Usage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Min Order Amount ({currencySymbol})</Label>
                <Input type="number" value={form.min_order_amount || ''} onChange={e => setForm(f => ({ ...f, min_order_amount: Number(e.target.value) }))} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Total Usage Limit</Label>
                <Input type="number" value={form.usage_limit ?? ''} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" className="mt-1" />
              </div>
              <div>
                <Label>Per User Limit</Label>
                <Input type="number" value={form.per_user_limit || ''} onChange={e => setForm(f => ({ ...f, per_user_limit: Number(e.target.value) || 1 }))} placeholder="1" className="mt-1" />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start Date</Label>
                <Input type="datetime-local" value={form.start_date ? format(new Date(form.start_date), "yyyy-MM-dd'T'HH:mm") : ''} onChange={e => setForm(f => ({ ...f, start_date: new Date(e.target.value).toISOString() }))} className="mt-1" />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Expiry Date</Label>
                <Input type="datetime-local" value={form.end_date ? format(new Date(form.end_date), "yyyy-MM-dd'T'HH:mm") : ''} onChange={e => setForm(f => ({ ...f, end_date: e.target.value ? new Date(e.target.value).toISOString() : null }))} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-0.5">Leave empty for no expiry</p>
              </div>
            </div>

            {/* Applies To */}
            <div>
              <Label className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Applies To</Label>
              <Select value={form.applies_to} onValueChange={v => setForm(f => ({ ...f, applies_to: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers & Products</SelectItem>
                  <SelectItem value="selected_products">Selected Products Only</SelectItem>
                  <SelectItem value="selected_customers">Selected Customers Only</SelectItem>
                  <SelectItem value="new_customers">New Customers Only (First Order)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            {form.applies_to === 'selected_products' && (
              <div className="border border-border rounded-lg p-4">
                <Label className="flex items-center gap-1 mb-2"><Package className="w-3.5 h-3.5" /> Select Products ({form.selected_product_ids.length} selected)</Label>
                <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.map((p: any) => (
                    <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm">
                      <Checkbox
                        checked={form.selected_product_ids.includes(p.id)}
                        onCheckedChange={checked => {
                          setForm(f => ({
                            ...f,
                            selected_product_ids: checked
                              ? [...f.selected_product_ids, p.id]
                              : f.selected_product_ids.filter(id => id !== p.id),
                          }));
                        }}
                      />
                      {p.image_url && <img src={p.image_url} className="w-6 h-6 rounded object-cover" alt="" />}
                      <span className="line-clamp-1">{p.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Selection */}
            {form.applies_to === 'selected_customers' && (
              <div className="border border-border rounded-lg p-4">
                <Label className="flex items-center gap-1 mb-2"><Users className="w-3.5 h-3.5" /> Select Customers ({form.selected_customer_ids.length} selected)</Label>
                <Input placeholder="Search customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredCustomers.map((c: any) => (
                    <label key={c.user_id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer text-sm">
                      <Checkbox
                        checked={form.selected_customer_ids.includes(c.user_id)}
                        onCheckedChange={checked => {
                          setForm(f => ({
                            ...f,
                            selected_customer_ids: checked
                              ? [...f.selected_customer_ids, c.user_id]
                              : f.selected_customer_ids.filter(id => id !== c.user_id),
                          }));
                        }}
                      />
                      <span>{c.full_name || 'Unknown'}</span>
                      {c.phone && <span className="text-muted-foreground text-xs">({c.phone})</span>}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {editingId ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this coupon and its usage history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CouponsPanel;
