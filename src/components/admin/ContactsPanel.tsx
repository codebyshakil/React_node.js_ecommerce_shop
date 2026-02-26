import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Trash2, Search, FilterX, RotateCcw, Archive, Eye, Mail, MailOpen, MessageCircle, MessageSquare } from 'lucide-react';
import { usePaginationWithSize, PaginationControls } from '@/components/admin/AdminShared';

const getDaysLeft = (deletedAt: string) => {
  const diff = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

const ContactsPanel = ({ contacts, qc, can = () => true, logActivity }: { contacts: any[]; qc: ReturnType<typeof useQueryClient>; can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'responded'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMessage, setViewMessage] = useState<any>(null);
  const [showTrash, setShowTrash] = useState(false);

  const [trashConfirm, setTrashConfirm] = useState<string | null>(null);
  const [permDeleteConfirm, setPermDeleteConfirm] = useState<string | null>(null);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [bulkPermDeleteConfirm, setBulkPermDeleteConfirm] = useState(false);
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false);

  const activeContacts = useMemo(() => contacts.filter((c: any) => !c.is_deleted), [contacts]);
  const trashedContacts = useMemo(() => contacts.filter((c: any) => c.is_deleted), [contacts]);

  const unreadCount = activeContacts.filter((c: any) => (c.status || 'unread') === 'unread').length;
  const readCount = activeContacts.filter((c: any) => c.status === 'read').length;
  const respondedCount = activeContacts.filter((c: any) => c.status === 'responded').length;

  const msgCards = [
    { label: 'Total', count: activeContacts.length, filter: 'all' as const, color: 'from-blue-500/10 to-blue-600/5 border-blue-200', textColor: 'text-blue-700', icon: MessageSquare },
    { label: 'Unread', count: unreadCount, filter: 'unread' as const, color: 'from-amber-500/10 to-amber-600/5 border-amber-200', textColor: 'text-amber-700', icon: Mail },
    { label: 'Read', count: readCount, filter: 'read' as const, color: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200', textColor: 'text-emerald-700', icon: MailOpen },
    { label: 'Responded', count: respondedCount, filter: 'responded' as const, color: 'from-violet-500/10 to-violet-600/5 border-violet-200', textColor: 'text-violet-700', icon: MessageCircle },
  ];

  const filteredContacts = useMemo(() => {
    let result = showTrash ? [...trashedContacts] : [...activeContacts];
    if (searchQuery) result = result.filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase()) || c.message.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!showTrash && statusFilter !== 'all') result = result.filter((c: any) => (c.status || 'unread') === statusFilter);
    if (dateFilter) result = result.filter((c: any) => new Date(c.created_at) >= new Date(dateFilter));
    return result;
  }, [activeContacts, trashedContacts, showTrash, searchQuery, statusFilter, dateFilter]);

  const hasFilters = searchQuery || statusFilter !== 'all' || dateFilter;
  const resetFilters = () => { setSearchQuery(''); setStatusFilter('all'); setDateFilter(''); };

  const { paged, page, totalPages, setPage, pageSize, changeSize } = usePaginationWithSize(filteredContacts, 10);

  const updateMsgStatus = async (id: string, status: string) => {
    if (!can('message_status_change')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to change message status.', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('contact_messages').update({ status, is_read: status !== 'unread' } as any).eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin-contacts'] });
      if (viewMessage?.id === id) setViewMessage({ ...viewMessage, status });
      toast({ title: `Message marked as ${status}` });
      logActivity?.('message_status_change', 'contact', id, `Message status changed to ${status}`);
    } catch (err: any) {
      toast({ title: 'Failed to update status', description: err.message, variant: 'destructive' });
    }
  };

  const softDelete = async (id: string) => {
    await supabase.from('contact_messages').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-contacts'] });
    setTrashConfirm(null); toast({ title: 'Message moved to trash' });
    logActivity?.('message_trash', 'contact', id, 'Message moved to trash');
  };

  const restore = async (id: string) => {
    await supabase.from('contact_messages').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-contacts'] }); toast({ title: 'Message restored' });
  };

  const permDelete = async (id: string) => {
    await supabase.from('contact_messages').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-contacts'] });
    setPermDeleteConfirm(null); toast({ title: 'Permanently deleted' });
  };

  const bulkSoftDelete = async () => { const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('contact_messages').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id); qc.invalidateQueries({ queryKey: ['admin-contacts'] }); setSelectedIds(new Set()); setBulkTrashConfirm(false); toast({ title: `${ids.length} messages moved to trash` }); };
  const bulkRestore = async () => { const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('contact_messages').update({ is_deleted: false, deleted_at: null } as any).eq('id', id); qc.invalidateQueries({ queryKey: ['admin-contacts'] }); setSelectedIds(new Set()); setBulkRestoreConfirm(false); toast({ title: `${ids.length} messages restored` }); };
  const bulkPermDelete = async () => { const ids = Array.from(selectedIds); for (const id of ids) await supabase.from('contact_messages').delete().eq('id', id); qc.invalidateQueries({ queryKey: ['admin-contacts'] }); setSelectedIds(new Set()); setBulkPermDeleteConfirm(false); toast({ title: `${ids.length} messages permanently deleted` }); };

    const bulkAction = async (action: 'read' | 'unread' | 'responded') => {
    if (!can('message_status_change')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to change message status.', variant: 'destructive' });
      return;
    }
    const ids = Array.from(selectedIds);
    for (const id of ids) await supabase.from('contact_messages').update({ status: action, is_read: action !== 'unread' } as any).eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-contacts'] }); setSelectedIds(new Set());
    toast({ title: `${ids.length} messages marked as ${action}` });
  };

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const toggleAll = () => { if (selectedIds.size === paged.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paged.map((c: any) => c.id))); };

  return (
    <div>
      {!showTrash && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {msgCards.map((card) => (
            <button key={card.label} onClick={() => setStatusFilter(card.filter)} className={`bg-gradient-to-br ${card.color} rounded-xl border p-4 text-left transition-all hover:shadow-md ${statusFilter === card.filter ? 'ring-2 ring-primary shadow-md' : ''}`}>
              <card.icon className={`w-4 h-4 ${card.textColor} mb-2`} />
              <p className={`text-xl font-bold ${card.textColor}`}>{card.count}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Messages</h1>
        <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => { setShowTrash(!showTrash); setSelectedIds(new Set()); }}>
          <Archive className="w-4 h-4 mr-1" /> Trash {trashedContacts.length > 0 && `(${trashedContacts.length})`}
        </Button>
      </div>

      {showTrash && trashedContacts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Trashed messages will be permanently deleted after 30 days.
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]"><label className="text-xs text-muted-foreground mb-1 block">Search</label><div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></div>
          {!showTrash && <div><label className="text-xs text-muted-foreground mb-1 block">Status</label><Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="unread">Unread</SelectItem><SelectItem value="read">Read</SelectItem><SelectItem value="responded">Responded</SelectItem></SelectContent></Select></div>}
          <div><label className="text-xs text-muted-foreground mb-1 block">From Date</label><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-36" /></div>
          {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground"><FilterX className="w-4 h-4 mr-1" /> Reset</Button>}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          {showTrash ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setBulkRestoreConfirm(true)}><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button>
              <Button size="sm" variant="destructive" onClick={() => setBulkPermDeleteConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete Permanently</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => bulkAction('read')}><MailOpen className="w-3 h-3 mr-1" /> Mark Read</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction('unread')}><Mail className="w-3 h-3 mr-1" /> Mark Unread</Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction('responded')}><MessageCircle className="w-3 h-3 mr-1" /> Mark Responded</Button>
              <Button size="sm" variant="outline" onClick={() => setBulkTrashConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      <Dialog open={!!viewMessage} onOpenChange={(o) => { if (!o) setViewMessage(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Message Details</DialogTitle></DialogHeader>
          {viewMessage && (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">From:</span><p className="font-medium">{viewMessage.name}</p></div>
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{viewMessage.email}</p></div>
                <div><span className="text-muted-foreground">Subject:</span><p className="font-medium">{viewMessage.subject || 'No subject'}</p></div>
                <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{new Date(viewMessage.created_at).toLocaleDateString()}</p></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-foreground whitespace-pre-line">{viewMessage.message}</p></div>
              <div className="flex gap-2">
                <Select value={viewMessage.status || 'unread'} onValueChange={(v) => updateMsgStatus(viewMessage.id, v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="unread">Unread</SelectItem><SelectItem value="read">Read</SelectItem><SelectItem value="responded">Responded</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 border-b border-border"><p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filteredContacts.length}</span> Messages</p></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={selectedIds.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Subject</TableHead><TableHead>Date</TableHead>
              {!showTrash && <TableHead>Status</TableHead>}
              {showTrash && <TableHead>Auto-delete in</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">{showTrash ? 'Trash is empty' : 'No messages yet.'}</TableCell></TableRow>
            ) : paged.map((c: any) => (
              <TableRow key={c.id} className={`hover:bg-muted/50 ${!showTrash && (c.status || 'unread') === 'unread' ? 'font-semibold' : ''}`}>
                <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm">{c.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.subject || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                {!showTrash && (
                  <TableCell>
                    <Select value={c.status || 'unread'} onValueChange={(v) => updateMsgStatus(c.id, v)}>
                      <SelectTrigger className="w-28 h-7"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="unread">Unread</SelectItem><SelectItem value="read">Read</SelectItem><SelectItem value="responded">Responded</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                )}
                {showTrash && <TableCell><span className="text-sm text-amber-600 dark:text-amber-400">{getDaysLeft(c.deleted_at)} days</span></TableCell>}
                <TableCell>
                  <div className="flex gap-1">
                    {showTrash ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => restore(c.id)}><RotateCcw className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setPermDeleteConfirm(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setViewMessage(c); if ((c.status || 'unread') === 'unread') updateMsgStatus(c.id, 'read'); }}><Eye className="w-3 h-3" /></Button>
                        {can('message_delete') && <Button size="sm" variant="ghost" onClick={() => setTrashConfirm(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
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
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Move to Trash?</AlertDialogTitle><AlertDialogDescription>This message will be moved to Trash and permanently deleted after 30 days.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => trashConfirm && softDelete(trashConfirm)}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!permDeleteConfirm} onOpenChange={(o) => !o && setPermDeleteConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently Delete?</AlertDialogTitle><AlertDialogDescription>This message will be permanently deleted and cannot be recovered.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => permDeleteConfirm && permDelete(permDeleteConfirm)}>Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkTrashConfirm} onOpenChange={setBulkTrashConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure you want to delete the selected messages?</AlertDialogTitle><AlertDialogDescription>{selectedIds.size} messages will be moved to Trash.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkSoftDelete}>Move to Trash</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkPermDeleteConfirm} onOpenChange={setBulkPermDeleteConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Permanently delete {selectedIds.size} messages?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={bulkPermDelete}>Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkRestoreConfirm} onOpenChange={setBulkRestoreConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restore {selectedIds.size} messages?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={bulkRestore}>Restore</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactsPanel;
