import { useState, useMemo, useEffect } from 'react';
import { usePages, useCreatePage, useUpdatePage, useSoftDeletePage, useRestorePage, useDeletePagePermanently, Page } from '@/hooks/usePages';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { FormField } from './AdminShared';
import { Plus, Pencil, Trash2, RotateCcw, Archive, Eye, EyeOff, Home, Lock, ShoppingBag, FileText, Package, MapPin } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format, differenceInDays } from 'date-fns';
import PageSectionBuilder from './PageSectionBuilder';
import HomepageSectionsPanel from './HomepageSectionsPanel';

// System pages that always exist and cannot be deleted
const SYSTEM_PAGES = [
  { slug: 'products', title: 'Products', page_type: 'system', meta_description: 'Browse our premium quality products.' },
  { slug: 'blog', title: 'Blog', page_type: 'system', meta_description: 'Insights, recipes, and industry knowledge.' },
  { slug: 'single-product', title: 'Single Product', page_type: 'system', meta_description: 'Product detail page layout.' },
  { slug: 'single-post', title: 'Single Post', page_type: 'system', meta_description: 'Blog post detail page layout.' },
  { slug: 'order-tracking', title: 'Order Tracking', page_type: 'system', meta_description: 'Track your order delivery status in real-time.' },
];

// Hook to get/set homepage slug from site_settings
const useHomepageSlug = () => {
  return useQuery({
    queryKey: ['site-settings-homepage-slug'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_slug')
        .maybeSingle();
      if (error) throw error;
      return (data?.value as string) || 'home';
    },
    staleTime: 30_000,
  });
};

const useSetHomepageSlug = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      const { data } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'homepage_slug')
        .maybeSingle();
      if (data) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: slug as any })
          .eq('key', 'homepage_slug');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_settings')
          .insert({ key: 'homepage_slug', value: slug as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-settings-homepage-slug'] });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
};

// Auto-create system pages if they don't exist
const useEnsureSystemPages = () => {
  const { data: allPages = [], isLoading } = usePages(true);
  const qc = useQueryClient();

  useEffect(() => {
    if (isLoading || allPages.length === 0 && isLoading) return;
    
    const ensurePages = async () => {
      for (const sp of SYSTEM_PAGES) {
        const exists = allPages.some(p => p.slug === sp.slug);
        if (!exists) {
          await supabase.from('pages').insert({
            slug: sp.slug,
            title: sp.title,
            page_type: sp.page_type,
            meta_description: sp.meta_description,
            is_published: true,
          } as any);
        } else {
          // Ensure existing page has system page_type
          const existing = allPages.find(p => p.slug === sp.slug);
          if (existing && existing.page_type !== 'system') {
            await supabase.from('pages').update({ page_type: 'system' } as any).eq('id', existing.id);
          }
        }
      }
      qc.invalidateQueries({ queryKey: ['pages'] });
    };

    const systemSlugs = SYSTEM_PAGES.map(s => s.slug);
    const needsCreation = systemSlugs.some(slug => !allPages.some(p => p.slug === slug));
    const needsUpdate = allPages.some(p => systemSlugs.includes(p.slug) && p.page_type !== 'system');
    
    if (needsCreation || needsUpdate) {
      ensurePages();
    }
  }, [allPages, isLoading, qc]);
};

const isSystemPage = (page: Page) => page.page_type === 'system' || SYSTEM_PAGES.some(sp => sp.slug === page.slug);

const PagesPanel = ({ can = () => true, logActivity }: { can?: (p: string) => boolean; logActivity?: (a: string, t: string, id: string, d: string) => void }) => {
  useEnsureSystemPages();
  const { data: allPages = [], isLoading } = usePages(true);
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const softDelete = useSoftDeletePage();
  const restorePage = useRestorePage();
  const permDelete = useDeletePagePermanently();
  const { data: homepageSlug = 'home' } = useHomepageSlug();
  const setHomepageSlug = useSetHomepageSlug();

  const [showTrash, setShowTrash] = useState(false);
  const [editPage, setEditPage] = useState<Page | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ page: Page; permanent: boolean } | null>(null);
  const [newPage, setNewPage] = useState({ title: '', slug: '', page_type: 'custom' });

  const activePages = useMemo(() => allPages.filter(p => !p.is_deleted), [allPages]);
  const trashedPages = useMemo(() => allPages.filter(p => p.is_deleted), [allPages]);
  const pages = showTrash ? trashedPages : activePages;

  // Sort: homepage first, then system pages, then by created_at
  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      if (a.slug === homepageSlug) return -1;
      if (b.slug === homepageSlug) return 1;
      if (isSystemPage(a) && !isSystemPage(b)) return -1;
      if (!isSystemPage(a) && isSystemPage(b)) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [pages, homepageSlug]);

  const handleCreate = async () => {
    if (!can('page_add')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to add pages.', variant: 'destructive' });
      return;
    }
    if (!newPage.title.trim() || !newPage.slug.trim()) {
      toast({ title: 'Title and slug are required', variant: 'destructive' });
      return;
    }
    try {
      await createPage.mutateAsync({ title: newPage.title, slug: newPage.slug, page_type: newPage.page_type });
      toast({ title: 'Page created!' });
      logActivity?.('page_create', 'page', '', `Created page: ${newPage.title}`);
      setNewPage({ title: '', slug: '', page_type: 'custom' });
      setCreateOpen(false);
    } catch (e: any) {
      toast({ title: 'Error creating page', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!can('page_delete')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to delete pages.', variant: 'destructive' });
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.page.slug === homepageSlug) {
      toast({ title: 'Cannot delete the homepage', description: 'Please set another page as homepage first.', variant: 'destructive' });
      setDeleteTarget(null);
      return;
    }
    if (isSystemPage(deleteTarget.page)) {
      toast({ title: 'Cannot delete system page', description: 'This is a default page and cannot be deleted.', variant: 'destructive' });
      setDeleteTarget(null);
      return;
    }
    try {
      if (deleteTarget.permanent) {
        await permDelete.mutateAsync(deleteTarget.page.id);
        toast({ title: 'Page permanently deleted' });
        logActivity?.('page_delete', 'page', deleteTarget.page.id, `Permanently deleted page: ${deleteTarget.page.title}`);
      } else {
        await softDelete.mutateAsync(deleteTarget.page.id);
        toast({ title: 'Page moved to trash' });
        logActivity?.('page_trash', 'page', deleteTarget.page.id, `Moved page to trash: ${deleteTarget.page.title}`);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const handleRestore = async (id: string) => {
    try {
      await restorePage.mutateAsync(id);
      toast({ title: 'Page restored!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleTogglePublish = async (page: Page) => {
    if (!can('page_edit')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to edit pages.', variant: 'destructive' });
      return;
    }
    await updatePage.mutateAsync({ id: page.id, is_published: !page.is_published });
    toast({ title: page.is_published ? 'Page unpublished' : 'Page published' });
  };

  const handleSetHomepage = async (page: Page) => {
    if (!can('page_edit')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to edit pages.', variant: 'destructive' });
      return;
    }
    try {
      await setHomepageSlug.mutateAsync(page.slug);
      toast({ title: `"${page.title}" is now the Homepage!` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="text-muted-foreground">Loading pages...</div>;

  const isHomepage = (page: Page) => page.slug === homepageSlug;

  const getSystemIcon = (slug: string) => {
    if (slug === 'products') return <ShoppingBag className="w-3 h-3" />;
    if (slug === 'blog') return <FileText className="w-3 h-3" />;
    if (slug === 'single-product') return <Package className="w-3 h-3" />;
    if (slug === 'single-post') return <FileText className="w-3 h-3" />;
    if (slug === 'order-tracking') return <MapPin className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Page Management</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={showTrash ? 'default' : 'outline'} onClick={() => { setShowTrash(!showTrash); setEditPage(null); }}>
            <Archive className="w-4 h-4 mr-1" /> Trash ({trashedPages.length})
          </Button>
          {!showTrash && can('page_add') && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Page
            </Button>
          )}
        </div>
      </div>

      {/* Page List */}
      {!editPage && (
        <div className="space-y-2">
          {sortedPages.length === 0 && <p className="text-muted-foreground text-sm">{showTrash ? 'Trash is empty.' : 'No pages yet.'}</p>}
          {sortedPages.map(page => (
            <div key={page.id} className={`bg-card border rounded-lg p-4 flex items-center justify-between gap-4 ${isHomepage(page) ? 'border-primary/40 ring-1 ring-primary/20' : isSystemPage(page) ? 'border-accent/40' : 'border-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">{page.title}</h3>
                  {isHomepage(page) && (
                    <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                      <Home className="w-3 h-3" /> Homepage
                    </Badge>
                  )}
                  {isSystemPage(page) && !isHomepage(page) && (
                    <Badge variant="outline" className="text-xs gap-1 border-accent text-accent-foreground">
                      {getSystemIcon(page.slug)} System
                    </Badge>
                  )}
                  <Badge variant={page.is_published ? 'default' : 'secondary'} className="text-xs">
                    {page.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  {!isSystemPage(page) && <Badge variant="outline" className="text-xs">{page.page_type}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">/{page.slug} · Updated {format(new Date(page.updated_at), 'MMM d, yyyy')}</p>
                {page.is_deleted && page.deleted_at && (
                  <p className="text-xs text-destructive mt-1">
                    Auto-delete in {Math.max(0, 30 - differenceInDays(new Date(), new Date(page.deleted_at)))} days
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {showTrash ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleRestore(page.id)}><RotateCcw className="w-4 h-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ page, permanent: true })}><Trash2 className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    {!isHomepage(page) && !isSystemPage(page) && (
                      <Button size="sm" variant="ghost" title="Set as Homepage" onClick={() => handleSetHomepage(page)}>
                        <Home className="w-4 h-4" />
                      </Button>
                    )}
                    {!isSystemPage(page) && (
                      <Button size="sm" variant="ghost" onClick={() => handleTogglePublish(page)}>
                        {page.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    )}
                    {can('page_edit') && <Button size="sm" variant="outline" onClick={() => setEditPage(page)}><Pencil className="w-4 h-4" /></Button>}
                    {!isHomepage(page) && !isSystemPage(page) && can('page_delete') && (
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget({ page, permanent: false })}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Page */}
      {editPage && !showTrash && (
        <PageEditor
          page={editPage}
          onBack={() => setEditPage(null)}
          isHomepage={isHomepage(editPage)}
          isSystem={isSystemPage(editPage)}
          can={can}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Page</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormField label="Page Title">
              <Input value={newPage.title} onChange={e => {
                const title = e.target.value;
                setNewPage({ ...newPage, title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') });
              }} placeholder="Page Title" />
            </FormField>
            <FormField label="Slug (URL path)">
              <Input value={newPage.slug} onChange={e => setNewPage({ ...newPage, slug: e.target.value })} placeholder="page-slug" />
            </FormField>
            <Button onClick={handleCreate} disabled={createPage.isPending} className="w-full">Create Page</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Warning */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.permanent ? 'Permanently Delete Page?' : 'Move to Trash?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.permanent
                ? `"${deleteTarget.page.title}" will be permanently deleted. This action cannot be undone.`
                : `"${deleteTarget?.page.title}" will be moved to trash. It will be auto-deleted after 30 days. You can restore it anytime before that.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTarget?.permanent ? 'Delete Permanently' : 'Move to Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Page Editor ── */
const PageEditor = ({ page, onBack, isHomepage, isSystem, can = () => true }: { page: Page; onBack: () => void; isHomepage: boolean; isSystem: boolean; can?: (p: string) => boolean }) => {
  const updatePage = useUpdatePage();
  const qc = useQueryClient();
  const [title, setTitle] = useState(page.title);
  const [metaDesc, setMetaDesc] = useState(page.meta_description || '');
  const [slug, setSlug] = useState(page.slug);

  // Hero visibility toggle
  const heroKey = `hero_visible_${page.slug}`;
  const { data: heroVisible = true } = useQuery({
    queryKey: ['hero-visible', page.slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', heroKey).maybeSingle();
      if (error) throw error;
      if (!data) return true;
      return data.value === true || data.value === 'true';
    },
  });

  const toggleHero = async () => {
    const newVal = !heroVisible;
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', heroKey).maybeSingle();
    if (existing) {
      await supabase.from('site_settings').update({ value: newVal as any }).eq('key', heroKey);
    } else {
      await supabase.from('site_settings').insert({ key: heroKey, value: newVal as any });
    }
    qc.invalidateQueries({ queryKey: ['hero-visible', page.slug] });
    toast({ title: newVal ? 'Hero section visible' : 'Hero section hidden' });
  };

  const save = async () => {
    if (!can('page_edit')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to edit pages.', variant: 'destructive' });
      return;
    }
    try {
      const updates: any = { id: page.id, title, meta_description: metaDesc };
      if (!isSystem) updates.slug = slug;
      await updatePage.mutateAsync(updates);
      toast({ title: 'Page saved!' });
    } catch (e: any) {
      toast({ title: 'Error saving', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={onBack}>← Back</Button>
        <h2 className="text-xl font-semibold text-foreground">Editing: {page.title}</h2>
        {isHomepage && (
          <Badge className="bg-primary text-primary-foreground text-xs gap-1">
            <Home className="w-3 h-3" /> Homepage
          </Badge>
        )}
        {isSystem && !isHomepage && (
          <Badge variant="outline" className="text-xs gap-1 border-accent text-accent-foreground">
            <Lock className="w-3 h-3" /> System Page
          </Badge>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <FormField label="Page Title">
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </FormField>
        {!isHomepage && !isSystem && (
          <FormField label="Slug (URL)">
            <Input value={slug} onChange={e => setSlug(e.target.value)} />
          </FormField>
        )}
        {isSystem && (
          <FormField label="Slug (URL)">
            <Input value={slug} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground mt-1">System page slugs cannot be changed.</p>
          </FormField>
        )}
        <FormField label="Meta Description" description="SEO meta description for the page">
          <Input value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="Brief description for search engines..." />
        </FormField>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Hero Title Section</p>
            <p className="text-xs text-muted-foreground">Show or hide the page hero banner with title</p>
          </div>
          <Switch checked={heroVisible} onCheckedChange={toggleHero} />
        </div>
        <Button onClick={save} disabled={updatePage.isPending}>Save Page Info</Button>
      </div>

      {/* For homepage page_type = 'homepage', show HomepageSectionsPanel */}
      {isHomepage && page.page_type === 'homepage' ? (
        <div className="bg-card rounded-xl border border-border p-6">
          <HomepageSectionsPanel />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-6">
          <PageSectionBuilder pageId={page.id} pageTitle={page.title} isSystemPage={isSystem} systemPageSlug={isSystem ? page.slug : undefined} />
        </div>
      )}
    </div>
  );
};

export default PagesPanel;