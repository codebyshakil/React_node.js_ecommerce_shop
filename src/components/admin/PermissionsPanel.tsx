import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from './AdminShared';
import { Shield, Package, FolderTree, ShoppingCart, DollarSign, BookOpen, Star, MessageSquare, FileEdit, Users, Truck, Tag, ImageIcon, Mail, Layers, ScrollText, Settings, LayoutDashboard } from 'lucide-react';

const PERMISSION_GROUPS = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    permissions: [
      { key: 'dashboard_access', label: 'Access Dashboard Overview' },
    ],
  },
  {
    label: 'Product Management',
    icon: Package,
    color: 'text-emerald-600',
    permissions: [
      { key: 'product_view', label: 'View Products' },
      { key: 'product_add', label: 'Add Product' },
      { key: 'product_edit', label: 'Edit Product (includes Status Change)' },
      { key: 'product_delete', label: 'Delete Product' },
    ],
  },
  {
    label: 'Category Management',
    icon: FolderTree,
    color: 'text-amber-600',
    permissions: [
      { key: 'category_view', label: 'View Categories' },
      { key: 'category_add', label: 'Add Category' },
      { key: 'category_edit', label: 'Edit Category' },
      { key: 'category_delete', label: 'Delete Category' },
    ],
  },
  {
    label: 'Variant Management',
    icon: Layers,
    color: 'text-purple-600',
    permissions: [
      { key: 'variant_view', label: 'View Variants' },
      { key: 'variant_add', label: 'Add / Edit Variant' },
      { key: 'variant_delete', label: 'Delete Variant' },
    ],
  },
  {
    label: 'Order Management',
    icon: ShoppingCart,
    color: 'text-violet-600',
    permissions: [
      { key: 'order_view', label: 'View Orders' },
      { key: 'order_manage', label: 'Manage Orders (Status, Payment, Print)' },
      { key: 'order_delete', label: 'Delete Order' },
    ],
  },
  {
    label: 'Coupon Management',
    icon: Tag,
    color: 'text-lime-600',
    permissions: [
      { key: 'coupon_view', label: 'View Coupons' },
      { key: 'coupon_add', label: 'Add Coupon' },
      { key: 'coupon_edit', label: 'Edit Coupon' },
      { key: 'coupon_delete', label: 'Delete Coupon' },
    ],
  },
  {
    label: 'Revenue & Reports',
    icon: DollarSign,
    color: 'text-green-600',
    permissions: [
      { key: 'revenue_access', label: 'Access Sales Report' },
      { key: 'revenue_export', label: 'Export / Download Reports' },
    ],
  },
  {
    label: 'Shipping',
    icon: Truck,
    color: 'text-cyan-600',
    permissions: [
      { key: 'shipping_access', label: 'Access Shipping Settings' },
      { key: 'shipping_manage', label: 'Manage Shipping Zones & Rates' },
    ],
  },
  {
    label: 'Blog Management',
    icon: BookOpen,
    color: 'text-pink-600',
    permissions: [
      { key: 'blog_view', label: 'View Blog Posts' },
      { key: 'blog_add', label: 'Add / Edit Post' },
      { key: 'blog_delete', label: 'Delete Post' },
    ],
  },
  {
    label: 'Testimonials',
    icon: Star,
    color: 'text-yellow-600',
    permissions: [
      { key: 'testimonial_view', label: 'View Testimonials' },
      { key: 'testimonial_add', label: 'Add Testimonial' },
      { key: 'testimonial_edit', label: 'Edit Testimonial' },
      { key: 'testimonial_delete', label: 'Delete Testimonial' },
    ],
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    color: 'text-teal-600',
    permissions: [
      { key: 'message_access', label: 'Access Messages' },
      { key: 'message_status_change', label: 'Change Message Status' },
      { key: 'message_delete', label: 'Delete Messages' },
    ],
  },
  {
    label: 'Media Library',
    icon: ImageIcon,
    color: 'text-rose-600',
    permissions: [
      { key: 'media_access', label: 'Access Media Library' },
      { key: 'media_upload', label: 'Upload Media' },
      { key: 'media_delete', label: 'Delete Media' },
    ],
  },
  {
    label: 'Page Management',
    icon: FileEdit,
    color: 'text-indigo-600',
    permissions: [
      { key: 'page_access', label: 'Access Pages' },
      { key: 'page_add', label: 'Add Page' },
      { key: 'page_edit', label: 'Edit Page' },
      { key: 'page_delete', label: 'Delete Page' },
    ],
  },
  {
    label: 'Customer Management',
    icon: Users,
    color: 'text-orange-600',
    permissions: [
      { key: 'customer_view', label: 'View Customers' },
      { key: 'customer_edit', label: 'Edit Customer Profile (includes Block/Unblock)' },
      { key: 'customer_delete', label: 'Delete Customer' },
    ],
  },
  {
    label: 'Marketing & Email',
    icon: Mail,
    color: 'text-pink-700',
    permissions: [
      { key: 'marketing_access', label: 'Access Marketing' },
      { key: 'marketing_campaign_create', label: 'Create Campaigns' },
      { key: 'marketing_campaign_send', label: 'Send Campaigns' },
      { key: 'marketing_template_manage', label: 'Manage Templates' },
    ],
  },
  {
    label: 'Logs',
    icon: ScrollText,
    color: 'text-slate-600',
    permissions: [
      { key: 'logs_access', label: 'Access Activity Logs' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    color: 'text-gray-600',
    permissions: [
      { key: 'settings_access', label: 'Access Settings' },
      { key: 'settings_general', label: 'General Settings' },
      { key: 'settings_payment', label: 'Payment Settings' },
      { key: 'settings_email', label: 'Email Settings' },
    ],
  },
];

const EMPLOYEE_ROLES = ['sales_manager', 'account_manager', 'support_assistant', 'marketing_manager'];

const ROLE_BADGES: Record<string, string> = {
  sales_manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  account_manager: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  support_assistant: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  marketing_manager: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const PermissionsPanel = ({ logActivity }: { logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('sales_manager');

  const { data: permissions = [] } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('role_permissions').select('*');
      return data ?? [];
    },
  });

  const getPermission = (role: string, permission: string) => {
    const p = permissions.find((p: any) => p.role === role && p.permission === permission);
    return p?.enabled ?? false;
  };

  const togglePermission = async (role: string, permission: string, currentValue: boolean) => {
    const existing = permissions.find((p: any) => p.role === role && p.permission === permission);
    if (existing) {
      await supabase.from('role_permissions').update({ enabled: !currentValue } as any).eq('id', existing.id);
    } else {
      await supabase.from('role_permissions').insert({ role, permission, enabled: !currentValue } as any);
    }
    queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
    toast({ title: `Permission ${!currentValue ? 'enabled' : 'disabled'}` });
    logActivity?.('permission_change', 'permission', `${role}:${permission}`, `${!currentValue ? 'Enabled' : 'Disabled'} permission "${permission}" for role "${ROLE_LABELS[role] || role}"`);
  };

  const toggleGroupAll = async (role: string, groupPermissions: { key: string }[]) => {
    const allEnabled = groupPermissions.every(p => getPermission(role, p.key));
    for (const perm of groupPermissions) {
      const existing = permissions.find((p: any) => p.role === role && p.permission === perm.key);
      if (existing) {
        await supabase.from('role_permissions').update({ enabled: !allEnabled } as any).eq('id', existing.id);
      } else {
        await supabase.from('role_permissions').insert({ role, permission: perm.key, enabled: !allEnabled } as any);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
    toast({ title: allEnabled ? 'Group permissions disabled' : 'Group permissions enabled' });
    logActivity?.('permission_group_change', 'permission', role, `${allEnabled ? 'Disabled' : 'Enabled'} group permissions for ${ROLE_LABELS[role] || role}`);
  };

  const enabledCount = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.filter(p => getPermission(selectedRole, p.key)).length, 0);
  const totalCount = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Permission Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Control what each role can access and manage</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Role:</span>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Role info bar */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge className={`${ROLE_BADGES[selectedRole]} border-0 text-xs px-2.5 py-1`}>
            {ROLE_LABELS[selectedRole] || selectedRole}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {enabledCount} of {totalCount} permissions enabled
          </span>
        </div>
        <div className="h-2 w-full sm:w-48 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (enabledCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PERMISSION_GROUPS.map((group) => {
          const Icon = group.icon;
          const allEnabled = group.permissions.every(p => getPermission(selectedRole, p.key));
          const someEnabled = group.permissions.some(p => getPermission(selectedRole, p.key));
          const groupEnabledCount = group.permissions.filter(p => getPermission(selectedRole, p.key)).length;

          return (
            <div key={group.label} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4.5 h-4.5 ${group.color}`} />
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    {groupEnabledCount}/{group.permissions.length}
                  </Badge>
                </div>
                <button
                  onClick={() => toggleGroupAll(selectedRole, group.permissions)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                    allEnabled
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : someEnabled
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {allEnabled ? 'Disable All' : 'Enable All'}
                </button>
              </div>
              <div className="divide-y divide-border">
                {group.permissions.map((perm) => {
                  const enabled = getPermission(selectedRole, perm.key);
                  return (
                    <div key={perm.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                      <span className="text-sm text-foreground">{perm.label}</span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => togglePermission(selectedRole, perm.key, enabled)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionsPanel;
