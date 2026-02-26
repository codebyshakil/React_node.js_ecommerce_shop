import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ITEMS_PER_PAGE = 10;

export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paged = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  return { paged, page, totalPages, setPage };
}

export function usePaginationWithSize<T>(items: T[], defaultSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultSize);
  const totalPages = Math.ceil(items.length / pageSize);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paged = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const changeSize = (size: number) => { setPageSize(size); setPage(1); };
  return { paged, page: safePage, totalPages, setPage, pageSize, changeSize };
}

export const PaginationControls = ({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4 py-3">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-3 h-3" /></Button>
      <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-3 h-3" /></Button>
    </div>
  );
};

export const FormField = ({ label, required, description, error, children }: { label: string; required?: boolean; description?: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-sm font-medium text-foreground mb-1.5 block">
      {label} {required && <span className="text-destructive">*</span>}
    </label>
    {description && <p className="text-xs text-muted-foreground mb-1.5">{description}</p>}
    {children}
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

export const ROLE_OPTIONS = ['admin', 'sales_manager', 'account_manager', 'support_assistant', 'marketing_manager', 'user'] as const;
export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  sales_manager: 'bg-purple-100 text-purple-700',
  account_manager: 'bg-indigo-100 text-indigo-700',
  support_assistant: 'bg-teal-100 text-teal-700',
  marketing_manager: 'bg-pink-100 text-pink-700',
  user: 'bg-blue-100 text-blue-700',
};
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  sales_manager: 'Sales Manager',
  account_manager: 'Account Manager',
  support_assistant: 'Support Assistant',
  marketing_manager: 'Marketing Manager',
  user: 'User',
};

// Role permission checks - updated with new tabs
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['dashboard', 'products', 'categories', 'orders', 'blog', 'testimonials', 'contacts', 'customers', 'employees', 'permissions', 'pages', 'settings', 'shipping', 'revenue', 'logs'],
  sales_manager: ['dashboard', 'products', 'categories', 'orders', 'revenue', 'customers'],
  account_manager: ['dashboard', 'orders', 'contacts', 'customers'],
  support_assistant: ['dashboard', 'orders', 'contacts', 'customers'],
  marketing_manager: ['dashboard', 'marketing', 'blog', 'media', 'coupons'],
  user: [],
};

export const hasPermission = (role: string, tab: string) => {
  return ROLE_PERMISSIONS[role]?.includes(tab) ?? false;
};
