import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, X, Search, ImageIcon, FilterX, RotateCcw, Download, Archive } from 'lucide-react';
import { usePagination, PaginationControls, FormField } from './AdminShared';
import { MediaGalleryModal } from './MediaPanel';
import ImagePicker from './ImagePicker';
import RichTextEditor from './RichTextEditor';

const ProductsPanel = ({ products: allProducts, categories, qc, can = () => true, logActivity }: any) => {
  const { formatPrice, symbol: currencySymbol } = useCurrency();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', slug: '', description: '', short_description: '', category_id: '',
    image_url: '', gallery: [] as string[], regular_price: 0, discount_price: '',
    stock_quantity: 0, stock_status: 'in_stock', rating: '', review_count: '',
  });
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [variantOverrides, setVariantOverrides] = useState<Record<string, Record<string, { price: string; quantity: string }>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mediaOpen, setMediaOpen] = useState(false);
  const [galleryMediaOpen, setGalleryMediaOpen] = useState(false);

  // Filters
  const [sortBy, setSortBy] = useState('newest');
  const [filterStock, setFilterStock] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk & Trash
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null); // single item trash
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<string | null>(null);
  const [bulkPermDeleteConfirm, setBulkPermDeleteConfirm] = useState(false);
  const [bulkStatusChange, setBulkStatusChange] = useState<string | null>(null);

  const { data: variants = [] } = useQuery({
    queryKey: ['admin-variants'],
    queryFn: async () => { const { data } = await supabase.from('variants').select('*').eq('is_deleted', false).order('name'); return data ?? []; },
  });

  // Split products into active and trashed
  const products = useMemo(() => allProducts.filter((p: any) => !p.is_deleted), [allProducts]);
  const trashedProducts = useMemo(() => allProducts.filter((p: any) => p.is_deleted), [allProducts]);

  const inStockCount = products.filter((p: any) => p.stock_status === 'in_stock').length;
  const outOfStockCount = products.filter((p: any) => p.stock_status === 'out_of_stock').length;

  const productCards = [
    { label: 'Total Products', count: products.length, filter: 'all', color: 'from-blue-500/10 to-blue-600/5 border-blue-200', textColor: 'text-blue-700' },
    { label: 'In Stock', count: inStockCount, filter: 'in_stock', color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', textColor: 'text-emerald-700' },
    { label: 'Out of Stock', count: outOfStockCount, filter: 'out_of_stock', color: 'from-rose-500/10 to-rose-600/5 border-rose-200', textColor: 'text-rose-700' },
    { label: 'Trash', count: trashedProducts.length, filter: 'trash', color: 'from-gray-500/10 to-gray-600/5 border-gray-200', textColor: 'text-gray-700' },
  ];

  const currentList = showTrash ? trashedProducts : products;
  const filteredProducts = useMemo(() => {
    let result = [...currentList];
    if (!showTrash) {
      if (searchQuery) result = result.filter((p: any) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      if (filterStock !== 'all') result = result.filter((p: any) => p.stock_status === filterStock);
      if (filterCategory !== 'all') result = result.filter((p: any) => p.category_id === filterCategory);
      if (sortBy === 'newest') result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      else if (sortBy === 'oldest') result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      else if (sortBy === 'price_low') result.sort((a: any, b: any) => a.regular_price - b.regular_price);
      else if (sortBy === 'price_high') result.sort((a: any, b: any) => b.regular_price - a.regular_price);
    }
    return result;
  }, [currentList, sortBy, filterStock, filterCategory, searchQuery, showTrash]);

  const hasFilters = searchQuery || sortBy !== 'newest' || filterStock !== 'all' || filterCategory !== 'all';
  const resetFilters = () => { setSearchQuery(''); setSortBy('newest'); setFilterStock('all'); setFilterCategory('all'); };

  const reset = () => {
    setForm({ title: '', slug: '', description: '', short_description: '', category_id: '', image_url: '', gallery: [], regular_price: 0, discount_price: '', stock_quantity: 0, stock_status: 'in_stock', rating: '', review_count: '' });
    setSelectedVariantIds([]);
    setVariantOverrides({});
    setErrors({});
  };
  const { paged, page, totalPages, setPage } = usePagination(filteredProducts);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.slug.trim()) e.slug = 'Slug is required';
    if (form.regular_price <= 0) e.regular_price = 'Price must be greater than 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const save = async () => {
    if (!validate()) return;
    const variationsPayload = selectedVariantIds.map(id => {
      const v = variants.find((vr: any) => vr.id === id);
      if (!v) return null;
      const opts = Array.isArray(v.options) ? v.options : [];
      const overrides = variantOverrides[id] || {};
      return {
        type: v.name,
        options: opts.map((o: any) => {
          const val = typeof o === 'string' ? o : o.value;
          const ovr: { price?: string; quantity?: string } = overrides[val] || {};
          return { value: val, ...(ovr.price ? { price_diff: Number(ovr.price) } : {}), ...(ovr.quantity ? { stock: Number(ovr.quantity) } : {}) };
        }),
      };
    }).filter(Boolean);

    const galleryPayload = form.gallery.filter(g => g.trim());
    const payload = {
      ...form,
      regular_price: Number(form.regular_price),
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      stock_quantity: Number(form.stock_quantity),
      category_id: form.category_id || null,
      rating: form.rating !== '' ? Number(form.rating) : null,
      review_count: form.review_count !== '' ? Number(form.review_count) : null,
      variations: (variationsPayload.length > 0 ? variationsPayload : null) as any,
      gallery: galleryPayload.length > 0 ? galleryPayload : null,
    };
    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['products'] });
    setOpen(false); setEditing(null); reset();
    toast({ title: editing ? 'Product updated!' : 'Product created!' });
    logActivity?.(editing ? 'product_update' : 'product_create', 'product', editing?.id || '', `${editing ? 'Updated' : 'Created'} product: ${form.title}`);
  };

  // Soft delete (move to trash)
  const moveToTrash = async (id: string) => {
    await supabase.from('products').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    toast({ title: 'Product moved to trash' });
    logActivity?.('product_trash', 'product', id, 'Product moved to trash');
    setTrashConfirm(null);
  };

  // Permanently delete
  const permDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    toast({ title: 'Product permanently deleted' });
    logActivity?.('product_delete', 'product', id, 'Product permanently deleted');
    setPermDeleteConfirm(null);
  };

  // Restore from trash
  const restoreProduct = async (id: string) => {
    await supabase.from('products').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    toast({ title: 'Product restored' });
    logActivity?.('product_restore', 'product', id, 'Product restored from trash');
  };

  // Bulk operations
  const bulkMoveToTrash = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('products').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    setSelectedIds(new Set());
    setBulkTrashConfirm(false);
    toast({ title: `${ids.length} products moved to trash` });
  };

  const bulkPermDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('products').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    setSelectedIds(new Set());
    setBulkPermDeleteConfirm(false);
    toast({ title: `${ids.length} products permanently deleted` });
  };

  const bulkRestore = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('products').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    setSelectedIds(new Set());
    toast({ title: `${ids.length} products restored` });
  };

  const bulkStatusUpdate = async (status: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('products').update({ stock_status: status } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    setSelectedIds(new Set());
    setBulkStatusChange(null);
    toast({ title: `${ids.length} products status changed to ${status.replace('_', ' ')}` });
  };

  const getSelectedItems = () => {
    const ids = Array.from(selectedIds);
    return filteredProducts.filter((p: any) => ids.includes(p.id));
  };

  const bulkDownloadExcel = () => {
    const items = getSelectedItems();
    const header = ['Product Name', 'Price', 'Stock Quantity', 'Stock Status'];
    const rows = items.map((p: any) => [
      `"${p.title}"`, p.discount_price || p.regular_price, p.stock_quantity, p.stock_status.replace('_', ' ')
    ].join('\t'));
    const tsv = [header.join('\t'), ...rows].join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  const bulkDownloadPDF = () => {
    const items = getSelectedItems();
    const tableRows = items.map((p: any) =>
      `<tr><td style="border:1px solid #ddd;padding:8px;">${p.title}</td><td style="border:1px solid #ddd;padding:8px;text-align:right;">${formatPrice(p.discount_price || p.regular_price)}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${p.stock_quantity}</td><td style="border:1px solid #ddd;padding:8px;text-align:center;">${p.stock_status.replace('_', ' ')}</td></tr>`
    ).join('');
    const html = `<html><head><title>Products Report</title><style>body{font-family:Arial,sans-serif;padding:20px;}h2{margin-bottom:16px;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;border:1px solid #ddd;padding:8px;text-align:left;}td{border:1px solid #ddd;padding:8px;}@media print{body{padding:0;}}</style></head><body><h2>Products Report (${items.length} items)</h2><table><thead><tr><th>Product Name</th><th style="text-align:right;">Price</th><th style="text-align:center;">Stock Quantity</th><th style="text-align:center;">Stock Status</th></tr></thead><tbody>${tableRows}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleAll = () => { if (selectedIds.size === paged.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paged.map((p: any) => p.id))); };

  const startEdit = (p: any) => {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, description: p.description ?? '',
      short_description: p.short_description ?? '', category_id: p.category_id ?? '',
      image_url: p.image_url ?? '', gallery: Array.isArray(p.gallery) ? p.gallery : [],
      regular_price: p.regular_price, discount_price: p.discount_price?.toString() ?? '',
      stock_quantity: p.stock_quantity, stock_status: p.stock_status,
      rating: p.rating?.toString() ?? '', review_count: p.review_count?.toString() ?? '',
    });
    if (Array.isArray(p.variations)) {
      const matchedIds: string[] = [];
      const overrides: Record<string, Record<string, { price: string; quantity: string }>> = {};
      p.variations.forEach((v: any) => {
        const match = variants.find((vr: any) => vr.name === v.type);
        if (match) {
          matchedIds.push(match.id);
          if (Array.isArray(v.options)) {
            const optOverrides: Record<string, { price: string; quantity: string }> = {};
            v.options.forEach((o: any) => {
              if (o.price_diff || o.stock) optOverrides[o.value] = { price: o.price_diff?.toString() || '', quantity: o.stock?.toString() || '' };
            });
            if (Object.keys(optOverrides).length > 0) overrides[match.id] = optOverrides;
          }
        }
      });
      setSelectedVariantIds(matchedIds);
      setVariantOverrides(overrides);
    } else {
      setSelectedVariantIds([]);
      setVariantOverrides({});
    }
    setOpen(true);
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantIds(prev => {
      if (prev.includes(variantId)) {
        const next = { ...variantOverrides }; delete next[variantId]; setVariantOverrides(next);
        return prev.filter(v => v !== variantId);
      }
      return [...prev, variantId];
    });
  };

  const updateOverride = (variantId: string, optionValue: string, field: 'price' | 'quantity', val: string) => {
    setVariantOverrides(prev => {
      const next = { ...prev };
      if (!next[variantId]) next[variantId] = {};
      if (!next[variantId][optionValue]) next[variantId][optionValue] = { price: '', quantity: '' };
      next[variantId][optionValue][field] = val;
      return next;
    });
  };

  // Days until auto-delete for trash items
  const daysLeft = (deletedAt: string) => {
    const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
        <div className="flex gap-2">
          <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}>
            <Archive className="w-4 h-4 mr-1" /> Trash ({trashedProducts.length})
          </Button>
          {!showTrash && can('product_add') && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Product</Button></DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add New'} Product</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Product Title" required error={errors.title}>
                      <Input placeholder="e.g. Organic Turmeric Powder" value={form.title}
                        onChange={(e) => { setForm({ ...form, title: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) }); }} />
                    </FormField>
                    <FormField label="URL Slug" required error={errors.slug} description="Auto-generated from title">
                      <Input placeholder="organic-turmeric-powder" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                    </FormField>
                  </div>
                  <FormField label="Full Description" description="Detailed product description shown on product page">
                    <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="Write a detailed description of the product..." />
                  </FormField>
                  <FormField label="Short Description" description="Brief summary shown on product cards (max 160 chars)">
                    <Input placeholder="A brief summary of this product" maxLength={160} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Category">
                      <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                        <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Stock Status">
                      <Select value={form.stock_status} onValueChange={(v) => setForm({ ...form, stock_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_stock">In Stock</SelectItem>
                          <SelectItem value="low_stock">Low Stock</SelectItem>
                          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="Featured Image" description="Upload, select from gallery, or paste URL">
                    <ImagePicker value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
                  </FormField>
                  <FormField label="Gallery Images" description="Select multiple images from media gallery">
                    <div className="space-y-2">
                      {form.gallery.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {form.gallery.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-lg border border-border overflow-hidden">
                              <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                              <button onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, j) => j !== i) })} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => setGalleryMediaOpen(true)}>
                        <ImageIcon className="w-4 h-4 mr-2" />Add Gallery Images
                      </Button>
                    </div>
                  </FormField>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Regular Price" required error={errors.regular_price} description={`Base price in ${currencySymbol}`}>
                      <Input type="number" min={0} step={0.01} placeholder="0.00" value={form.regular_price} onChange={(e) => setForm({ ...form, regular_price: Number(e.target.value) })} />
                    </FormField>
                    <FormField label="Discount Price" description="Leave empty for no discount">
                      <Input type="number" min={0} step={0.01} placeholder="Optional" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} />
                    </FormField>
                    <FormField label="Stock Quantity" description="Available inventory count">
                      <Input type="number" min={0} placeholder="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Rating" description="Manual rating (0-5)">
                      <Input type="number" min={0} max={5} step={0.1} placeholder="e.g. 4.5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
                    </FormField>
                    <FormField label="Review Count" description="Number of reviews to display">
                      <Input type="number" min={0} placeholder="e.g. 25" value={form.review_count} onChange={(e) => setForm({ ...form, review_count: e.target.value })} />
                    </FormField>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="mb-3">
                      <h4 className="font-semibold text-foreground">Product Variations</h4>
                      <p className="text-xs text-muted-foreground">Select variant types, then set optional price/quantity overrides per option</p>
                    </div>
                    {variants.length === 0 ? (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">No variants created yet. Go to Variants page to create variant types first.</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedVariantIds.map(id => {
                            const v = variants.find((vr: any) => vr.id === id);
                            if (!v) return null;
                            return (
                              <Badge key={id} variant="secondary" className="gap-1">
                                {v.name}
                                <button onClick={() => handleVariantSelect(id)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                              </Badge>
                            );
                          })}
                        </div>
                        <Select value="" onValueChange={(v) => { if (v && !selectedVariantIds.includes(v)) handleVariantSelect(v); }}>
                          <SelectTrigger><SelectValue placeholder="Select variants to add..." /></SelectTrigger>
                          <SelectContent>
                            {variants.filter((v: any) => !selectedVariantIds.includes(v.id)).map((v: any) => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedVariantIds.map(id => {
                          const v = variants.find((vr: any) => vr.id === id);
                          if (!v) return null;
                          const opts = Array.isArray(v.options) ? v.options : [];
                          return (
                            <div key={id} className="bg-muted/30 rounded-lg p-3 border border-border">
                              <p className="text-sm font-medium text-foreground mb-2">{v.name} Options</p>
                              <div className="space-y-2">
                                <div className="grid grid-cols-[1fr,80px,80px] gap-2 text-xs text-muted-foreground font-medium">
                                  <span>Option</span><span>Price ({currencySymbol})</span><span>Qty</span>
                                </div>
                                {opts.map((o: any, i: number) => {
                                  const val = typeof o === 'string' ? o : o.value;
                                  const ovr = variantOverrides[id]?.[val] || { price: '', quantity: '' };
                                  return (
                                    <div key={i} className="grid grid-cols-[1fr,80px,80px] gap-2">
                                      <div className="flex items-center"><Badge variant="outline" className="text-xs">{val}</Badge></div>
                                      <Input type="number" placeholder="Opt." className="h-8 text-xs" value={ovr.price} onChange={(e) => updateOverride(id, val, 'price', e.target.value)} />
                                      <Input type="number" placeholder="Opt." className="h-8 text-xs" value={ovr.quantity} onChange={(e) => updateOverride(id, val, 'quantity', e.target.value)} />
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">Leave blank to use product default price/stock</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Button onClick={save} className="w-full">{editing ? 'Update' : 'Create'} Product</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Confirm Dialogs */}
      <AlertDialog open={!!trashConfirm} onOpenChange={(o) => { if (!o) setTrashConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move to Trash?</AlertDialogTitle><AlertDialogDescription>This product will be moved to trash. It will be auto-deleted after 30 days.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => trashConfirm && moveToTrash(trashConfirm)}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkTrashConfirm} onOpenChange={setBulkTrashConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move {selectedIds.size} products to trash?</AlertDialogTitle><AlertDialogDescription>Selected products will be moved to trash and auto-deleted after 30 days.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkMoveToTrash}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!permDeleteConfirm} onOpenChange={(o) => { if (!o) setPermDeleteConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. The product will be permanently removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => permDeleteConfirm && permDelete(permDeleteConfirm)} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkPermDeleteConfirm} onOpenChange={setBulkPermDeleteConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete {selectedIds.size} products?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkPermDelete} className="bg-destructive hover:bg-destructive/90">Delete Forever</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!bulkStatusChange} onOpenChange={(o) => { if (!o) setBulkStatusChange(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Change status of {selectedIds.size} products?</AlertDialogTitle><AlertDialogDescription>Status will be changed to "{bulkStatusChange?.replace('_', ' ')}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => bulkStatusChange && bulkStatusUpdate(bulkStatusChange)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <MediaGalleryModal open={mediaOpen} onOpenChange={setMediaOpen} onSelect={(url) => setForm({ ...form, image_url: url })} />
      <MediaGalleryModal open={galleryMediaOpen} onOpenChange={setGalleryMediaOpen} onSelect={() => {}} multiple onSelectMultiple={(urls) => setForm({ ...form, gallery: [...form.gallery, ...urls] })} />

      {!showTrash && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {productCards.map((card) => (
              <button key={card.label} onClick={() => { if (card.filter === 'trash') { setShowTrash(true); setSelectedIds(new Set()); } else { setShowTrash(false); setFilterStock(card.filter); } }} className={`bg-gradient-to-br ${card.color} rounded-xl border p-4 text-left transition-all hover:shadow-md ${(!showTrash && filterStock === card.filter) || (showTrash && card.filter === 'trash') ? 'ring-2 ring-primary shadow-md' : ''}`}>
                <p className={`text-xl font-bold ${card.textColor}`}>{card.count}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </button>
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">Search</label>
                <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sort</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="newest">New to Old</SelectItem><SelectItem value="oldest">Old to New</SelectItem><SelectItem value="price_low">Price: Low</SelectItem><SelectItem value="price_high">Price: High</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stock</label>
                <Select value={filterStock} onValueChange={setFilterStock}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="in_stock">In Stock</SelectItem><SelectItem value="low_stock">Low Stock</SelectItem><SelectItem value="out_of_stock">Out of Stock</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground"><FilterX className="w-4 h-4 mr-1" /> Reset</Button>}
            </div>
          </div>
        </>
      )}

      {showTrash && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          <Archive className="w-4 h-4 inline mr-1" /> Items in trash are auto-deleted after 30 days. Select items to restore or permanently delete.
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => { setShowTrash(false); setSelectedIds(new Set()); }}>← Back to Products</Button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          {showTrash ? (
            <>
              <Button size="sm" variant="outline" onClick={bulkRestore}><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button>
              <Button size="sm" variant="destructive" onClick={() => setBulkPermDeleteConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete Forever</Button>
            </>
          ) : (
            <>
              {can('product_edit') && (
                <Select value="" onValueChange={(v) => setBulkStatusChange(v)}>
                  <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Change Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {can('product_delete') && (
                <Button size="sm" variant="outline" onClick={() => setBulkTrashConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              )}
              <Button size="sm" variant="outline" onClick={bulkDownloadPDF}><Download className="w-3 h-3 mr-1" /> PDF</Button>
              <Button size="sm" variant="outline" onClick={bulkDownloadExcel}><Download className="w-3 h-3 mr-1" /> Excel</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filteredProducts.length}</span> {showTrash ? 'Trashed' : ''} Products</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selectedIds.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              {showTrash && <TableHead>Auto-delete</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={showTrash ? 8 : 7} className="text-center py-12 text-muted-foreground">{showTrash ? 'Trash is empty' : 'No products found'}</TableCell></TableRow>
            ) : paged.map((p: any) => (
              <TableRow key={p.id} className="hover:bg-muted/50">
                <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></TableCell>
                <TableCell>{p.image_url ? <img src={p.image_url} alt={p.title} className="w-10 h-10 rounded-md object-cover" /> : <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">N/A</div>}</TableCell>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.category?.name ?? '—'}</TableCell>
                <TableCell>{formatPrice(Number(p.regular_price), 0)}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full ${p.stock_status === 'in_stock' ? 'bg-green-100 text-green-700' : p.stock_status === 'low_stock' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.stock_status.replace('_', ' ')}</span></TableCell>
                {showTrash && <TableCell><span className="text-xs text-muted-foreground">{p.deleted_at ? `${daysLeft(p.deleted_at)} days` : '30 days'}</span></TableCell>}
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {showTrash ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => restoreProduct(p.id)} title="Restore"><RotateCcw className="w-3 h-3 text-green-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setPermDeleteConfirm(p.id)} title="Delete forever"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </>
                    ) : (
                      <>
                        {can('product_edit') && <Button size="sm" variant="ghost" onClick={() => startEdit(p)}><Pencil className="w-3 h-3" /></Button>}
                        {can('product_delete') && <Button size="sm" variant="ghost" onClick={() => setTrashConfirm(p.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
};

export default ProductsPanel;
