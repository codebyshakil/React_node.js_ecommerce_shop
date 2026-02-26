import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, FilterX, RotateCcw, Archive } from 'lucide-react';
import { usePaginationWithSize, PaginationControls, FormField } from '@/components/admin/AdminShared';

const getDaysLeft = (deletedAt: string) => {
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

const TestimonialsPanel = ({ testimonials, qc, can = () => true, logActivity }: { testimonials: any[]; qc: ReturnType<typeof useQueryClient>; can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', company: '', content: '', rating: 5, is_active: true });
  const reset = () => setForm({ name: '', company: '', content: '', rating: 5, is_active: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<string | null>(null);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [bulkPermDeleteConfirm, setBulkPermDeleteConfirm] = useState(false);
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<string | null>(null);

  const active = useMemo(() => testimonials.filter((t: any) => !t.is_deleted), [testimonials]);
  const trashed = useMemo(() => testimonials.filter((t: any) => t.is_deleted), [testimonials]);

  const filtered = useMemo(() => {
    let result = showTrash ? [...trashed] : [...active];
    if (searchQuery) result = result.filter((t: any) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!showTrash && statusFilter === 'active') result = result.filter((t: any) => t.is_active);
    if (!showTrash && statusFilter === 'inactive') result = result.filter((t: any) => !t.is_active);
    if (ratingFilter !== 'all') result = result.filter((t: any) => t.rating === Number(ratingFilter));
    if (dateFilter) result = result.filter((t: any) => new Date(t.created_at) >= new Date(dateFilter));
    return result;
  }, [active, trashed, showTrash, searchQuery, statusFilter, ratingFilter, dateFilter]);

  const hasFilters = searchQuery || statusFilter !== 'all' || ratingFilter !== 'all' || dateFilter;
  const resetFilters = () => { setSearchQuery(''); setStatusFilter('all'); setRatingFilter('all'); setDateFilter(''); };

  const { paged, page, totalPages, setPage, pageSize, changeSize } = usePaginationWithSize(filtered, 10);

  const cards = [
    { label: 'Total', count: active.length, filter: 'all' as const, color: 'from-yellow-500/10 to-yellow-600/5 border-yellow-200', textColor: 'text-yellow-700' },
    { label: 'Active', count: active.filter((t: any) => t.is_active).length, filter: 'active' as const, color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', textColor: 'text-emerald-700' },
    { label: 'Inactive', count: active.filter((t: any) => !t.is_active).length, filter: 'inactive' as const, color: 'from-rose-500/10 to-rose-600/5 border-rose-200', textColor: 'text-rose-700' },
  ];

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) { toast({ title: 'Name and content required', variant: 'destructive' }); return; }
    const { error } = editing ? await supabase.from('testimonials').update(form).eq('id', editing.id) : await supabase.from('testimonials').insert(form);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); qc.invalidateQueries({ queryKey: ['testimonials'] });
    setOpen(false); setEditing(null); reset(); toast({ title: editing ? 'Updated!' : 'Created!' });
    logActivity?.(editing ? 'testimonial_update' : 'testimonial_create', 'testimonial', editing?.id || '', `${editing ? 'Updated' : 'Created'} testimonial: ${form.name}`);
  };

  const updateActive = async (id: string, isActive: boolean) => {
    await supabase.from('testimonials').update({ is_active: isActive }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-testimonials'] });
    toast({ title: `Testimonial ${isActive ? 'activated' : 'deactivated'}` });
    logActivity?.('testimonial_status', 'testimonial', id, `Testimonial ${isActive ? 'activated' : 'deactivated'}`);
  };

  const softDelete = async (id: string) => {
    await supabase.from('testimonials').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-testimonials'] });
    setTrashConfirm(null); toast({ title: 'Moved to trash' });
  };

  const restore = async (id: string) => {
    await supabase.from('testimonials').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); toast({ title: 'Restored' });
  };

  const permDelete = async (id: string) => {
    await supabase.from('testimonials').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-testimonials'] });
    setPermDeleteConfirm(null); toast({ title: 'Permanently deleted' });
  };

  const bulkSoftDelete = async () => { const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('testimonials').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id); qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); setSelectedIds(new Set()); setBulkTrashConfirm(false); toast({ title: `${ids.length} moved to trash` }); };
  const bulkRestore = async () => { const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('testimonials').update({ is_deleted: false, deleted_at: null } as any).eq('id', id); qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); setSelectedIds(new Set()); setBulkRestoreConfirm(false); toast({ title: `${ids.length} restored` }); };
  const bulkPermDelete = async () => { const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('testimonials').delete().eq('id', id); qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); setSelectedIds(new Set()); setBulkPermDeleteConfirm(false); toast({ title: `${ids.length} permanently deleted` }); };
  const bulkUpdateActive = async (val: string) => { const isActive = val === 'active'; const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('testimonials').update({ is_active: isActive }).eq('id', id); qc.invalidateQueries({ queryKey: ['admin-testimonials'] }); setSelectedIds(new Set()); setBulkStatusConfirm(null); toast({ title: `${ids.length} testimonials ${isActive ? 'activated' : 'deactivated'}` }); };

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleAll = () => { if (selectedIds.size === paged.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paged.map((t: any) => t.id))); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Testimonials</h1>
        <div className="flex items-center gap-2">
          <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}>
            <Archive className="w-4 h-4 mr-1" /> Trash {trashed.length > 0 && `(${trashed.length})`}
          </Button>
          {!showTrash && can('testimonial_add') && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Testimonial</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add New'} Testimonial</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <FormField label="Customer Name" required><Input placeholder="e.g. John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
                  <FormField label="Company"><Input placeholder="e.g. ABC Corporation" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></FormField>
                  <FormField label="Testimonial Content" required><Textarea rows={4} placeholder="What did the customer say?" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></FormField>
                  <FormField label="Rating"><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></FormField>
                  <FormField label="Status">
                    <Select value={form.is_active ? 'active' : 'inactive'} onValueChange={(v) => setForm({ ...form, is_active: v === 'active' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                  <Button onClick={save} className="w-full">{editing ? 'Update' : 'Create'} Testimonial</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {!showTrash && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {cards.map((card) => (
            <button key={card.label} onClick={() => setStatusFilter(card.filter)} className={`bg-gradient-to-br ${card.color} rounded-xl border p-4 text-left transition-all hover:shadow-md ${statusFilter === card.filter ? 'ring-2 ring-primary shadow-md' : ''}`}>
              <p className={`text-xl font-bold ${card.textColor}`}>{card.count}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      {showTrash && trashed.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Trashed testimonials will be permanently deleted after 30 days.
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]"><label className="text-xs text-muted-foreground mb-1 block">Search</label><div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search testimonials..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></div>
          {!showTrash && <div><label className="text-xs text-muted-foreground mb-1 block">Status</label><Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>}
          <div><label className="text-xs text-muted-foreground mb-1 block">Rating</label><Select value={ratingFilter} onValueChange={setRatingFilter}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={r.toString()}>{'⭐'.repeat(r)}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">From Date</label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-36" /></div>
          {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground"><FilterX className="w-4 h-4 mr-1" /> Reset</Button>}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          {showTrash ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setBulkRestoreConfirm(true)}><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button>
              <Button size="sm" variant="destructive" onClick={() => setBulkPermDeleteConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete Permanently</Button>
            </>
          ) : (
            <>
              <Select onValueChange={(v) => setBulkStatusConfirm(v)}>
                <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Change Status" /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setBulkTrashConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border"><p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filtered.length}</span> Testimonials</p></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={paged.length > 0 && selectedIds.size === paged.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Name</TableHead><TableHead>Company</TableHead><TableHead>Rating</TableHead><TableHead>Date</TableHead>
              {!showTrash && <TableHead>Status</TableHead>}
              {showTrash && <TableHead>Auto-delete in</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{showTrash ? 'Trash is empty' : 'No testimonials found'}</TableCell></TableRow>}
            {paged.map((t: any) => (
              <TableRow key={t.id} className="hover:bg-muted/50">
                <TableCell><Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} /></TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.company || '—'}</TableCell>
                <TableCell>{'⭐'.repeat(t.rating ?? 5)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                {!showTrash && (
                  <TableCell>
                    <Select value={t.is_active ? 'active' : 'inactive'} onValueChange={(v) => updateActive(t.id, v === 'active')}>
                      <SelectTrigger className="w-24 h-7"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                )}
                {showTrash && <TableCell><span className="text-sm text-amber-600 dark:text-amber-400">{getDaysLeft(t.deleted_at)} days</span></TableCell>}
                <TableCell>
                  <div className="flex gap-1">
                    {showTrash ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => restore(t.id)}><RotateCcw className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setPermDeleteConfirm(t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </>
                    ) : (
                      <>
                        {can('testimonial_edit') && <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setForm({ name: t.name, company: t.company ?? '', content: t.content, rating: t.rating ?? 5, is_active: t.is_active ?? true }); setOpen(true); }}><Pencil className="w-3 h-3" /></Button>}
                        {can('testimonial_delete') && <Button size="sm" variant="ghost" onClick={() => setTrashConfirm(t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => changeSize(Number(v))}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[10, 25, 50, 100].map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={!!trashConfirm} onOpenChange={(o) => !o && setTrashConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move to Trash?</AlertDialogTitle><AlertDialogDescription>This testimonial will be moved to Trash and permanently deleted after 30 days.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => trashConfirm && softDelete(trashConfirm)}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!permDeleteConfirm} onOpenChange={(o) => !o && setPermDeleteConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>This testimonial will be permanently deleted and cannot be recovered.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => permDeleteConfirm && permDelete(permDeleteConfirm)}>Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkTrashConfirm} onOpenChange={setBulkTrashConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure you want to delete the selected testimonials?</AlertDialogTitle><AlertDialogDescription>{selectedIds.size} testimonials will be moved to Trash.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkSoftDelete}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkPermDeleteConfirm} onOpenChange={setBulkPermDeleteConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete {selectedIds.size} testimonials?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={bulkPermDelete}>Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkRestoreConfirm} onOpenChange={setBulkRestoreConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restore {selectedIds.size} testimonials?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkRestore}>Restore</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!bulkStatusConfirm} onOpenChange={(o) => !o && setBulkStatusConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Change status of {selectedIds.size} testimonials to "{bulkStatusConfirm}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => bulkStatusConfirm && bulkUpdateActive(bulkStatusConfirm)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TestimonialsPanel;
