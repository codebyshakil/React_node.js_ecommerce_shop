import { useState, useMemo, useRef, useEffect } from 'react';
import { usePageSections, useCreatePageSection, useUpdatePageSection, useDeletePageSection, useReorderPageSections, PageSection } from '@/hooks/usePageSections';
import { useProducts, useCategories, useTestimonials, useBlogPosts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from './AdminShared';
import { toast } from '@/hooks/use-toast';
import { GripVertical, Pencil, ChevronUp, ChevronDown, Plus, Trash2, Copy, ArrowLeft, Award, Truck, Shield, Headphones, Star, Heart, Zap, Clock, Globe, Package, CheckCircle, ThumbsUp, Flame, Tag, Gift, ShoppingCart, Sparkles, TrendingUp, Lock, type LucideIcon } from 'lucide-react';

const TITLE_ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: '', label: 'No Icon', Icon: Star },
  { value: 'Award', label: 'Award', Icon: Award },
  { value: 'Truck', label: 'Truck', Icon: Truck },
  { value: 'Shield', label: 'Shield', Icon: Shield },
  { value: 'Headphones', label: 'Headphones', Icon: Headphones },
  { value: 'Star', label: 'Star', Icon: Star },
  { value: 'Heart', label: 'Heart', Icon: Heart },
  { value: 'Zap', label: 'Zap', Icon: Zap },
  { value: 'Clock', label: 'Clock', Icon: Clock },
  { value: 'Globe', label: 'Globe', Icon: Globe },
  { value: 'Package', label: 'Package', Icon: Package },
  { value: 'CheckCircle', label: 'CheckCircle', Icon: CheckCircle },
  { value: 'ThumbsUp', label: 'ThumbsUp', Icon: ThumbsUp },
  { value: 'Flame', label: 'Flame', Icon: Flame },
  { value: 'Tag', label: 'Tag', Icon: Tag },
  { value: 'Gift', label: 'Gift', Icon: Gift },
  { value: 'ShoppingCart', label: 'Cart', Icon: ShoppingCart },
  { value: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
  { value: 'TrendingUp', label: 'Trending', Icon: TrendingUp },
];
import { cn } from '@/lib/utils';
import ImagePicker from './ImagePicker';
import DOMPurify from 'dompurify';

const SECTION_TYPES = [
  { value: 'text_block', label: 'Text / Content Block' },
  { value: 'hero_slider', label: 'Slider' },
  { value: 'product_showcase', label: 'Featured Products' },
  { value: 'categories', label: 'Categories' },
  { value: 'card_section', label: 'Why Choose Us / Cards' },
  { value: 'blog', label: 'Blog Post' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'brand_partner', label: 'Trusted Brands / Partners' },
  { value: 'custom_banner', label: 'Banner' },
  { value: 'faq_accordion', label: 'FAQ Accordion' },
  { value: 'card_grid', label: 'Card Grid' },
  { value: 'cta_block', label: 'Call to Action' },
  { value: 'team_members', label: 'Team Members' },
  { value: 'custom_html', label: 'Custom HTML' },
  { value: 'spacer', label: 'Spacer / Divider' },
];

const SECTION_LABELS: Record<string, string> = {};
SECTION_TYPES.forEach(t => { SECTION_LABELS[t.value] = t.label; });

const SECTION_COLORS: Record<string, string> = {
  text_block: 'bg-primary/10 text-primary',
  hero_slider: 'bg-destructive/10 text-destructive',
  product_showcase: 'bg-secondary/10 text-secondary',
  categories: 'bg-accent/10 text-accent-foreground',
  card_section: 'bg-secondary/10 text-secondary',
  blog: 'bg-secondary/10 text-secondary',
  testimonials: 'bg-accent/10 text-accent-foreground',
  brand_partner: 'bg-muted text-muted-foreground',
  custom_banner: 'bg-destructive/10 text-destructive',
  faq_accordion: 'bg-accent/10 text-accent-foreground',
  card_grid: 'bg-secondary/10 text-secondary',
  cta_block: 'bg-primary/10 text-primary',
  team_members: 'bg-muted text-muted-foreground',
  custom_html: 'bg-muted text-muted-foreground',
  spacer: 'bg-muted text-muted-foreground',
};

interface Props {
  pageId: string;
  pageTitle: string;
  isSystemPage?: boolean;
  systemPageSlug?: string;
}

const SYSTEM_PAGE_LABELS: Record<string, string> = {
  products: 'Product Listing (Default)',
  blog: 'Blog Post Listing (Default)',
  'single-product': 'Product Detail (Default)',
  'single-post': 'Blog Post Detail (Default)',
};

const PageSectionBuilder = ({ pageId, pageTitle, isSystemPage, systemPageSlug }: Props) => {
  const { data: sections = [], isLoading } = usePageSections(pageId);
  const createSection = useCreatePageSection();
  const updateSection = useUpdatePageSection();
  const deleteSection = useDeletePageSection();
  const reorderSections = useReorderPageSections();

  const [editSection, setEditSection] = useState<PageSection | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PageSection | null>(null);

  const sorted = useMemo(() => [...sections].sort((a, b) => a.display_order - b.display_order), [sections]);

  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    const updates = sorted.map((s, i) => ({
      id: s.id,
      display_order: i === idx ? sorted[next].display_order : i === next ? sorted[idx].display_order : s.display_order,
    }));
    reorderSections.mutate({ sections: updates, pageId });
  };

  const toggleEnabled = (s: PageSection) => {
    updateSection.mutate({ id: s.id, pageId, updates: { is_enabled: !s.is_enabled } });
    toast({ title: `Section ${!s.is_enabled ? 'enabled' : 'disabled'}` });
  };

  const duplicateSection = (s: PageSection) => {
    createSection.mutate({
      page_id: pageId,
      section_type: s.section_type,
      title: `${s.title} (Copy)`,
      display_order: sorted.length,
      is_enabled: false,
      settings_json: { ...s.settings_json },
    });
    toast({ title: 'Section duplicated!' });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSection.mutate({ id: deleteTarget.id, pageId }, {
      onSuccess: () => { toast({ title: 'Section deleted!' }); setDeleteTarget(null); },
    });
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading sections...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">Page Section Builder</h3>
          <p className="text-sm text-muted-foreground">Add, edit, reorder sections for "{pageTitle}"</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3 mr-1" /> Add Section</Button>
      </div>

      {/* Default section indicator for system pages */}
      {isSystemPage && systemPageSlug && (
        <div className="flex items-center gap-3 bg-muted/60 rounded-xl border border-border p-4">
          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{SYSTEM_PAGE_LABELS[systemPageSlug] || 'Default Content'}</p>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-accent/20 text-accent-foreground">Default · Cannot Delete</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">This is the built-in content section for this page. It is always displayed.</p>
          </div>
        </div>
      )}

      {sorted.length === 0 && !isSystemPage && (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-3">No sections yet. Click "Add Section" to start building this page.</p>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3 mr-1" /> Add First Section</Button>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((s, idx) => (
          <div key={s.id} className={cn("flex items-center gap-3 bg-card rounded-xl border border-border p-4", !s.is_enabled && "opacity-60")}>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <GripVertical className="w-4 h-4 text-muted-foreground/50" />
              <button onClick={() => moveSection(idx, 1)} disabled={idx === sorted.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">{s.title || SECTION_LABELS[s.section_type] || s.section_type}</p>
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", SECTION_COLORS[s.section_type])}>{SECTION_LABELS[s.section_type] || s.section_type}</Badge>
              </div>
            </div>
            <Switch checked={s.is_enabled} onCheckedChange={() => toggleEnabled(s)} />
            <Button size="sm" variant="ghost" onClick={() => duplicateSection(s)} title="Duplicate"><Copy className="w-3 h-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => setEditSection(s)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>

      {showAdd && <AddSectionDialog pageId={pageId} maxOrder={sorted.length} onClose={() => setShowAdd(false)} />}
      {editSection && <SectionEditorDialog section={editSection} pageId={pageId} onClose={() => setEditSection(null)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteTarget?.title || deleteTarget?.section_type}" will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Add Section Dialog ──
const AddSectionDialog = ({ pageId, maxOrder, onClose }: { pageId: string; maxOrder: number; onClose: () => void }) => {
  const create = useCreatePageSection();
  const [name, setName] = useState('');
  const [type, setType] = useState('text_block');

  const save = () => {
    if (!name.trim()) { toast({ title: 'Section name required', variant: 'destructive' }); return; }
    const defaults: Record<string, any> = {
      text_block: { content: '' },
      hero_slider: { slides: [{ image: '', title: 'Welcome', subtitle: '', btn_text: 'Shop Now', btn_link: '/products' }], autoplay: true, autoplay_speed: 5, loop: true, show_arrows: true, show_dots: true, transition: 'slide', slide_height: '500px' },
      product_showcase: { product_source: 'latest', item_limit: 4, selected_ids: [] },
      categories: { selected_ids: [], item_limit: 6, layout: 'grid', cols_desktop: 6, cols_tablet: 3, cols_mobile: 2, image_fit: 'cover', slider_autoplay: true, slider_speed: 4, slider_loop: true, slider_arrows: true, slider_dots: true, slider_per_view_desktop: 5, slider_per_view_tablet: 3, slider_per_view_mobile: 2 },
      card_section: { cards: [{ icon: 'Award', title: 'Quality', description: 'Premium quality products.' }], layout: '4-col' },
      blog: { item_limit: 3, show_date: true, show_author: true, show_excerpt: true, post_source: 'latest', columns: 3 },
      testimonials: { item_limit: 6, show_rating: true, show_company: true, autoplay: true, carousel_type: 'infinite' },
      brand_partner: { logos: [], grayscale: true, hover_color: true, logo_size: 'md' },
      custom_banner: { banners: [{ image: '', title: '', subtitle: '', btn_text: '', btn_link: '' }], banner_layout: 'full', banner_height: '400px' },
      faq_accordion: { items: [] },
      card_grid: { cards: [], columns: 3 },
      cta_block: { content: '', btn_text: '', btn_link: '', bg_color: '' },
      team_members: { members: [] },
      custom_html: { html_content: '', css_content: '' },
      spacer: { height: 48 },
    };
    create.mutate({
      page_id: pageId,
      section_type: type,
      title: name,
      display_order: maxOrder,
      is_enabled: true,
      settings_json: defaults[type] || {},
    }, {
      onSuccess: () => { toast({ title: 'Section added!' }); onClose(); },
    });
  };

  const descriptions: Record<string, string> = {
    text_block: 'Rich text content block with title and description.',
    hero_slider: 'Slider with autoplay, navigation, transition effects, and height control.',
    product_showcase: 'Display products from your store with filtering options.',
    categories: 'Show product categories in grid, slider, or horizontal scroll layout.',
    card_section: 'Icon cards for features, services, or "Why Choose Us".',
    blog: 'Blog posts with source selection, category filtering, and column control.',
    testimonials: 'Client testimonials carousel with ratings.',
    brand_partner: 'Logo showcase for brands or partners.',
    custom_banner: 'Promotional banners with slider or split layout.',
    faq_accordion: 'Expandable FAQ question & answer list.',
    card_grid: 'Grid of cards with image, title, and description.',
    cta_block: 'Call to action with text and button.',
    team_members: 'Team member cards with photo, name, and role.',
    custom_html: 'Custom HTML/CSS code block with live preview.',
    spacer: 'Empty space or divider between sections.',
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Section</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormField label="Section Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Our Mission" /></FormField>
          <FormField label="Section Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <p className="text-xs text-muted-foreground">{descriptions[type] || ''}</p>
          <Button onClick={save} disabled={create.isPending} className="w-full">Create Section</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Section Editor Dialog ──
const SectionEditorDialog = ({ section, pageId, onClose }: { section: PageSection; pageId: string; onClose: () => void }) => {
  const getEditor = () => {
    switch (section.section_type) {
      case 'text_block': return <TextBlockEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'hero_slider': return <HeroSliderEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'product_showcase': return <ProductShowcaseEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'categories': return <CategoriesEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'card_section': return <CardSectionEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'blog': return <BlogEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'testimonials': return <TestimonialsEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'brand_partner': return <BrandPartnerEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'custom_banner': return <BannerEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'faq_accordion': return <FAQEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'card_grid': return <CardGridEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'cta_block': return <CTABlockEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'team_members': return <TeamMembersEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'custom_html': return <CustomHTMLEditor section={section} pageId={pageId} onClose={onClose} />;
      case 'spacer': return <SpacerEditor section={section} pageId={pageId} onClose={onClose} />;
      default: return <TextBlockEditor section={section} pageId={pageId} onClose={onClose} />;
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></button>
            Edit: {section.title || SECTION_LABELS[section.section_type]}
          </DialogTitle>
        </DialogHeader>
        {getEditor()}
      </DialogContent>
    </Dialog>
  );
};

// ── Design Controls ──
const PAGE_FONT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];

const PAGE_FONT_WEIGHTS = [
  { value: '', label: 'Default' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
];

const DesignControls = ({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) => (
  <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
    <p className="text-sm font-semibold text-foreground">Design Controls</p>

    {/* Title Icon */}
    <p className="text-xs font-semibold text-muted-foreground">Title Icon</p>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Icon">
        <Select value={settings.title_icon || ''} onValueChange={(v) => setSettings({ ...settings, title_icon: v })}>
          <SelectTrigger><SelectValue placeholder="No Icon" /></SelectTrigger>
          <SelectContent>
            {TITLE_ICON_OPTIONS.map(opt => (
              <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                <span className="flex items-center gap-2">
                  {opt.value && <opt.Icon className="w-4 h-4" />}
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Icon Position">
        <Select value={settings.title_icon_position || 'left'} onValueChange={(v) => setSettings({ ...settings, title_icon_position: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left of Title</SelectItem>
            <SelectItem value="right">Right of Title</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <FormField label="Text Alignment">
        <Select value={settings.text_align || 'left'} onValueChange={(v) => setSettings({ ...settings, text_align: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Background Color">
        <div className="flex gap-1.5">
          <Input type="color" value={settings.bg_color || '#ffffff'} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })} className="w-10 h-9 p-0.5 cursor-pointer" />
          <Input value={settings.bg_color || ''} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })} placeholder="e.g. #f5f5f5" className="flex-1" />
        </div>
      </FormField>
    </div>

    {/* Color Controls */}
    <p className="text-xs font-semibold text-muted-foreground">Colors</p>
    <div className="grid grid-cols-3 gap-3">
      <FormField label="Title Color">
        <div className="flex gap-1.5">
          <Input type="color" value={settings.title_color || '#000000'} onChange={(e) => setSettings({ ...settings, title_color: e.target.value })} className="w-10 h-9 p-0.5 cursor-pointer" />
          <Input value={settings.title_color || ''} onChange={(e) => setSettings({ ...settings, title_color: e.target.value })} placeholder="Default" className="flex-1" />
        </div>
      </FormField>
      <FormField label="Subtitle Color">
        <div className="flex gap-1.5">
          <Input type="color" value={settings.subtitle_color || '#666666'} onChange={(e) => setSettings({ ...settings, subtitle_color: e.target.value })} className="w-10 h-9 p-0.5 cursor-pointer" />
          <Input value={settings.subtitle_color || ''} onChange={(e) => setSettings({ ...settings, subtitle_color: e.target.value })} placeholder="Default" className="flex-1" />
        </div>
      </FormField>
      <FormField label="Text Color">
        <div className="flex gap-1.5">
          <Input type="color" value={settings.text_color || '#333333'} onChange={(e) => setSettings({ ...settings, text_color: e.target.value })} className="w-10 h-9 p-0.5 cursor-pointer" />
          <Input value={settings.text_color || ''} onChange={(e) => setSettings({ ...settings, text_color: e.target.value })} placeholder="Default" className="flex-1" />
        </div>
      </FormField>
    </div>

    {/* Typography Controls */}
    <p className="text-xs font-semibold text-muted-foreground">Typography</p>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Title Font">
        <Select value={settings.title_font || ''} onValueChange={(v) => setSettings({ ...settings, title_font: v })}>
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {PAGE_FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value || 'default'}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Title Weight">
        <Select value={settings.title_weight || ''} onValueChange={(v) => setSettings({ ...settings, title_weight: v })}>
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {PAGE_FONT_WEIGHTS.map(w => <SelectItem key={w.value} value={w.value || 'default'}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Body Font">
        <Select value={settings.body_font || ''} onValueChange={(v) => setSettings({ ...settings, body_font: v })}>
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {PAGE_FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value || 'default'}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Body Font Size (px)">
        <Input type="number" min={10} max={32} value={settings.body_font_size || ''} onChange={(e) => setSettings({ ...settings, body_font_size: e.target.value ? Number(e.target.value) : null })} placeholder="Default (16)" />
      </FormField>
    </div>

    {/* Spacing */}
    <p className="text-xs font-semibold text-muted-foreground">Spacing</p>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Top Padding (px)">
        <Input type="number" min={0} max={200} value={settings.padding_top ?? ''} onChange={(e) => setSettings({ ...settings, padding_top: e.target.value ? Number(e.target.value) : null })} placeholder="Default (48)" />
      </FormField>
      <FormField label="Bottom Padding (px)">
        <Input type="number" min={0} max={200} value={settings.padding_bottom ?? ''} onChange={(e) => setSettings({ ...settings, padding_bottom: e.target.value ? Number(e.target.value) : null })} placeholder="Default (48)" />
      </FormField>
    </div>
    <p className="text-xs font-semibold text-muted-foreground">Element Gaps</p>
    <div className="grid grid-cols-3 gap-3">
      <FormField label="Below Title (px)">
        <Input type="number" min={0} max={100} value={settings.title_gap ?? ''} onChange={(e) => setSettings({ ...settings, title_gap: e.target.value ? Number(e.target.value) : null })} placeholder="Auto" />
      </FormField>
      <FormField label="Below Subtitle (px)">
        <Input type="number" min={0} max={100} value={settings.subtitle_gap ?? ''} onChange={(e) => setSettings({ ...settings, subtitle_gap: e.target.value ? Number(e.target.value) : null })} placeholder="Auto" />
      </FormField>
      <FormField label="To Content (px)">
        <Input type="number" min={0} max={100} value={settings.content_gap ?? ''} onChange={(e) => setSettings({ ...settings, content_gap: e.target.value ? Number(e.target.value) : null })} placeholder="Auto (24)" />
      </FormField>
    </div>
  </div>
);

// ── Shared Editor Props ──
interface EditorProps { section: PageSection; pageId: string; onClose: () => void; }

// ── Text Block Editor ──
const TextBlockEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const settingsRef = useRef<any>(section.settings_json || {});
  const [mode, setMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState((section.settings_json as any)?.content || '');
  const editorRef = useRef<HTMLDivElement>(null);
  const [designSettings, setDesignSettings] = useState<any>(section.settings_json || {});

  // Only set innerHTML on mount or mode switch, never on re-render
  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = settingsRef.current.content || '';
    }
  }, [mode]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const syncFromEditor = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      settingsRef.current = { ...settingsRef.current, ...designSettings, content: html };
      setTextContent(html);
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) execCmd('createLink', url);
  };

  const switchMode = (newMode: 'visual' | 'text') => {
    if (mode === 'visual') syncFromEditor();
    if (mode === 'text') settingsRef.current = { ...settingsRef.current, ...designSettings, content: textContent };
    setMode(newMode);
  };

  const save = () => {
    if (mode === 'visual' && editorRef.current) {
      settingsRef.current = { ...settingsRef.current, ...designSettings, content: editorRef.current.innerHTML };
    } else {
      settingsRef.current = { ...settingsRef.current, ...designSettings, content: textContent };
    }
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settingsRef.current } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };

  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      <FormField label="Content">
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 border-b border-border px-2 py-1 flex items-center justify-end gap-0.5">
            <Button type="button" size="sm" variant={mode === 'visual' ? 'secondary' : 'ghost'} className="h-6 px-2 text-[10px] rounded-sm" onClick={() => switchMode('visual')}>Visual</Button>
            <Button type="button" size="sm" variant={mode === 'text' ? 'secondary' : 'ghost'} className="h-6 px-2 text-[10px] rounded-sm" onClick={() => switchMode('text')}>Text</Button>
          </div>
          {mode === 'visual' ? (
            <>
              <div className="bg-muted/30 border-b border-border px-2 py-1 flex flex-wrap items-center gap-1">
                <select className="h-7 text-xs border border-border rounded bg-background px-1" onChange={e => { if (e.target.value) execCmd('formatBlock', e.target.value); e.target.value = ''; }}>
                  <option value="">Paragraph</option>
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="h4">Heading 4</option>
                </select>
                <div className="w-px h-5 bg-border" />
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 font-bold text-xs" onClick={() => execCmd('bold')} title="Bold">B</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 italic text-xs" onClick={() => execCmd('italic')} title="Italic">I</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 underline text-xs" onClick={() => execCmd('underline')} title="Underline">U</Button>
                <div className="w-px h-5 bg-border" />
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-xs" onClick={() => execCmd('insertUnorderedList')} title="Bullet List">☰</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-xs" onClick={() => execCmd('insertOrderedList')} title="Numbered List">1.</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-xs" onClick={handleLink} title="Insert Link">🔗</Button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[200px] p-4 text-sm focus:outline-none bg-background prose prose-sm max-w-none"
                onBlur={syncFromEditor}
                suppressContentEditableWarning
              />
            </>
          ) : (
            <Textarea rows={12} value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="HTML কোড লিখুন..." className="border-0 rounded-none font-mono text-xs focus-visible:ring-0" />
          )}
        </div>
      </FormField>
      <DesignControls settings={designSettings} setSettings={setDesignSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Hero Slider Editor ──
const HeroSliderEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [slides, setSlides] = useState<any[]>(settings.slides || []);

  const addSlide = () => setSlides([...slides, { image: '', title: '', subtitle: '', btn_text: 'Shop Now', btn_link: '/products' }]);
  const removeSlide = (i: number) => setSlides(slides.filter((_, idx) => idx !== i));
  const updateSlide = (i: number, field: string, val: string) => { const c = [...slides]; c[i] = { ...c[i], [field]: val }; setSlides(c); };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, slides } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Label (admin only)"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Slides ({slides.length})</p>
        <Button size="sm" variant="outline" onClick={addSlide}><Plus className="w-3 h-3 mr-1" /> Add Slide</Button>
      </div>
      {slides.map((slide, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Slide {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeSlide(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <ImagePicker value={slide.image || ''} onChange={(v) => updateSlide(i, 'image', v)} label="Slide Image" />
          <Input value={slide.title || ''} onChange={e => updateSlide(i, 'title', e.target.value)} placeholder="Slide title" />
          <Input value={slide.subtitle || ''} onChange={e => updateSlide(i, 'subtitle', e.target.value)} placeholder="Subtitle" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={slide.btn_text || ''} onChange={e => updateSlide(i, 'btn_text', e.target.value)} placeholder="Button text" />
            <Input value={slide.btn_link || ''} onChange={e => updateSlide(i, 'btn_link', e.target.value)} placeholder="Button link" />
          </div>
        </div>
      ))}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
        <p className="text-sm font-semibold text-foreground">Slider Controls</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Slide Height">
            <Input value={settings.slide_height || '500px'} onChange={e => setSettings({ ...settings, slide_height: e.target.value })} placeholder="e.g. 500px" />
          </FormField>
          <FormField label="Transition">
            <Select value={settings.transition || 'slide'} onValueChange={v => setSettings({ ...settings, transition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <FormField label="Autoplay Speed (seconds)">
          <Input type="number" min={1} max={30} value={settings.autoplay_speed || 5} onChange={e => setSettings({ ...settings, autoplay_speed: Number(e.target.value) })} />
        </FormField>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.autoplay !== false} onCheckedChange={v => setSettings({ ...settings, autoplay: v })} /> Autoplay</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.loop !== false} onCheckedChange={v => setSettings({ ...settings, loop: v })} /> Loop</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_arrows !== false} onCheckedChange={v => setSettings({ ...settings, show_arrows: v })} /> Arrows</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_dots !== false} onCheckedChange={v => setSettings({ ...settings, show_dots: v })} /> Dots</label>
        </div>
      </div>
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Product Showcase Editor ──
const ProductShowcaseEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});

  const source = settings.product_source || 'latest';
  const selectedIds: string[] = settings.selected_ids || [];

  const toggleId = (id: string) => {
    const ids = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
    setSettings({ ...settings, selected_ids: ids });
  };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settings } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Product Source">
          <Select value={source} onValueChange={v => setSettings({ ...settings, product_source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="top_rated">Top Rated</SelectItem>
              <SelectItem value="best_selling">Best Selling</SelectItem>
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="manual">Manual Pick</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Item Limit">
          <Input type="number" min={1} max={20} value={settings.item_limit || 4} onChange={e => setSettings({ ...settings, item_limit: Number(e.target.value) })} />
        </FormField>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
        <p className="text-sm font-semibold text-foreground">Product Grid Columns</p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Desktop (xl)">
            <Select value={String(settings.cols_desktop || 4)} onValueChange={(v) => setSettings({ ...settings, cols_desktop: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Tablet (md)">
            <Select value={String(settings.cols_tablet || 3)} onValueChange={(v) => setSettings({ ...settings, cols_tablet: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Mobile (sm)">
            <Select value={String(settings.cols_mobile || 2)} onValueChange={(v) => setSettings({ ...settings, cols_mobile: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </div>
      </div>
      {source === 'manual' && (
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
          {products.map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
              <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleId(p.id)} />
              <span className="truncate">{p.title}</span>
            </label>
          ))}
        </div>
      )}
      {source === 'category' && (
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
          {categories.map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
              <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleId(c.id)} />
              <span className="truncate">{c.name}</span>
            </label>
          ))}
        </div>
      )}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Categories Editor ──
const CategoriesEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const { data: allCategories = [] } = useCategories();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [selectedIds, setSelectedIds] = useState<string[]>(settings.selected_ids || []);

  const toggleCat = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, selected_ids: selectedIds } } }, {
      onSuccess: () => { toast({ title: 'Category section saved!' }); onClose(); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} placeholder="Leave empty to hide" /></FormField>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Select Categories ({selectedIds.length} selected — leave empty for all)</p>
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
          {allCategories.map((c: any) => (
            <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
              <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleCat(c.id)} />
              <span className="text-sm">{c.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Categories to Display">
          <Input type="number" min={1} max={20} value={settings.item_limit || 6} onChange={e => setSettings({ ...settings, item_limit: Number(e.target.value) })} />
        </FormField>
        <FormField label="Layout">
          <Select value={settings.layout || 'grid'} onValueChange={v => setSettings({ ...settings, layout: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="slider">Slider</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Slider Controls - only show when layout is slider */}
      {settings.layout === 'slider' && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
          <p className="text-sm font-semibold text-foreground">Slider Controls</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={settings.slider_autoplay !== false} onCheckedChange={v => setSettings({ ...settings, slider_autoplay: v })} />
              <span className="text-sm">Autoplay</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={settings.slider_loop !== false} onCheckedChange={v => setSettings({ ...settings, slider_loop: v })} />
              <span className="text-sm">Loop</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={settings.slider_arrows !== false} onCheckedChange={v => setSettings({ ...settings, slider_arrows: v })} />
              <span className="text-sm">Navigation Arrows</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={settings.slider_dots !== false} onCheckedChange={v => setSettings({ ...settings, slider_dots: v })} />
              <span className="text-sm">Dots Indicator</span>
            </label>
          </div>
          {settings.slider_autoplay !== false && (
            <FormField label={`Autoplay Speed: ${settings.slider_speed || 4}s`}>
              <Input type="range" min={1} max={10} step={0.5} value={settings.slider_speed || 4} onChange={e => setSettings({ ...settings, slider_speed: Number(e.target.value) })} />
            </FormField>
          )}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Items Desktop">
              <Select value={String(settings.slider_per_view_desktop || 5)} onValueChange={v => setSettings({ ...settings, slider_per_view_desktop: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Items Tablet">
              <Select value={String(settings.slider_per_view_tablet || 3)} onValueChange={v => setSettings({ ...settings, slider_per_view_tablet: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Items Mobile">
              <Select value={String(settings.slider_per_view_mobile || 2)} onValueChange={v => setSettings({ ...settings, slider_per_view_mobile: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
      )}

      {/* Grid Columns - only show when layout is grid */}
      {settings.layout !== 'slider' && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
          <p className="text-sm font-semibold text-foreground">Responsive Columns</p>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Desktop">
              <Select value={String(settings.cols_desktop || 6)} onValueChange={v => setSettings({ ...settings, cols_desktop: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Tablet">
              <Select value={String(settings.cols_tablet || 3)} onValueChange={v => setSettings({ ...settings, cols_tablet: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Mobile">
              <Select value={String(settings.cols_mobile || 2)} onValueChange={v => setSettings({ ...settings, cols_mobile: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Image Fit Mode">
          <Select value={settings.image_fit || 'cover'} onValueChange={v => setSettings({ ...settings, image_fit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover (fill card)</SelectItem>
              <SelectItem value="contain">Contain (show full image)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Card Background">
          <Input value={settings.card_bg_color || ''} onChange={e => setSettings({ ...settings, card_bg_color: e.target.value })} placeholder="e.g. #f0f0f0" />
        </FormField>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={!!settings.show_product_count} onCheckedChange={v => setSettings({ ...settings, show_product_count: !!v })} />
        <span className="text-sm">Show Product Count</span>
      </label>
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Category Settings</Button>
    </div>
  );
};

// ── Card Section Editor (Why Choose Us) ──
const CardSectionEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [cards, setCards] = useState<any[]>(settings.cards || []);

  const iconOptions = ['Award', 'Truck', 'Shield', 'Headphones', 'Star', 'Heart', 'Zap', 'Clock', 'Globe', 'Package', 'CheckCircle', 'ThumbsUp'];
  const addCard = () => setCards([...cards, { icon: 'Award', title: '', description: '', image: '', button_text: '', button_link: '', button_style: 'outline', button_align: 'center', button_target: '' }]);
  const removeCard = (i: number) => setCards(cards.filter((_, idx) => idx !== i));
  const updateCard = (i: number, field: string, val: string) => { const c = [...cards]; c[i] = { ...c[i], [field]: val }; setCards(c); };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, cards } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} /></FormField>
      <FormField label="Layout">
        <Select value={settings.layout || '4-col'} onValueChange={v => setSettings({ ...settings, layout: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2-col">2 Columns</SelectItem>
            <SelectItem value="3-col">3 Columns</SelectItem>
            <SelectItem value="4-col">4 Columns</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Cards ({cards.length})</p>
        <Button size="sm" variant="outline" onClick={addCard}><Plus className="w-3 h-3 mr-1" /> Add Card</Button>
      </div>
      {cards.map((card, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Card {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeCard(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Icon">
              <Select value={card.icon || 'Award'} onValueChange={v => updateCard(i, 'icon', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{iconOptions.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <Input value={card.title || ''} onChange={e => updateCard(i, 'title', e.target.value)} placeholder="Card title" className="mt-auto" />
          </div>
          <Textarea rows={2} value={card.description || ''} onChange={e => updateCard(i, 'description', e.target.value)} placeholder="Description" />
          <ImagePicker value={card.image || ''} onChange={v => updateCard(i, 'image', v)} label="Image (optional, replaces icon)" />
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input value={card.button_text || ''} onChange={e => updateCard(i, 'button_text', e.target.value)} placeholder="Button text (opt)" />
              <Input value={card.button_link || ''} onChange={e => updateCard(i, 'button_link', e.target.value)} placeholder="Button link" />
            </div>
            {card.button_text && (
              <div className="grid grid-cols-3 gap-2">
                <Select value={card.button_style || 'outline'} onValueChange={v => updateCard(i, 'button_style', v)}>
                  <SelectTrigger><SelectValue placeholder="Style" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Primary</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={card.button_align || 'center'} onValueChange={v => updateCard(i, 'button_align', v)}>
                  <SelectTrigger><SelectValue placeholder="Align" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><Checkbox checked={card.button_target === '_blank'} onCheckedChange={v => updateCard(i, 'button_target', v ? '_blank' : '')} /> New tab</label>
              </div>
            )}
          </div>
        </div>
      ))}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Blog Editor ──
const BlogEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const { data: allPosts = [] } = useBlogPosts();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const source = settings.post_source || 'latest';
  const selectedIds: string[] = settings.selected_ids || [];
  const blogCategories = useMemo(() => [...new Set(allPosts.map((p: any) => p.category).filter(Boolean))], [allPosts]);
  const toggleId = (id: string) => {
    const ids = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
    setSettings({ ...settings, selected_ids: ids });
  };
  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settings } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} /></FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Post Source">
          <Select value={source} onValueChange={v => setSettings({ ...settings, post_source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="manual">Manual Pick</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Post Limit">
          <Input type="number" min={1} max={12} value={settings.item_limit || 3} onChange={e => setSettings({ ...settings, item_limit: Number(e.target.value) })} />
        </FormField>
        <FormField label="Columns">
          <Select value={String(settings.columns || 3)} onValueChange={v => setSettings({ ...settings, columns: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Column</SelectItem>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
              <SelectItem value="4">4 Columns</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      {source === 'category' && (
        <FormField label="Category Filter">
          <Select value={settings.category_filter || ''} onValueChange={v => setSettings({ ...settings, category_filter: v })}>
            <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {blogCategories.map((cat: any) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      )}
      {source === 'manual' && (
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
          {allPosts.map((p: any) => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
              <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleId(p.id)} />
              <span className="truncate">{p.title}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_date !== false} onCheckedChange={v => setSettings({ ...settings, show_date: v })} /> Show Date</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_author !== false} onCheckedChange={v => setSettings({ ...settings, show_author: v })} /> Show Author</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_excerpt !== false} onCheckedChange={v => setSettings({ ...settings, show_excerpt: v })} /> Show Excerpt</label>
      </div>
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Testimonials Editor ──
const TestimonialsEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settings } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} /></FormField>
      <FormField label="Testimonial Limit">
        <Input type="number" min={1} max={20} value={settings.item_limit || 6} onChange={e => setSettings({ ...settings, item_limit: Number(e.target.value) })} />
      </FormField>
      <FormField label="Carousel Type">
        <Select value={settings.carousel_type || 'infinite'} onValueChange={v => setSettings({ ...settings, carousel_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="infinite">Infinite Loop</SelectItem>
            <SelectItem value="loop">Loop</SelectItem>
            <SelectItem value="fade">Fade</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Desktop Cards"><Input type="number" min={1} max={4} value={settings.cards_desktop || 3} onChange={e => setSettings({ ...settings, cards_desktop: Number(e.target.value) })} /></FormField>
        <FormField label="Tablet Cards"><Input type="number" min={1} max={3} value={settings.cards_tablet || 2} onChange={e => setSettings({ ...settings, cards_tablet: Number(e.target.value) })} /></FormField>
        <FormField label="Mobile Cards"><Input type="number" min={1} max={2} value={settings.cards_mobile || 1} onChange={e => setSettings({ ...settings, cards_mobile: Number(e.target.value) })} /></FormField>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_rating !== false} onCheckedChange={v => setSettings({ ...settings, show_rating: v })} /> Rating</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_company !== false} onCheckedChange={v => setSettings({ ...settings, show_company: v })} /> Company</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.autoplay !== false} onCheckedChange={v => setSettings({ ...settings, autoplay: v })} /> Autoplay</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_arrows !== false} onCheckedChange={v => setSettings({ ...settings, show_arrows: v })} /> Arrows</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.show_dots !== false} onCheckedChange={v => setSettings({ ...settings, show_dots: v })} /> Dots</label>
      </div>
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Brand / Partner Editor ──
const BrandPartnerEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [logos, setLogos] = useState<any[]>(settings.logos || []);

  const addLogo = () => setLogos([...logos, { name: '', url: '', link: '' }]);
  const removeLogo = (i: number) => setLogos(logos.filter((_, idx) => idx !== i));
  const updateLogo = (i: number, field: string, val: string) => { const c = [...logos]; c[i] = { ...c[i], [field]: val }; setLogos(c); };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, logos } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Logo Size">
          <Select value={settings.logo_size || 'md'} onValueChange={v => setSettings({ ...settings, logo_size: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <div className="flex flex-col gap-2 pt-5">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.grayscale} onCheckedChange={v => setSettings({ ...settings, grayscale: v })} /> Grayscale</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.hover_color} onCheckedChange={v => setSettings({ ...settings, hover_color: v })} /> Color on Hover</label>
        </div>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
        <p className="text-sm font-semibold text-foreground">Scroll / Carousel</p>
        <FormField label="Scroll Speed (seconds)">
          <Input type="number" min={1} max={30} value={settings.scroll_speed || 3} onChange={e => setSettings({ ...settings, scroll_speed: Number(e.target.value) })} />
        </FormField>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.auto_scroll !== false} onCheckedChange={v => setSettings({ ...settings, auto_scroll: v })} /> Auto Scroll</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.scroll_loop !== false} onCheckedChange={v => setSettings({ ...settings, scroll_loop: v })} /> Loop</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.show_scroll_arrows} onCheckedChange={v => setSettings({ ...settings, show_scroll_arrows: v })} /> Arrows</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={settings.drag_enabled !== false} onCheckedChange={v => setSettings({ ...settings, drag_enabled: v })} /> Manual Drag</label>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Logos ({logos.length})</p>
        <Button size="sm" variant="outline" onClick={addLogo}><Plus className="w-3 h-3 mr-1" /> Add Logo</Button>
      </div>
      {logos.map((logo, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Logo {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeLogo(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <Input value={logo.name || ''} onChange={e => updateLogo(i, 'name', e.target.value)} placeholder="Brand name" />
          <ImagePicker value={logo.url || ''} onChange={v => updateLogo(i, 'url', v)} label="Logo Image" />
          <Input value={logo.link || ''} onChange={e => updateLogo(i, 'link', e.target.value)} placeholder="Website link (optional)" />
        </div>
      ))}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Banner Editor ──
const BannerEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [banners, setBanners] = useState<any[]>(settings.banners || []);

  const addBanner = () => setBanners([...banners, { image: '', title: '', subtitle: '', btn_text: '', btn_link: '', overlay_color: 'rgba(0,0,0,0.4)' }]);
  const removeBanner = (i: number) => setBanners(banners.filter((_, idx) => idx !== i));
  const updateBanner = (i: number, field: string, val: string) => { const c = [...banners]; c[i] = { ...c[i], [field]: val }; setBanners(c); };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, banners } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Subtitle"><Input value={settings.subtitle || ''} onChange={e => setSettings({ ...settings, subtitle: e.target.value })} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Layout">
          <Select value={settings.banner_layout || 'full'} onValueChange={v => setSettings({ ...settings, banner_layout: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Width</SelectItem>
              <SelectItem value="split">Split (2 col)</SelectItem>
              <SelectItem value="slider">Slider</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Height">
          <Input value={settings.banner_height || '400px'} onChange={e => setSettings({ ...settings, banner_height: e.target.value })} placeholder="e.g. 400px" />
        </FormField>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Banners ({banners.length})</p>
        <Button size="sm" variant="outline" onClick={addBanner}><Plus className="w-3 h-3 mr-1" /> Add Banner</Button>
      </div>
      {banners.map((b, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Banner {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeBanner(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <ImagePicker value={b.image || ''} onChange={v => updateBanner(i, 'image', v)} label="Banner Image" />
          <Input value={b.title || ''} onChange={e => updateBanner(i, 'title', e.target.value)} placeholder="Banner title" />
          <Input value={b.subtitle || ''} onChange={e => updateBanner(i, 'subtitle', e.target.value)} placeholder="Subtitle" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={b.btn_text || ''} onChange={e => updateBanner(i, 'btn_text', e.target.value)} placeholder="Button text" />
            <Input value={b.btn_link || ''} onChange={e => updateBanner(i, 'btn_link', e.target.value)} placeholder="Button link" />
          </div>
          <Input value={b.overlay_color || ''} onChange={e => updateBanner(i, 'overlay_color', e.target.value)} placeholder="Overlay color (e.g. rgba(0,0,0,0.4))" />
        </div>
      ))}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── FAQ Accordion Editor ──
const FAQEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [items, setItems] = useState<{ q: string; a: string }[]>(settings.items || []);

  const addItem = () => setItems([...items, { q: '', a: '' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: 'q' | 'a', val: string) => {
    const copy = [...items]; copy[i] = { ...copy[i], [field]: val }; setItems(copy);
  };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, items } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };

  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">FAQ Items ({items.length})</p>
        <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Add</Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Q{i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <Input value={item.q} onChange={e => updateItem(i, 'q', e.target.value)} placeholder="Question" />
          <Textarea rows={2} value={item.a} onChange={e => updateItem(i, 'a', e.target.value)} placeholder="Answer" />
        </div>
      ))}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Card Grid Editor ──
const CardGridEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [cards, setCards] = useState<any[]>(settings.cards || []);

  const addCard = () => setCards([...cards, { title: '', description: '', icon: '', image: '' }]);
  const removeCard = (i: number) => setCards(cards.filter((_, idx) => idx !== i));
  const updateCard = (i: number, field: string, val: string) => { const c = [...cards]; c[i] = { ...c[i], [field]: val }; setCards(c); };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, cards } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };

  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Columns">
        <Select value={String(settings.columns || 3)} onValueChange={v => setSettings({ ...settings, columns: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{[2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n} columns</SelectItem>)}</SelectContent>
        </Select>
      </FormField>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Cards ({cards.length})</p>
        <Button size="sm" variant="outline" onClick={addCard}><Plus className="w-3 h-3 mr-1" /> Add Card</Button>
      </div>
      {cards.map((card, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Card {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeCard(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <Input value={card.title} onChange={e => updateCard(i, 'title', e.target.value)} placeholder="Card title" />
          <Textarea rows={2} value={card.description} onChange={e => updateCard(i, 'description', e.target.value)} placeholder="Card description" />
          <ImagePicker value={card.image || ''} onChange={(v) => updateCard(i, 'image', v)} label="Card Image" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={card.button_text || ''} onChange={e => updateCard(i, 'button_text', e.target.value)} placeholder="Button text" />
            <Input value={card.button_link || ''} onChange={e => updateCard(i, 'button_link', e.target.value)} placeholder="Button link" />
          </div>
          {card.button_text && (
            <div className="grid grid-cols-2 gap-2">
              <Select value={card.button_align || 'center'} onValueChange={v => updateCard(i, 'button_align', v)}>
                <SelectTrigger><SelectValue placeholder="Button align" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
              <Select value={card.button_style || 'default'} onValueChange={v => updateCard(i, 'button_style', v)}>
                <SelectTrigger><SelectValue placeholder="Button style" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── CTA Block Editor ──
const CTABlockEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settings } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Description">
        <Textarea rows={3} value={settings.content || ''} onChange={e => setSettings({ ...settings, content: e.target.value })} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Button Text"><Input value={settings.btn_text || ''} onChange={e => setSettings({ ...settings, btn_text: e.target.value })} /></FormField>
        <FormField label="Button Link"><Input value={settings.btn_link || ''} onChange={e => setSettings({ ...settings, btn_link: e.target.value })} /></FormField>
      </div>
      <FormField label="Background Image">
        <ImagePicker value={settings.bg_image || ''} onChange={(v) => setSettings({ ...settings, bg_image: v })} />
      </FormField>
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Team Members Editor ──
const TeamMembersEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [members, setMembers] = useState<any[]>(settings.members || []);

  const addMember = () => setMembers([...members, { name: '', role: '', avatar: '', bio: '' }]);
  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i));
  const updateMember = (i: number, field: string, val: string) => { const m = [...members]; m[i] = { ...m[i], [field]: val }; setMembers(m); };

  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: { ...settings, members } } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };

  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Members ({members.length})</p>
        <Button size="sm" variant="outline" onClick={addMember}><Plus className="w-3 h-3 mr-1" /> Add Member</Button>
      </div>
      {members.map((m, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Member {i + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => removeMember(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} placeholder="Name" />
            <Input value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} placeholder="Role/Position" />
          </div>
          <ImagePicker value={m.avatar || ''} onChange={(v) => updateMember(i, 'avatar', v)} label="Photo" />
          <Textarea rows={2} value={m.bio || ''} onChange={e => updateMember(i, 'bio', e.target.value)} placeholder="Short bio (optional)" />
        </div>
      ))}
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Custom HTML Editor (with preview) ──
const CustomHTMLEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settings } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };

  const sanitizedPreview = DOMPurify.sanitize(settings.html_content || '');

  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <Tabs defaultValue="html">
        <TabsList>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="css">CSS</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="html">
          <Textarea rows={12} value={settings.html_content || ''} onChange={e => setSettings({ ...settings, html_content: e.target.value })} className="font-mono text-xs" placeholder="<div>Your HTML here...</div>" />
        </TabsContent>
        <TabsContent value="css">
          <Textarea rows={8} value={settings.css_content || ''} onChange={e => setSettings({ ...settings, css_content: e.target.value })} className="font-mono text-xs" placeholder=".my-class { color: red; }" />
        </TabsContent>
        <TabsContent value="preview">
          <div className="border border-border rounded-lg p-4 min-h-[200px] bg-background">
            {settings.css_content && <style>{settings.css_content}</style>}
            <div dangerouslySetInnerHTML={{ __html: sanitizedPreview }} />
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={settings.container_mode === 'full_width'} onCheckedChange={v => setSettings({ ...settings, container_mode: v ? 'full_width' : 'container' })} /> Full Width</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!settings.enable_css} onCheckedChange={v => setSettings({ ...settings, enable_css: v })} /> Enable CSS</label>
      </div>
      <DesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ── Spacer Editor ──
const SpacerEditor = ({ section, pageId, onClose }: EditorProps) => {
  const update = useUpdatePageSection();
  const [title, setTitle] = useState(section.title);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, pageId, updates: { title, settings_json: settings } }, {
      onSuccess: () => { toast({ title: 'Saved!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Label (admin only)"><Input value={title} onChange={e => setTitle(e.target.value)} /></FormField>
      <FormField label="Height (px)">
        <Input type="number" min={8} max={300} value={settings.height || 48} onChange={e => setSettings({ ...settings, height: Number(e.target.value) })} />
      </FormField>
      <FormField label="Show Divider Line">
        <Switch checked={!!settings.show_divider} onCheckedChange={v => setSettings({ ...settings, show_divider: v })} />
      </FormField>
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

export default PageSectionBuilder;
