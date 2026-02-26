import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, Search, RotateCcw, Users, ShieldCheck, ShieldOff, Archive, Lock, ShoppingCart, Headphones } from 'lucide-react';
import { FormField, ROLE_COLORS, ROLE_LABELS } from './AdminShared';

const EMPLOYEE_ROLES = ['sales_manager', 'account_manager', 'support_assistant', 'marketing_manager'] as const;
const EMPLOYEE_ROLE_LABELS: Record<string, string> = {
  sales_manager: 'Sales Manager',
  account_manager: 'Account Manager',
  support_assistant: 'Support Assistant',
  marketing_manager: 'Marketing Manager',
};

const ROLE_CARD_ICONS: Record<string, any> = {
  sales_manager: ShoppingCart,
  account_manager: Users,
  support_assistant: Headphones,
  marketing_manager: Users,
};
const ROLE_CARD_STYLES: Record<string, { gradient: string; iconColor: string; textColor: string }> = {
  sales_manager: { gradient: 'from-purple-500/10 to-purple-600/5 border-purple-200 dark:border-purple-800', iconColor: 'text-purple-600', textColor: 'text-purple-700 dark:text-purple-400' },
  account_manager: { gradient: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200 dark:border-indigo-800', iconColor: 'text-indigo-600', textColor: 'text-indigo-700 dark:text-indigo-400' },
  support_assistant: { gradient: 'from-teal-500/10 to-teal-600/5 border-teal-200 dark:border-teal-800', iconColor: 'text-teal-600', textColor: 'text-teal-700 dark:text-teal-400' },
  marketing_manager: { gradient: 'from-pink-500/10 to-pink-600/5 border-pink-200 dark:border-pink-800', iconColor: 'text-pink-600', textColor: 'text-pink-700 dark:text-pink-400' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const EmployeesPanel = ({ logActivity }: { logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '', full_name: '', phone: '', role: 'sales_manager' });
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<any>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ employee: any; newRole: string } | null>(null);
  const [viewEmployee, setViewEmployee] = useState<any>(null);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCardRole, setFilterCardRole] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pwEmployee, setPwEmployee] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const { data: profiles = [] } = useQuery({ queryKey: ['admin-profiles'], queryFn: async () => { const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }); return data ?? []; } });
  const { data: roles = [] } = useQuery({ queryKey: ['admin-user-roles'], queryFn: async () => { const { data } = await supabase.from('user_roles').select('*'); return data ?? []; } });

  const allEmployees = useMemo(() => {
    return profiles.filter((p: any) => {
      const userRoles = roles.filter((r: any) => r.user_id === p.user_id);
      return userRoles.some((r: any) => EMPLOYEE_ROLES.includes(r.role));
    }).map((p: any) => {
      const userRole = roles.find((r: any) => r.user_id === p.user_id && EMPLOYEE_ROLES.includes(r.role));
      return { ...p, role: userRole?.role || 'sales_manager', role_id: userRole?.id };
    });
  }, [profiles, roles]);

  // Fetch emails for all employees
  const employeeUserIds = useMemo(() => allEmployees.map((e: any) => e.user_id), [allEmployees]);
  const { data: emailMap = {} } = useQuery({
    queryKey: ['employee-emails', employeeUserIds],
    queryFn: async () => {
      if (employeeUserIds.length === 0) return {};
      const { data, error } = await supabase.functions.invoke('manage-employee', {
        body: { action: 'get_emails', user_ids: employeeUserIds }
      });
      if (error || data?.error) return {};
      return data?.emails || {};
    },
    enabled: employeeUserIds.length > 0,
  });

  // Split active vs trashed
  const activeEmployees = useMemo(() => allEmployees.filter((e: any) => !e.is_deleted), [allEmployees]);
  const trashedEmployees = useMemo(() => allEmployees.filter((e: any) => e.is_deleted), [allEmployees]);

  // Role counts for cards (active only)
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    EMPLOYEE_ROLES.forEach(r => { counts[r] = 0; });
    activeEmployees.forEach((e: any) => { if (counts[e.role] !== undefined) counts[e.role]++; });
    return counts;
  }, [activeEmployees]);

  // Filtered list
  const filteredEmployees = useMemo(() => {
    const list = showTrash ? trashedEmployees : activeEmployees;
    return list.filter((e: any) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || (e.full_name || '').toLowerCase().includes(q) || (e.phone || '').includes(q);
      const matchesRole = filterCardRole ? e.role === filterCardRole : (filterRole === 'all' || e.role === filterRole);
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? !e.is_blocked : e.is_blocked);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [showTrash, trashedEmployees, activeEmployees, search, filterRole, filterStatus, filterCardRole]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const pagedEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on filter change
  const resetPage = () => setPage(1);

  const [addLoading, setAddLoading] = useState(false);

  const addEmployee = async () => {
    if (!addForm.email || !addForm.password || !addForm.full_name) {
      toast({ title: 'All fields required', variant: 'destructive' }); return;
    }
    setAddLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: { email: addForm.email, password: addForm.password, full_name: addForm.full_name, phone: addForm.phone, role: addForm.role }
      });
      if (error || data?.error) {
        toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
        setAddLoading(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setAddOpen(false);
      setAddForm({ email: '', password: '', full_name: '', phone: '', role: 'sales_manager' });
      toast({ title: 'Employee added successfully' });
      logActivity?.('employee_create', 'employee', '', `Added employee: ${addForm.full_name} as ${addForm.role}`);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    }
    setAddLoading(false);
  };

  const handleRoleChangeRequest = (employee: any, newRole: string) => {
    if (newRole === employee.role) return;
    setConfirmRoleChange({ employee, newRole });
  };

  const confirmRoleChangeAction = async () => {
    if (!confirmRoleChange) return;
    const { employee, newRole } = confirmRoleChange;
    if (employee.role_id) await supabase.from('user_roles').update({ role: newRole } as any).eq('id', employee.role_id);
    else await supabase.from('user_roles').insert({ user_id: employee.user_id, role: newRole } as any);
    queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
    toast({ title: `Role updated to ${EMPLOYEE_ROLE_LABELS[newRole] || newRole}` });
    logActivity?.('employee_role_change', 'employee', employee.user_id, `Role changed to ${EMPLOYEE_ROLE_LABELS[newRole] || newRole} for ${employee.full_name}`);
    setConfirmRoleChange(null);
  };

  const toggleStatus = async (employee: any) => {
    const newStatus = !employee.is_blocked;
    await supabase.from('profiles').update({ is_blocked: newStatus }).eq('user_id', employee.user_id);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: newStatus ? 'Employee deactivated' : 'Employee activated' });
    logActivity?.('employee_status', 'employee', employee.user_id, `Employee ${newStatus ? 'deactivated' : 'activated'}: ${employee.full_name}`);
  };

  // Soft delete (move to trash)
  const moveToTrash = async (employee: any) => {
    await supabase.from('profiles').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('user_id', employee.user_id);
    // Also block them so they can't login
    await supabase.from('profiles').update({ is_blocked: true }).eq('user_id', employee.user_id);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: 'Employee moved to trash' });
    logActivity?.('employee_trash', 'employee', employee.user_id, `Employee moved to trash: ${employee.full_name}`);
    setConfirmDelete(null);
  };

  // Restore from trash
  const restoreEmployee = async (employee: any) => {
    await supabase.from('profiles').update({ is_deleted: false, deleted_at: null, is_blocked: false }).eq('user_id', employee.user_id);
    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: 'Employee restored' });
  };

  // Permanent delete
  const permanentDeleteEmployee = async (employee: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { user_id: employee.user_id } });
      if (error || data?.error) {
        toast({ title: 'Delete failed', description: data?.error || data?.details?.join(', ') || error?.message, variant: 'destructive' });
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
        queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
        toast({ title: 'Employee permanently deleted' });
        logActivity?.('employee_delete', 'employee', employee.user_id, `Employee permanently deleted: ${employee.full_name}`);
      }
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
    setConfirmPermanentDelete(null);
  };

  // Save profile edit
  const saveEdit = async () => {
    if (!editForm || !editEmployee) return;
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name,
      phone: editForm.phone,
      address: editForm.address,
      city: editForm.city,
      zip_code: editForm.zip_code,
      country: editForm.country,
    }).eq('user_id', editEmployee.user_id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    // Update email if changed
    const currentEmail = emailMap[editEmployee.user_id] || '';
    if (editForm.email && editForm.email !== currentEmail) {
      const { data, error: emailError } = await supabase.functions.invoke('manage-employee', {
        body: { action: 'update_email', user_id: editEmployee.user_id, email: editForm.email }
      });
      if (emailError || data?.error) {
        toast({ title: 'Email update failed', description: data?.error || emailError?.message, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['employee-emails'] });
    }

    queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
    toast({ title: 'Profile updated' });
    logActivity?.('employee_edit', 'employee', editEmployee.user_id, `Updated profile for: ${editForm.full_name}`);
    setEditEmployee(null);
    setEditForm(null);
  };

  const openView = (emp: any) => {
    setViewEmployee(emp);
  };

  const openEdit = (emp: any) => {
    setEditForm({
      full_name: emp.full_name || '',
      email: emailMap[emp.user_id] || '',
      phone: emp.phone || '',
      address: emp.address || '',
      city: emp.city || '',
      zip_code: emp.zip_code || '',
      country: emp.country || '',
    });
    setEditEmployee(emp);
    setViewEmployee(null);
  };

  const openPasswordChange = (emp: any) => {
    setPwEmployee(emp);
    setNewPassword('');
    setConfirmPw('');
    setViewEmployee(null);
  };

  const changeEmployeePassword = async () => {
    if (!pwEmployee) return;
    if (newPassword.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    if (newPassword !== confirmPw) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    setPwLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { action: 'reset_password', user_id: pwEmployee.user_id, new_password: newPassword }
      });
      if (error || data?.error) {
        toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
      } else {
        toast({ title: 'Password changed successfully' });
        setPwEmployee(null);
      }
    } catch {
      toast({ title: 'Failed to change password', variant: 'destructive' });
    }
    setPwLoading(false);
  };

  const getDaysUntilAutoDelete = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const autoDelete = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const days = Math.ceil((autoDelete.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div>
      {/* Role Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {EMPLOYEE_ROLES.map((role) => {
          const style = ROLE_CARD_STYLES[role];
          const isActive = filterCardRole === role;
          return (
            <button
              key={role}
              onClick={() => { setFilterCardRole(isActive ? null : role); setFilterRole('all'); resetPage(); setShowTrash(false); }}
              className={`relative p-4 rounded-xl border bg-gradient-to-br ${style.gradient} text-left transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary shadow-md' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                {(() => { const Icon = ROLE_CARD_ICONS[role]; return <Icon className={`w-6 h-6 ${style.iconColor}`} />; })()}
                <span className={`text-2xl font-bold ${style.textColor}`}>{roleCounts[role]}</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{EMPLOYEE_ROLE_LABELS[role]}</p>
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {showTrash ? `Trash (${trashedEmployees.length})` : `Employees (${activeEmployees.length})`}
          </h1>
          <Button variant={showTrash ? 'default' : 'outline'} size="sm" onClick={() => { setShowTrash(!showTrash); resetPage(); setFilterCardRole(null); }}>
            <Archive className="w-4 h-4 mr-1" /> Trash {trashedEmployees.length > 0 && `(${trashedEmployees.length})`}
          </Button>
        </div>
        {!showTrash && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Employee</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <FormField label="Full Name" required><Input placeholder="Enter full name" value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} /></FormField>
                <FormField label="Email" required><Input type="email" placeholder="employee@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} /></FormField>
                <FormField label="Password" required><Input type="password" placeholder="Minimum 6 characters" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} /></FormField>
                <FormField label="Phone"><Input placeholder="Phone number" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} /></FormField>
                <FormField label="Role" required>
                  <Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{EMPLOYEE_ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <Button onClick={addEmployee} disabled={addLoading} className="w-full">{addLoading ? 'Creating...' : 'Create Employee'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} className="pl-10" />
        </div>
        <Select value={filterCardRole || filterRole} onValueChange={(v) => { setFilterRole(v); setFilterCardRole(null); resetPage(); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{EMPLOYEE_ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        {!showTrash && (
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); resetPage(); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Dialogs */}
      {/* Role change warning */}
      <AlertDialog open={!!confirmRoleChange} onOpenChange={(o) => { if (!o) setConfirmRoleChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Change Employee Role?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to change <strong>{confirmRoleChange?.employee?.full_name}</strong>'s role from{' '}
              <strong>{EMPLOYEE_ROLE_LABELS[confirmRoleChange?.employee?.role || ''] || confirmRoleChange?.employee?.role}</strong> to{' '}
              <strong>{EMPLOYEE_ROLE_LABELS[confirmRoleChange?.newRole || ''] || confirmRoleChange?.newRole}</strong>.
              This will change their access permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChangeAction}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete to trash */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.full_name}</strong> will be moved to trash and deactivated. They will not be able to login. You can restore them within 30 days, after which they will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && moveToTrash(confirmDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Move to Trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete */}
      <AlertDialog open={!!confirmPermanentDelete} onOpenChange={(o) => { if (!o) setConfirmPermanentDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🗑️ Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmPermanentDelete?.full_name}</strong> and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPermanentDelete && permanentDeleteEmployee(confirmPermanentDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View employee dialog */}
      <Dialog open={!!viewEmployee} onOpenChange={(o) => { if (!o) setViewEmployee(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Employee Profile</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openPasswordChange(viewEmployee)}>
                  <Lock className="w-4 h-4 mr-1" /> Password
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(viewEmployee)}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewEmployee && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {(viewEmployee.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{viewEmployee.full_name || '—'}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[viewEmployee.role] || 'bg-muted'}`}>
                    {ROLE_LABELS[viewEmployee.role] || viewEmployee.role}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Email</span><span className="text-foreground">{emailMap[viewEmployee.user_id] || '—'}</span></div>
                <div><span className="text-muted-foreground block text-xs">Phone</span><span className="text-foreground">{viewEmployee.phone || '—'}</span></div>
                <div><span className="text-muted-foreground block text-xs">Status</span><Badge variant={viewEmployee.is_blocked ? 'destructive' : 'default'}>{viewEmployee.is_blocked ? 'Inactive' : 'Active'}</Badge></div>
                <div><span className="text-muted-foreground block text-xs">Country</span><span className="text-foreground">{viewEmployee.country || '—'}</span></div>
                <div><span className="text-muted-foreground block text-xs">City</span><span className="text-foreground">{viewEmployee.city || '—'}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground block text-xs">Address</span><span className="text-foreground">{viewEmployee.address || '—'}</span></div>
                <div><span className="text-muted-foreground block text-xs">Zip Code</span><span className="text-foreground">{viewEmployee.zip_code || '—'}</span></div>
                <div><span className="text-muted-foreground block text-xs">Joined</span><span className="text-foreground">{new Date(viewEmployee.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit employee dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(o) => { if (!o) { setEditEmployee(null); setEditForm(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Employee Profile</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-4 mt-2">
              <FormField label="Full Name" required><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></FormField>
              <FormField label="Email"><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></FormField>
              <FormField label="Phone"><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></FormField>
              <FormField label="Address"><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></FormField>
              <FormField label="City"><Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></FormField>
              <FormField label="Zip Code"><Input value={editForm.zip_code} onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })} /></FormField>
              <FormField label="Country"><Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></FormField>
              <Button onClick={saveEdit} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={!!pwEmployee} onOpenChange={(o) => { if (!o) setPwEmployee(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Set a new password for <strong>{pwEmployee?.full_name}</strong></p>
          <div className="space-y-4 mt-2">
            <FormField label="New Password" required>
              <Input type="password" placeholder="Minimum 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </FormField>
            <FormField label="Confirm Password" required>
              <Input type="password" placeholder="Re-enter password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
            </FormField>
            <Button onClick={changeEmployeePassword} disabled={pwLoading} className="w-full">
              {pwLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              {!showTrash && <TableHead>Status</TableHead>}
              {!showTrash && <TableHead>Change Role</TableHead>}
              {showTrash && <TableHead>Auto Delete</TableHead>}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedEmployees.length === 0 ? (
              <TableRow><TableCell colSpan={showTrash ? 5 : 6} className="text-center py-12 text-muted-foreground">
                {showTrash ? 'Trash is empty.' : 'No employees found.'}
              </TableCell></TableRow>
            ) : pagedEmployees.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name || '—'}</TableCell>
                <TableCell>{e.phone || '—'}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[e.role] || 'bg-muted'}`}>
                    {ROLE_LABELS[e.role] || e.role}
                  </span>
                </TableCell>
                {!showTrash && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={!e.is_blocked} onCheckedChange={() => toggleStatus(e)} />
                      <span className={`text-xs font-medium ${e.is_blocked ? 'text-destructive' : 'text-emerald-600'}`}>
                        {e.is_blocked ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </TableCell>
                )}
                {!showTrash && (
                  <TableCell>
                    <Select value={e.role} onValueChange={(v) => handleRoleChangeRequest(e, v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{EMPLOYEE_ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                )}
                {showTrash && (
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {e.deleted_at ? `${getDaysUntilAutoDelete(e.deleted_at)} days left` : '—'}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-1">
                    {showTrash ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => restoreEmployee(e)} title="Restore">
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmPermanentDelete(e)} title="Delete permanently">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openView(e)} title="View profile">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openPasswordChange(e)} title="Change password">
                          <Lock className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(e)} title="Edit profile">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(e)} title="Move to trash">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination with page size selector */}
        {filteredEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Show</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <span>per page</span>
              <span className="ml-2">({filteredEmployees.length} total)</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesPanel;
