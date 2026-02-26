import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Trash2, Search, FilterX, Save, RotateCcw, Archive } from 'lucide-react';
import { usePagination, PaginationControls, ROLE_LABELS, ROLE_COLORS } from './AdminShared';
import { useAdminContent, useUpdateAdminContent } from '@/hooks/useAdminSettings';

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-blue-100 text-blue-700',
  order_status_change: 'bg-violet-100 text-violet-700',
  payment_status_change: 'bg-emerald-100 text-emerald-700',
  product_create: 'bg-green-100 text-green-700',
  product_update: 'bg-amber-100 text-amber-700',
  product_delete: 'bg-red-100 text-red-700',
  product_trash: 'bg-orange-100 text-orange-700',
  product_restore: 'bg-teal-100 text-teal-700',
  block_customer: 'bg-red-100 text-red-700',
  unblock_customer: 'bg-green-100 text-green-700',
  delete_customer: 'bg-red-100 text-red-700',
  edit_customer: 'bg-amber-100 text-amber-700',
  change_password: 'bg-violet-100 text-violet-700',
  permission_change: 'bg-indigo-100 text-indigo-700',
  permission_group_change: 'bg-indigo-100 text-indigo-700',
  blog_create: 'bg-green-100 text-green-700',
  blog_update: 'bg-amber-100 text-amber-700',
  blog_status_change: 'bg-violet-100 text-violet-700',
  category_create: 'bg-green-100 text-green-700',
  category_update: 'bg-amber-100 text-amber-700',
  category_trash: 'bg-orange-100 text-orange-700',
  category_delete: 'bg-red-100 text-red-700',
  variant_create: 'bg-green-100 text-green-700',
  variant_update: 'bg-amber-100 text-amber-700',
  variant_trash: 'bg-orange-100 text-orange-700',
  variant_delete: 'bg-red-100 text-red-700',
  coupon_create: 'bg-green-100 text-green-700',
  coupon_update: 'bg-amber-100 text-amber-700',
  coupon_delete: 'bg-red-100 text-red-700',
  testimonial_create: 'bg-green-100 text-green-700',
  testimonial_update: 'bg-amber-100 text-amber-700',
  testimonial_status: 'bg-violet-100 text-violet-700',
  employee_create: 'bg-green-100 text-green-700',
  employee_edit: 'bg-amber-100 text-amber-700',
  employee_trash: 'bg-orange-100 text-orange-700',
  employee_delete: 'bg-red-100 text-red-700',
  employee_role_change: 'bg-indigo-100 text-indigo-700',
  employee_status: 'bg-violet-100 text-violet-700',
  page_create: 'bg-green-100 text-green-700',
  page_trash: 'bg-orange-100 text-orange-700',
  page_delete: 'bg-red-100 text-red-700',
  message_status_change: 'bg-violet-100 text-violet-700',
  message_trash: 'bg-orange-100 text-orange-700',
  shipping_zone_create: 'bg-green-100 text-green-700',
  shipping_zone_update: 'bg-amber-100 text-amber-700',
  shipping_rate_create: 'bg-green-100 text-green-700',
  shipping_rate_update: 'bg-amber-100 text-amber-700',
  order_delete: 'bg-red-100 text-red-700',
  bulk_order_delete: 'bg-red-100 text-red-700',
};

const LogsPanel = ({ isAdmin }: { isAdmin: boolean }) => {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'trash' | 'delete' | 'restore' | 'empty_trash' | 'clear_all'; ids?: string[] } | null>(null);

  // Log retention setting
  const { data: retentionSetting } = useAdminContent('log_retention_days');
  const updateRetention = useUpdateAdminContent();
  const [retentionDays, setRetentionDays] = useState('');
  const [retentionLoaded, setRetentionLoaded] = useState(false);

  if (retentionSetting !== undefined && !retentionLoaded) {
    setRetentionDays(String(retentionSetting || ''));
    setRetentionLoaded(true);
  }

  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500);
      return data ?? [];
    },
  });

  const filteredLogs = useMemo(() => {
    let result = logs.filter((l: any) => viewMode === 'trash' ? l.is_deleted : !l.is_deleted);
    if (roleFilter !== 'all') result = result.filter((l: any) => l.user_role === roleFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l: any) =>
        (l.action || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q) ||
        (l.user_name || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) result = result.filter((l: any) => new Date(l.created_at) >= new Date(dateFrom));
    if (dateTo) result = result.filter((l: any) => new Date(l.created_at) <= new Date(dateTo + 'T23:59:59'));
    return result;
  }, [logs, viewMode, roleFilter, searchQuery, dateFrom, dateTo]);

  const hasFilters = roleFilter !== 'all' || searchQuery || dateFrom || dateTo;
  const resetFilters = () => { setRoleFilter('all'); setSearchQuery(''); setDateFrom(''); setDateTo(''); };

  const { paged, page, totalPages, setPage } = usePagination(filteredLogs);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map((l: any) => l.id)));
    }
  }, [paged, selectedIds.size]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
    setSelectedIds(new Set());
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    const { type, ids } = confirmAction;

    if (type === 'trash' && ids?.length) {
      for (const id of ids) {
        await supabase.from('activity_logs').update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq('id', id);
      }
      toast({ title: `${ids.length} log(s) moved to trash` });
    } else if (type === 'restore' && ids?.length) {
      for (const id of ids) {
        await supabase.from('activity_logs').update({ is_deleted: false, deleted_at: null } as any).eq('id', id);
      }
      toast({ title: `${ids.length} log(s) restored` });
    } else if (type === 'delete' && ids?.length) {
      for (const id of ids) {
        await supabase.from('activity_logs').delete().eq('id', id);
      }
      toast({ title: `${ids.length} log(s) permanently deleted` });
    } else if (type === 'empty_trash') {
      await supabase.from('activity_logs').delete().eq('is_deleted', true);
      toast({ title: 'Trash emptied' });
    } else if (type === 'clear_all') {
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      toast({ title: 'All logs cleared' });
    }

    invalidate();
    setConfirmAction(null);
  };

  const saveRetention = async () => {
    const days = parseInt(retentionDays);
    if (!days || days < 1) {
      toast({ title: 'Enter a valid number of days (minimum 1)', variant: 'destructive' });
      return;
    }
    await updateRetention.mutateAsync({ key: 'log_retention_days', value: days });
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    await supabase.from('activity_logs').delete().lt('created_at', cutoff);
    invalidate();
    toast({ title: `Retention set to ${days} days. Old logs deleted.` });
  };

  const selectedArray = Array.from(selectedIds);
  const trashCount = logs.filter((l: any) => l.is_deleted).length;
  const activeCount = logs.filter((l: any) => !l.is_deleted).length;

  const confirmDialogText = {
    trash: { title: 'Move to Trash?', desc: `${selectedArray.length} log(s) will be moved to trash. They will be auto-deleted after 30 days.` },
    restore: { title: 'Restore Logs?', desc: `${selectedArray.length} log(s) will be restored.` },
    delete: { title: 'Permanently Delete?', desc: `${selectedArray.length} log(s) will be permanently deleted. This cannot be undone.` },
    empty_trash: { title: 'Empty Trash?', desc: 'All trashed logs will be permanently deleted. This cannot be undone.' },
    clear_all: { title: 'Clear All Logs?', desc: 'All activity logs will be permanently deleted. This cannot be undone.' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">System Logs</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('active'); setSelectedIds(new Set()); }}
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={viewMode === 'trash' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('trash'); setSelectedIds(new Set()); }}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Trash ({trashCount})
          </Button>
        </div>
      </div>

      {/* Retention Setting */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border p-4 mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Auto-delete logs older than</label>
            <Input type="number" min="1" placeholder="e.g. 30" value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} className="w-24" />
            <span className="text-sm text-muted-foreground">days</span>
            <Button size="sm" onClick={saveRetention} disabled={updateRetention.isPending}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
            {retentionSetting && <span className="text-xs text-muted-foreground ml-2">Current: {String(retentionSetting)} days</span>}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="bg-muted rounded-xl border border-border p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          {viewMode === 'active' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'trash', ids: selectedArray })}>
                <Archive className="w-3 h-3 mr-1" /> Move to Trash
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'restore', ids: selectedArray })}>
                <RotateCcw className="w-3 h-3 mr-1" /> Restore
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ type: 'delete', ids: selectedArray })}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete Permanently
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
        </div>
      )}

      {/* Trash actions */}
      {isAdmin && viewMode === 'trash' && trashCount > 0 && selectedIds.size === 0 && (
        <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trashed logs auto-delete after 30 days.</span>
          <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ type: 'empty_trash' })}>
            <Trash2 className="w-3 h-3 mr-1" /> Empty Trash
          </Button>
        </div>
      )}

      {/* Active mode top actions */}
      {isAdmin && viewMode === 'active' && selectedIds.size === 0 && (
        <div className="flex justify-end mb-2">
          <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ type: 'clear_all' })}>
            <Trash2 className="w-3 h-3 mr-1" /> Clear All Logs
          </Button>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction && confirmDialogText[confirmAction.type]?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction && confirmDialogText[confirmAction.type]?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction} className="bg-destructive hover:bg-destructive/90">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Role</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                <SelectItem value="account_manager">Account Manager</SelectItem>
                <SelectItem value="support_assistant">Support Assistant</SelectItem>
                <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">From</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">To</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" /></div>
          {hasFilters && <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground"><FilterX className="w-4 h-4 mr-1" /> Reset</Button>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox checked={paged.length > 0 && selectedIds.size === paged.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
              )}
              <TableHead>Date/Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              {isAdmin && viewMode === 'active' && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-12 text-muted-foreground">
                {viewMode === 'trash' ? 'Trash is empty.' : 'No logs found.'}
              </TableCell></TableRow>
            ) : paged.map((log: any) => (
              <TableRow key={log.id} className={selectedIds.has(log.id) ? 'bg-muted/50' : ''}>
                {isAdmin && (
                  <TableCell>
                    <Checkbox checked={selectedIds.has(log.id)} onCheckedChange={() => toggleSelect(log.id)} />
                  </TableCell>
                )}
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell className="font-medium text-sm">{log.user_name || '—'}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[log.user_role] || 'bg-muted'}`}>{ROLE_LABELS[log.user_role] || log.user_role}</span></TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}>{log.action?.replace(/_/g, ' ')}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.details || '—'}</TableCell>
                {isAdmin && viewMode === 'active' && (
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'trash', ids: [log.id] })}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationControls page={page} totalPages={totalPages} setPage={setPage} />
      </div>
    </div>
  );
};

export default LogsPanel;
