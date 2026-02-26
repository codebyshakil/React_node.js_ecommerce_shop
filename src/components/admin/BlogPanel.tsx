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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, FilterX, RotateCcw, Archive } from 'lucide-react';
import { usePaginationWithSize, PaginationControls, FormField } from '@/components/admin/AdminShared';
import ImagePicker from './ImagePicker';
import RichTextEditor from './RichTextEditor';

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  unpublished: 'bg-red-100 text-red-700',
  draft: 'bg-amber-100 text-amber-700',
};

const getDaysLeft = (deletedAt: string) => {
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

const BlogPanel = ({ blogs, qc, can = () => true, logActivity }: { blogs: any[]; qc: ReturnType<typeof useQueryClient>; can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', category: 'General', author: 'Admin', image_url: '', status: 'draft' });
  const reset = () => setForm({ title: '', slug: '', excerpt: '', content: '', category: 'General', author: 'Admin', image_url: '', status: 'draft' });
  const autoSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  

  // Confirmations
  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<string | null>(null);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [bulkPermDeleteConfirm, setBulkPermDeleteConfirm] = useState(false);
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false);
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState<string | null>(null);

  const activeBlogs = useMemo(() => blogs.filter((b: any) => !b.is_deleted), [blogs]);
  const trashedBlogs = useMemo(() => blogs.filter((b: any) => b.is_deleted), [blogs]);
  const blogCategories = useMemo(() => [...new Set(activeBlogs.map((b: any) => b.category).filter(Boolean))], [activeBlogs]);

  const filteredBlogs = useMemo(() => {
    let result = showTrash ? [...trashedBlogs] : [...activeBlogs];
    if (searchQuery) result = result.filter((b: any) => b.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!showTrash && statusFilter !== 'all') result = result.filter((b: any) => (b.status || (b.is_published ? 'published' : 'draft')) === statusFilter);
    if (!showTrash && categoryFilter !== 'all') result = result.filter((b: any) => b.category === categoryFilter);
    if (dateFilter) result = result.filter((b: any) => new Date(b.created_at) >= new Date(dateFilter));
    return result;
  }, [activeBlogs, trashedBlogs, showTrash, searchQuery, statusFilter, categoryFilter, dateFilter]);

  const hasFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter;
  const resetFilters = () => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); setDateFilter(''); };

  const { paged, page, totalPages, setPage, pageSize, changeSize } = usePaginationWithSize(filteredBlogs, 10);

  const publishedCount = activeBlogs.filter((b: any) => (b.status || (b.is_published ? 'published' : 'draft')) === 'published').length;
  const unpublishedCount = activeBlogs.filter((b: any) => (b.status || (b.is_published ? 'published' : 'draft')) === 'unpublished').length;
  const draftCount = activeBlogs.filter((b: any) => (b.status || (b.is_published ? 'published' : 'draft')) === 'draft').length;

  const blogCards = [
    { label: 'Total Posts', count: activeBlogs.length, filter: 'all', color: 'from-blue-500/10 to-blue-600/5 border-blue-200', textColor: 'text-blue-700' },
    { label: 'Published', count: publishedCount, filter: 'published', color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', textColor: 'text-emerald-700' },
    { label: 'Unpublished', count: unpublishedCount, filter: 'unpublished', color: 'from-red-500/10 to-red-600/5 border-red-200', textColor: 'text-red-700' },
    { label: 'Draft', count: draftCount, filter: 'draft', color: 'from-amber-500/10 to-amber-600/5 border-amber-200', textColor: 'text-amber-700' },
  ];

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { toast({ title: 'Title and slug are required', variant: 'destructive' }); return; }
    const payload = { ...form, is_published: form.status === 'published' };
    const { error } = editing
      ? await supabase.from('blog_posts').update(payload).eq('id', editing.id)
      : await supabase.from('blog_posts').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['admin-blogs'] }); qc.invalidateQueries({ queryKey: ['blog_posts'] });
    setOpen(false); setEditing(null); reset(); toast({ title: editing ? 'Post updated!' : 'Post created!' });
    logActivity?.(editing ? 'blog_update' : 'blog_create', 'blog', editing?.id || '', `${editing ? 'Updated' : 'Created'} post: ${form.title}`);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('blog_posts').update({ status, is_published: status === 'published' } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    toast({ title: `Post status changed to ${status}` });
    logActivity?.('blog_status_change', 'blog', id, `Blog status changed to ${status}`);
  };

  const softDelete = async (id: string) => {
    await supabase.from('blog_posts').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    setTrashConfirm(null); toast({ title: 'Post moved to trash' });
  };

  const restore = async (id: string) => {
    await supabase.from('blog_posts').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    toast({ title: 'Post restored' });
  };

  const permDelete = async (id: string) => {
    await supabase.from('blog_posts').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    setPermDeleteConfirm(null); toast({ title: 'Post permanently deleted' });
  };

  const bulkSoftDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('blog_posts').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    setSelectedIds(new Set()); setBulkTrashConfirm(false);
    toast({ title: `${ids.length} posts moved to trash` });
  };

  const bulkRestore = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('blog_posts').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    setSelectedIds(new Set()); setBulkRestoreConfirm(false);
    toast({ title: `${ids.length} posts restored` });
  };

  const bulkPermDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('blog_posts').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    setSelectedIds(new Set()); setBulkPermDeleteConfirm(false);
    toast({ title: `${ids.length} posts permanently deleted` });
  };

  const bulkUpdateStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('blog_posts').update({ status, is_published: status === 'published' } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-blogs'] });
    setSelectedIds(new Set()); setBulkStatusConfirm(null);
    toast({ title: `${ids.length} posts changed to ${status}` });
  };

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleAll = () => { if (selectedIds.size === paged.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paged.map((b: any) => b.id))); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Blog Posts</h1>
        <div className="flex items-center gap-2">
          <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}>
            <Archive className="w-4 h-4 mr-1" /> Trash {trashedBlogs.length > 0 && `(${trashedBlogs.length})`}
          </Button>
          {!showTrash && can('blog_add') && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); reset(); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Post</Button></DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add New'} Blog Post</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <FormField label="Title" required><Input placeholder="Enter blog post title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : autoSlug(e.target.value) })} /></FormField>
                  <FormField label="URL Slug" required><Input placeholder="post-url-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Category"><Input placeholder="e.g. Tips, Recipes" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormField>
                    <FormField label="Author"><Input placeholder="Author name" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></FormField>
                  </div>
                  <FormField label="Featured Image">
                    <ImagePicker value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
                  </FormField>
                  <FormField label="Excerpt"><Textarea maxLength={200} placeholder="Brief summary..." value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></FormField>
                  <FormField label="Content" required>
                    <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Write your blog post content..." />
                  </FormField>
                  <FormField label="Status">
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="unpublished">Unpublished</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <Button onClick={save} className="w-full">{editing ? 'Update' : 'Create'} Post</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      

      {!showTrash && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {blogCards.map((card) => (
            <button key={card.label} onClick={() => setStatusFilter(card.filter)} className={`bg-gradient-to-br ${card.color} rounded-xl border p-4 text-left transition-all hover:shadow-md ${statusFilter === card.filter ? 'ring-2 ring-primary shadow-md' : ''}`}>
              <p className={`text-xl font-bold ${card.textColor}`}>{card.count}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      {showTrash && trashedBlogs.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Trashed posts will be permanently deleted after 30 days.
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]"><label className="text-xs text-muted-foreground mb-1 block">Search</label><div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></div>
          {!showTrash && (
            <>
              <div><label className="text-xs text-muted-foreground mb-1 block">Status</label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="unpublished">Unpublished</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Category</label><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{blogCategories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </>
          )}
          <div><label className="text-xs text-muted-foreground mb-1 block">From Date</label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-36" /></div>
          {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground"><FilterX className="w-4 h-4 mr-1" /> Reset</Button>}
        </div>
      </div>

      {/* Bulk actions */}
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
                <SelectTrigger className="w-36 h-8"><SelectValue placeholder="Change Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setBulkTrashConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border"><p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filteredBlogs.length}</span> Posts</p></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={paged.length > 0 && selectedIds.size === paged.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              {!showTrash && <TableHead>Status</TableHead>}
              {showTrash && <TableHead>Auto-delete in</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{showTrash ? 'Trash is empty' : 'No posts found'}</TableCell></TableRow>}
            {paged.map((b: any) => {
              const status = b.status || (b.is_published ? 'published' : 'draft');
              return (
                <TableRow key={b.id} className="hover:bg-muted/50">
                  <TableCell><Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => toggleSelect(b.id)} /></TableCell>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>{b.category}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                  {!showTrash && (
                    <TableCell>
                      <Select value={status} onValueChange={(v) => updateStatus(b.id, v)}>
                        <SelectTrigger className="w-28 h-7"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="unpublished">Unpublished</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {showTrash && <TableCell><span className="text-sm text-amber-600 dark:text-amber-400">{getDaysLeft(b.deleted_at)} days</span></TableCell>}
                  <TableCell>
                    <div className="flex gap-1">
                      {showTrash ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => restore(b.id)}><RotateCcw className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setPermDeleteConfirm(b.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                        </>
                      ) : (
                        <>
                          {can('blog_add') && <Button size="sm" variant="ghost" onClick={() => {
                            setEditing(b);
                            setForm({ title: b.title, slug: b.slug, excerpt: b.excerpt ?? '', content: b.content ?? '', category: b.category ?? 'General', author: b.author ?? 'Admin', image_url: b.image_url ?? '', status: b.status || (b.is_published ? 'published' : 'draft') });
                            setOpen(true);
                          }}><Pencil className="w-3 h-3" /></Button>}
                          {can('blog_delete') && <Button size="sm" variant="ghost" onClick={() => setTrashConfirm(b.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => changeSize(Number(v))}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={!!trashConfirm} onOpenChange={(o) => !o && setTrashConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move to Trash?</AlertDialogTitle><AlertDialogDescription>This post will be moved to Trash and permanently deleted after 30 days if not restored.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => trashConfirm && softDelete(trashConfirm)}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!permDeleteConfirm} onOpenChange={(o) => !o && setPermDeleteConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>This post will be permanently deleted and cannot be recovered.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => permDeleteConfirm && permDelete(permDeleteConfirm)}>Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkTrashConfirm} onOpenChange={setBulkTrashConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure you want to delete the selected posts?</AlertDialogTitle><AlertDialogDescription>{selectedIds.size} posts will be moved to Trash and permanently deleted after 30 days if not restored.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkSoftDelete}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkPermDeleteConfirm} onOpenChange={setBulkPermDeleteConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete {selectedIds.size} posts?</AlertDialogTitle><AlertDialogDescription>These posts will be permanently deleted and cannot be recovered.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={bulkPermDelete}>Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkRestoreConfirm} onOpenChange={setBulkRestoreConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restore {selectedIds.size} posts?</AlertDialogTitle><AlertDialogDescription>These posts will be restored from trash.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkRestore}>Restore</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!bulkStatusConfirm} onOpenChange={(o) => !o && setBulkStatusConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Change status of {selectedIds.size} posts to "{bulkStatusConfirm}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => bulkStatusConfirm && bulkUpdateStatus(bulkStatusConfirm)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogPanel;
