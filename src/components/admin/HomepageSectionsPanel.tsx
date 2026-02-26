import { useState, useMemo } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useHomepageSections, useUpdateHomepageSection, useReorderHomepageSections, useCreateHomepageSection, useDeleteHomepageSection, HomepageSection } from '@/hooks/useHomepageSections';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useProducts';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from './AdminShared';
import { toast } from '@/hooks/use-toast';
import { GripVertical, Pencil, ChevronUp, ChevronDown, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImagePicker from './ImagePicker';

// Simplified section types - no duplicates
const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Slider',
  product_showcase: 'Product Showcase',
  categories: 'Categories',
  flash_sale: 'Flash Sale',
  card_section: 'Card Section',
  blog: 'Latest Blog',
  testimonials: 'Testimonials',
  brand_partner: 'Brand / Partner',
  cta: 'Call to Action',
  custom_banner: 'Banner',
  custom_html: 'Custom HTML',
};

const SECTION_TYPE_COLORS: Record<string, string> = {
  hero: 'bg-primary/10 text-primary',
  product_showcase: 'bg-secondary/10 text-secondary',
  categories: 'bg-accent/10 text-accent-foreground',
  flash_sale: 'bg-destructive/10 text-destructive',
  card_section: 'bg-secondary/10 text-secondary',
  blog: 'bg-secondary/10 text-secondary',
  testimonials: 'bg-accent/10 text-accent-foreground',
  brand_partner: 'bg-muted text-muted-foreground',
  cta: 'bg-primary/10 text-primary',
  custom_banner: 'bg-destructive/10 text-destructive',
  custom_html: 'bg-muted text-muted-foreground',
};

const SYSTEM_SECTIONS = ['hero'];

// Sections that have buttons (for conditional button controls)
const SECTIONS_WITH_BUTTONS = ['cta', 'custom_banner', 'card_section', 'flash_sale'];

const SECTION_TYPES = [
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'flash_sale', label: 'Flash Sale / Deal' },
  { value: 'categories', label: 'Categories' },
  { value: 'card_section', label: 'Card Section' },
  { value: 'custom_banner', label: 'Banner' },
  { value: 'custom_html', label: 'Custom HTML' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'blog', label: 'Blog Posts' },
  { value: 'brand_partner', label: 'Brand / Partner' },
  { value: 'cta', label: 'Call to Action' },
];

// Normalize legacy section types to new simplified types
const getSectionType = (s: HomepageSection): string => {
  const raw = s.settings_json?.section_type || s.section_key;
  // Merge legacy product types
  if (['featured_products', 'best_selling', 'new_arrivals', 'trending', 'deal_of_day', 'custom_product_grid'].includes(raw)) return 'product_showcase';
  // Merge legacy card types
  if (['why_choose_us', 'icon_card_grid', 'feature_grid', 'info_cards', 'service_cards', 'trust_badges'].includes(raw)) return 'card_section';
  // Merge legacy brand types
  if (['partners', 'featured_brands'].includes(raw)) return 'brand_partner';
  // Remove newsletter - render nothing
  if (raw === 'newsletter') return 'newsletter_removed';
  return raw;
};

// ======= Global Section Design Controls (reusable) =======
const FONT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: "'Playfair Display', serif", label: 'Playfair Display' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'Arial', sans-serif", label: 'Arial' },
  { value: "'Courier New', monospace", label: 'Courier New' },
];

const FONT_WEIGHTS = [
  { value: '', label: 'Default' },
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
  { value: '800', label: 'Extra Bold (800)' },
];

const SectionDesignControls = ({ settings, setSettings, hasButton = false }: { settings: any; setSettings: (s: any) => void; hasButton?: boolean }) => (
  <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
    <p className="text-sm font-semibold text-foreground">Section Design Controls</p>

    <div className="grid grid-cols-3 gap-3">
      <FormField label="Title Alignment">
        <Select value={settings.title_align || 'center'} onValueChange={(v) => setSettings({ ...settings, title_align: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Title Size">
        <Select value={settings.title_size || 'large'} onValueChange={(v) => setSettings({ ...settings, title_size: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      {settings.title_size === 'custom' && (
        <FormField label="Font Size (px)">
          <Input type="number" min={12} max={72} value={settings.title_font_size || 32} onChange={(e) => setSettings({ ...settings, title_font_size: Number(e.target.value) })} />
        </FormField>
      )}
    </div>

    {/* Color Controls */}
    <p className="text-xs font-semibold text-muted-foreground mt-2">Colors</p>
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

    {/* Font Controls */}
    <p className="text-xs font-semibold text-muted-foreground mt-2">Typography</p>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Title Font">
        <Select value={settings.title_font || ''} onValueChange={(v) => setSettings({ ...settings, title_font: v })}>
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value || 'default'}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Title Weight">
        <Select value={settings.title_weight || ''} onValueChange={(v) => setSettings({ ...settings, title_weight: v })}>
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {FONT_WEIGHTS.map(w => <SelectItem key={w.value} value={w.value || 'default'}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Body Font">
        <Select value={settings.body_font || ''} onValueChange={(v) => setSettings({ ...settings, body_font: v })}>
          <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value || 'default'}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Body Font Size (px)">
        <Input type="number" min={10} max={32} value={settings.body_font_size || ''} onChange={(e) => setSettings({ ...settings, body_font_size: e.target.value ? Number(e.target.value) : null })} placeholder="Default (16)" />
      </FormField>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <FormField label="Background Color">
        <div className="flex gap-1.5">
          <Input type="color" value={settings.section_bg_color || '#ffffff'} onChange={(e) => setSettings({ ...settings, section_bg_color: e.target.value })} className="w-10 h-9 p-0.5 cursor-pointer" />
          <Input value={settings.section_bg_color || ''} onChange={(e) => setSettings({ ...settings, section_bg_color: e.target.value })} placeholder="e.g. #f5f5f5" className="flex-1" />
        </div>
      </FormField>
      <FormField label="Background Image">
        <ImagePicker value={settings.section_bg_image || ''} onChange={(v) => setSettings({ ...settings, section_bg_image: v })} />
      </FormField>
    </div>
    {settings.section_bg_image && (
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Overlay Color">
          <Input value={settings.section_overlay || ''} onChange={(e) => setSettings({ ...settings, section_overlay: e.target.value })} placeholder="rgba(0,0,0,0.3)" />
        </FormField>
        <FormField label="BG Size">
          <Select value={settings.section_bg_size || 'cover'} onValueChange={(v) => setSettings({ ...settings, section_bg_size: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="contain">Contain</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="BG Position">
          <Select value={settings.section_bg_position || 'center'} onValueChange={(v) => setSettings({ ...settings, section_bg_position: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    )}

    {/* Button controls only shown for sections that have buttons */}
    {hasButton && (
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Button Alignment">
          <Select value={settings.btn_align || 'center'} onValueChange={(v) => setSettings({ ...settings, btn_align: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Button Style">
          <Select value={settings.btn_style || 'primary'} onValueChange={(v) => setSettings({ ...settings, btn_style: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="rounded">Rounded</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    )}

    <p className="text-xs font-semibold text-muted-foreground mt-2">Spacing</p>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Top Padding (px)">
        <Input type="number" min={0} max={200} value={settings.padding_top ?? ''} onChange={(e) => setSettings({ ...settings, padding_top: e.target.value ? Number(e.target.value) : null })} placeholder="Default (64)" />
      </FormField>
      <FormField label="Bottom Padding (px)">
        <Input type="number" min={0} max={200} value={settings.padding_bottom ?? ''} onChange={(e) => setSettings({ ...settings, padding_bottom: e.target.value ? Number(e.target.value) : null })} placeholder="Default (64)" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Mobile Top Padding (px)">
        <Input type="number" min={0} max={200} value={settings.padding_top_mobile ?? ''} onChange={(e) => setSettings({ ...settings, padding_top_mobile: e.target.value ? Number(e.target.value) : null })} placeholder="Default (40)" />
      </FormField>
      <FormField label="Mobile Bottom Padding (px)">
        <Input type="number" min={0} max={200} value={settings.padding_bottom_mobile ?? ''} onChange={(e) => setSettings({ ...settings, padding_bottom_mobile: e.target.value ? Number(e.target.value) : null })} placeholder="Default (40)" />
      </FormField>
    </div>
    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSettings({
      ...settings,
      padding_top: null, padding_bottom: null, padding_top_mobile: null, padding_bottom_mobile: null,
      title_color: '', subtitle_color: '', text_color: '', title_font: '', title_weight: '', body_font: '', body_font_size: null,
    })}>Reset Styling to Default</Button>
  </div>
);

// ======= Main Panel =======
const HomepageSectionsPanel = () => {
  const { data: sections = [], isLoading } = useHomepageSections();
  const updateSection = useUpdateHomepageSection();
  const reorder = useReorderHomepageSections();
  const createSection = useCreateHomepageSection();
  const deleteSection = useDeleteHomepageSection();
  const [editSection, setEditSection] = useState<HomepageSection | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomepageSection | null>(null);

  const sorted = useMemo(() => [...sections].sort((a, b) => a.display_order - b.display_order), [sections]);

  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= sorted.length) return;
    const updates = sorted.map((s, i) => ({
      id: s.id,
      display_order: i === idx ? sorted[next].display_order : i === next ? sorted[idx].display_order : s.display_order,
    }));
    reorder.mutate(updates);
  };

  const toggleEnabled = (s: HomepageSection) => {
    updateSection.mutate({ id: s.id, updates: { is_enabled: !s.is_enabled } as any });
    toast({ title: `${SECTION_LABELS[getSectionType(s)] || s.title || s.section_key} ${!s.is_enabled ? 'enabled' : 'disabled'}` });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSection.mutate(deleteTarget.id, {
      onSuccess: () => { toast({ title: 'Section deleted successfully' }); setDeleteTarget(null); },
    });
  };

  if (isLoading) return <p className="text-muted-foreground">Loading sections...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Homepage Sections</h2>
          <p className="text-sm text-muted-foreground mt-1">Enable, disable, reorder, configure, and delete homepage sections</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3 mr-1" /> Add Section</Button>
      </div>

      <div className="space-y-2">
        {sorted.map((s, idx) => {
          const sType = getSectionType(s);
          if (sType === 'newsletter_removed') return null; // Hide removed newsletter sections
          const isSystem = SYSTEM_SECTIONS.includes(s.section_key);
          return (
            <div key={s.id} className={cn("flex items-center gap-3 bg-card rounded-xl border border-border p-4", !s.is_enabled && "opacity-60")}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                <button onClick={() => moveSection(idx, 1)} disabled={idx === sorted.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{s.title || SECTION_LABELS[sType] || s.section_key}</p>
                  <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", SECTION_TYPE_COLORS[sType])}>{SECTION_LABELS[sType] || sType}</Badge>
                  {isSystem && <Badge variant="outline" className="text-[10px] px-1.5 py-0">System</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.title}{s.subtitle ? ` — ${s.subtitle}` : ''}</p>
              </div>
              <Switch checked={s.is_enabled} onCheckedChange={() => toggleEnabled(s)} />
              <Button size="sm" variant="outline" onClick={() => setEditSection(s)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
              {!isSystem && (
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}><Trash2 className="w-3 h-3" /></Button>
              )}
            </div>
          );
        })}
      </div>

      {editSection && <SectionEditor section={editSection} onClose={() => setEditSection(null)} />}
      {showAdd && <AddSectionDialog onClose={() => setShowAdd(false)} maxOrder={sorted.length} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteTarget?.title || deleteTarget?.section_key}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ======= Add Section Dialog =======
const AddSectionDialog = ({ onClose, maxOrder }: { onClose: () => void; maxOrder: number }) => {
  const create = useCreateHomepageSection();
  const [name, setName] = useState('');
  const [type, setType] = useState('product_showcase');

  const save = () => {
    if (!name.trim()) { toast({ title: 'Section name required', variant: 'destructive' }); return; }
    const key = `custom_${Date.now()}`;
    create.mutate({
      section_key: key, title: name, subtitle: '', is_enabled: false, display_order: maxOrder,
      layout_type: 'grid',
      product_source: type === 'product_showcase' ? 'latest' : type === 'flash_sale' ? 'manual' : null,
      selected_ids: [], item_limit: 4,
      settings_json: {
        section_type: type,
        ...(type === 'card_section' ? { cards: [], layout: '4-col' } : {}),
        ...(type === 'custom_banner' ? { banners: [] } : {}),
        ...(type === 'custom_html' ? { html_content: '', css_content: '', container_mode: 'container' } : {}),
        ...(type === 'brand_partner' ? { logos: [] } : {}),
      },
    } as any, {
      onSuccess: () => { toast({ title: 'Section created!' }); onClose(); },
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Section</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FormField label="Section Name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trending Products" /></FormField>
          <FormField label="Section Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <Button onClick={save} disabled={create.isPending} className="w-full">Create Section</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ======= Section Editor Router =======
const SectionEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const sType = getSectionType(section);
  const getEditor = () => {
    if (sType === 'product_showcase') return <ProductShowcaseEditor section={section} onClose={onClose} />;
    if (sType === 'categories') return <CategoriesEditor section={section} onClose={onClose} />;
    if (sType === 'flash_sale') return <FlashSaleEditor section={section} onClose={onClose} />;
    if (sType === 'card_section') return <CardSectionEditor section={section} onClose={onClose} />;
    if (sType === 'blog') return <BlogEditor section={section} onClose={onClose} />;
    if (sType === 'testimonials') return <TestimonialsEditor section={section} onClose={onClose} />;
    if (sType === 'brand_partner') return <BrandPartnerEditor section={section} onClose={onClose} />;
    if (sType === 'cta') return <CTAEditor section={section} onClose={onClose} />;
    if (sType === 'custom_html') return <CustomHTMLEditor section={section} onClose={onClose} />;
    if (sType === 'custom_banner') return <BannerEditor section={section} onClose={onClose} />;
    return <GenericEditor section={section} onClose={onClose} />;
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></button>
            Edit: {SECTION_LABELS[sType] || section.title || sType}
          </DialogTitle>
        </DialogHeader>
        {getEditor()}
      </DialogContent>
    </Dialog>
  );
};

// ======= Generic Editor =======
const GenericEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, settings_json: settings } as any }, {
      onSuccess: () => { toast({ title: 'Section updated!' }); onClose(); },
    });
  };
  return (
    <div className="space-y-4">
      <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending}>Save Changes</Button>
    </div>
  );
};

// ======= Product Showcase Editor (unified: replaces featured_products, best_selling, new_arrivals, trending) =======
const ProductShowcaseEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const { formatPrice } = useCurrency();
  const { data: allProducts = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [source, setSource] = useState(section.product_source || 'latest');
  const [selectedIds, setSelectedIds] = useState<string[]>(Array.isArray(section.selected_ids) ? section.selected_ids : []);
  const [limit, setLimit] = useState(section.item_limit || 4);
  const [layout, setLayout] = useState(section.layout_type || 'grid');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [catFilter, setCatFilter] = useState('');
  const toggleProduct = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const save = () => {
    update.mutate({
      id: section.id,
      updates: { title, subtitle, product_source: source, selected_ids: selectedIds as any, item_limit: limit, layout_type: layout, settings_json: { ...settings, section_type: 'product_showcase' } } as any,
    }, { onSuccess: () => { toast({ title: 'Settings saved!' }); onClose(); } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Arrivals, Trending, Best Selling" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <FormField label="Product Source">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Selection</SelectItem>
            <SelectItem value="latest">Latest Products</SelectItem>
            <SelectItem value="best_selling">Best Selling</SelectItem>
            <SelectItem value="top_rated">Top Rated</SelectItem>
            <SelectItem value="random">Random</SelectItem>
            <SelectItem value="category">Category Based</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <p className="text-xs text-muted-foreground">💡 Change the title to create different sections: "New Arrivals", "Trending Products", "Deal of the Day", etc.</p>
      {source === 'category' && (
        <FormField label="Filter by Category">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
      )}
      {source === 'manual' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Select Products ({selectedIds.length} selected)</p>
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
            {allProducts.map(p => (
              <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                <img src={p.image_url || '/placeholder.svg'} alt="" className="w-8 h-8 rounded object-cover" />
                <span className="text-sm truncate flex-1">{p.title}</span>
                <span className="text-xs text-muted-foreground">{formatPrice(p.discount_price || p.regular_price)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Products to Display"><Input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></FormField>
        <FormField label="Layout Style">
          <Select value={layout} onValueChange={setLayout}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="slider">Slider</SelectItem>
            </SelectContent>
          </Select>
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
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Settings</Button>
    </div>
  );
};

// ======= Categories Editor =======
const CategoriesEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const { data: allCategories = [] } = useCategories();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(Array.isArray(section.selected_ids) ? section.selected_ids : []);
  const [limit, setLimit] = useState(section.item_limit || 6);
  const [layout, setLayout] = useState(section.layout_type || 'grid');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const toggleCat = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const save = () => {
    update.mutate({
      id: section.id,
      updates: { title, subtitle, selected_ids: selectedIds as any, item_limit: limit, layout_type: layout, settings_json: settings } as any,
    }, { onSuccess: () => { toast({ title: 'Category section saved!' }); onClose(); } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Select Categories ({selectedIds.length} selected)</p>
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
        <FormField label="Categories to Display"><Input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></FormField>
        <FormField label="Layout">
          <Select value={layout} onValueChange={setLayout}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="horizontal">Horizontal Scroll</SelectItem>
              <SelectItem value="carousel">Carousel / Slider</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
        <p className="text-sm font-semibold text-foreground">Responsive Columns</p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Desktop">
            <Select value={String(settings.cols_desktop || 6)} onValueChange={(v) => setSettings({ ...settings, cols_desktop: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Tablet">
            <Select value={String(settings.cols_tablet || 3)} onValueChange={(v) => setSettings({ ...settings, cols_tablet: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Mobile">
            <Select value={String(settings.cols_mobile || 2)} onValueChange={(v) => setSettings({ ...settings, cols_mobile: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={String(n)}>{n} cols</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Image Fit Mode">
          <Select value={settings.image_fit || 'cover'} onValueChange={(v) => setSettings({ ...settings, image_fit: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover (fill card)</SelectItem>
              <SelectItem value="contain">Contain (show full image)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Card Background">
          <Input value={settings.card_bg_color || ''} onChange={(e) => setSettings({ ...settings, card_bg_color: e.target.value })} placeholder="e.g. #f0f0f0" />
        </FormField>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={!!settings.show_product_count} onCheckedChange={(v) => setSettings({ ...settings, show_product_count: !!v })} />
        <span className="text-sm">Show Product Count</span>
      </label>
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Category Settings</Button>
    </div>
  );
};

// ======= Flash Sale Editor =======
const FlashSaleEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const { formatPrice } = useCurrency();
  const { data: allProducts = [] } = useProducts();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(Array.isArray(section.selected_ids) ? section.selected_ids : []);
  const [limit, setLimit] = useState(section.item_limit || 4);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const toggleProduct = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const save = () => {
    update.mutate({
      id: section.id,
      updates: { title, subtitle, selected_ids: selectedIds as any, item_limit: limit, settings_json: { ...settings, section_type: 'flash_sale' } } as any,
    }, { onSuccess: () => { toast({ title: 'Settings saved!' }); onClose(); } });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></FormField>
      </div>
      <FormField label="Sale End Date & Time">
        <Input type="datetime-local" value={settings.end_date || ''} onChange={(e) => setSettings({ ...settings, end_date: e.target.value })} />
      </FormField>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Products ({selectedIds.length} selected)</p>
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
          {allProducts.map(p => (
            <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
              <Checkbox checked={selectedIds.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
              <img src={p.image_url || '/placeholder.svg'} alt="" className="w-8 h-8 rounded object-cover" />
              <span className="text-sm truncate flex-1">{p.title}</span>
              <span className="text-xs text-muted-foreground">{formatPrice(p.discount_price || p.regular_price)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Max Products"><Input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></FormField>
        <FormField label="Banner Image"><ImagePicker value={settings.banner_image || ''} onChange={(v) => setSettings({ ...settings, banner_image: v })} /></FormField>
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
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={!!settings.auto_hide_expired} onCheckedChange={(v) => setSettings({ ...settings, auto_hide_expired: !!v })} />
          <span className="text-sm">Auto-hide when sale expires</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={!!settings.show_expired_label} onCheckedChange={(v) => setSettings({ ...settings, show_expired_label: !!v })} />
          <span className="text-sm">Show "Sale Ended" label when expired</span>
        </label>
      </div>
      <SectionDesignControls settings={settings} setSettings={setSettings} hasButton />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Settings</Button>
    </div>
  );
};

// ======= Card Section Editor (unified: replaces why_choose_us, icon_card_grid, feature_grid, info_cards, service_cards) =======
const CardSectionEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [cards, setCards] = useState<any[]>(settings.cards || []);
  const addCard = () => setCards([...cards, { icon: 'Star', title: '', description: '', image: '', button_text: '', button_link: '' }]);
  const removeCard = (i: number) => setCards(cards.filter((_, idx) => idx !== i));
  const updateCard = (i: number, field: string, val: string) => { const c = [...cards]; c[i] = { ...c[i], [field]: val }; setCards(c); };
  const moveCard = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= cards.length) return; const c = [...cards]; [c[i], c[j]] = [c[j], c[i]]; setCards(c); };
  const hasAnyButton = cards.some(c => c.button_text);
  const save = () => {
    update.mutate({
      id: section.id,
      updates: { title, subtitle, layout_type: settings.layout || 'grid', settings_json: { ...settings, cards, section_type: 'card_section' } } as any,
    }, { onSuccess: () => { toast({ title: 'Section saved!' }); onClose(); } });
  };
  const ICONS = ['Award', 'Truck', 'Shield', 'Headphones', 'Star', 'Heart', 'Zap', 'Clock', 'Globe', 'Package', 'CheckCircle', 'ThumbsUp'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Why Choose Us, Our Services" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <FormField label="Layout">
        <Select value={settings.layout || '4-col'} onValueChange={(v) => setSettings({ ...settings, layout: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid (auto)</SelectItem>
            <SelectItem value="2-col">2 Columns</SelectItem>
            <SelectItem value="3-col">3 Columns</SelectItem>
            <SelectItem value="4-col">4 Columns</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Cards ({cards.length})</p>
          <Button size="sm" variant="outline" onClick={addCard}><Plus className="w-3 h-3 mr-1" /> Add Card</Button>
        </div>
        {cards.map((card, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <button onClick={() => moveCard(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={() => moveCard(i, 1)} disabled={i === cards.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                <span className="text-xs font-medium text-muted-foreground ml-1">Card {i + 1}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeCard(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Icon">
                <Select value={card.icon || 'Star'} onValueChange={(v) => updateCard(i, 'icon', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Title"><Input value={card.title} onChange={(e) => updateCard(i, 'title', e.target.value)} /></FormField>
            </div>
            <FormField label="Description"><Textarea rows={2} value={card.description} onChange={(e) => updateCard(i, 'description', e.target.value)} /></FormField>
            <FormField label="Image (optional)"><ImagePicker value={card.image || ''} onChange={(v) => updateCard(i, 'image', v)} /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Button Text"><Input value={card.button_text || ''} onChange={(e) => updateCard(i, 'button_text', e.target.value)} placeholder="Learn More" /></FormField>
              <FormField label="Button Link"><Input value={card.button_link || ''} onChange={(e) => updateCard(i, 'button_link', e.target.value)} placeholder="/page" /></FormField>
            </div>
          </div>
        ))}
      </div>
      <SectionDesignControls settings={settings} setSettings={setSettings} hasButton={hasAnyButton} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Section</Button>
    </div>
  );
};

// ======= Blog Editor =======
const BlogEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [limit, setLimit] = useState(section.item_limit || 3);
  const [layout, setLayout] = useState(section.layout_type || 'grid');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, item_limit: limit, layout_type: layout, settings_json: settings } as any },
      { onSuccess: () => { toast({ title: 'Blog section saved!' }); onClose(); } });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Number of Posts"><Input type="number" min={1} max={12} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></FormField>
        <FormField label="Layout"><Select value={layout} onValueChange={setLayout}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="slider">Slider</SelectItem></SelectContent></Select></FormField>
      </div>
      <FormField label="Category Filter"><Input value={settings.category_filter || ''} onChange={(e) => setSettings({ ...settings, category_filter: e.target.value })} placeholder="Leave empty for all categories" /></FormField>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {[{ key: 'show_date', label: 'Show Date', def: true }, { key: 'show_author', label: 'Show Author', def: true }, { key: 'show_excerpt', label: 'Show Excerpt', def: true }].map(({ key, label, def }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={settings[key] !== undefined ? !!settings[key] : def} onCheckedChange={(v) => setSettings({ ...settings, [key]: !!v })} />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Blog Settings</Button>
    </div>
  );
};

// ======= Testimonials Editor =======
const TestimonialsEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [limit, setLimit] = useState(section.item_limit || 10);
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, item_limit: limit, settings_json: settings } as any },
      { onSuccess: () => { toast({ title: 'Testimonials saved!' }); onClose(); } });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <FormField label="Number of Testimonials"><Input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></FormField>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
        <p className="text-sm font-semibold text-foreground">Cards Per Slide</p>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Desktop"><Select value={String(settings.cards_desktop || 3)} onValueChange={(v) => setSettings({ ...settings, cards_desktop: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} card{n>1?'s':''}</SelectItem>)}</SelectContent></Select></FormField>
          <FormField label="Tablet"><Select value={String(settings.cards_tablet || 2)} onValueChange={(v) => setSettings({ ...settings, cards_tablet: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={String(n)}>{n} card{n>1?'s':''}</SelectItem>)}</SelectContent></Select></FormField>
          <FormField label="Mobile"><Select value={String(settings.cards_mobile || 1)} onValueChange={(v) => setSettings({ ...settings, cards_mobile: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2].map(n => <SelectItem key={n} value={String(n)}>{n} card{n>1?'s':''}</SelectItem>)}</SelectContent></Select></FormField>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Carousel Type"><Select value={settings.carousel_type || 'infinite'} onValueChange={(v) => setSettings({ ...settings, carousel_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="slide">Slide</SelectItem><SelectItem value="fade">Fade</SelectItem><SelectItem value="loop">Loop</SelectItem><SelectItem value="infinite">Infinite</SelectItem></SelectContent></Select></FormField>
        <FormField label="Slide Speed (seconds)"><Input type="number" min={1} max={20} value={settings.slide_speed || 5} onChange={(e) => setSettings({ ...settings, slide_speed: Number(e.target.value) })} /></FormField>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Options</p>
        {[
          { key: 'autoplay', label: 'Autoplay', def: true },
          { key: 'pause_on_hover', label: 'Pause on Hover', def: true },
          { key: 'show_dots', label: 'Show Dots', def: true },
          { key: 'show_arrows', label: 'Show Arrows', def: true },
          { key: 'show_rating', label: 'Show Rating', def: true },
          { key: 'show_company', label: 'Show Company Name', def: true },
        ].map(({ key, label, def }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={settings[key] !== undefined ? !!settings[key] : def} onCheckedChange={(v) => setSettings({ ...settings, [key]: !!v })} />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Testimonial Settings</Button>
    </div>
  );
};

// ======= Brand / Partner Editor (unified: replaces partners & featured_brands) =======
const BrandPartnerEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [logos, setLogos] = useState<any[]>(settings.logos || []);
  const addLogo = () => setLogos([...logos, { name: '', url: '', link: '' }]);
  const removeLogo = (i: number) => setLogos(logos.filter((_, idx) => idx !== i));
  const updateLogo = (i: number, field: string, val: string) => { const l = [...logos]; l[i] = { ...l[i], [field]: val }; setLogos(l); };
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, settings_json: { ...settings, logos, section_type: 'brand_partner' } } as any },
      { onSuccess: () => { toast({ title: 'Saved!' }); onClose(); } });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Layout"><Select value={settings.slider_style || 'grid'} onValueChange={(v) => setSettings({ ...settings, slider_style: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">Grid</SelectItem><SelectItem value="auto">Auto Scroll</SelectItem><SelectItem value="manual">Manual Slider</SelectItem></SelectContent></Select></FormField>
        <FormField label="Logo Size"><Select value={settings.logo_size || 'md'} onValueChange={(v) => setSettings({ ...settings, logo_size: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sm">Small</SelectItem><SelectItem value="md">Medium</SelectItem><SelectItem value="lg">Large</SelectItem></SelectContent></Select></FormField>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {[{ key: 'grayscale', label: 'Grayscale Logos' }, { key: 'hover_color', label: 'Color on Hover' }].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer"><Checkbox checked={!!settings[key]} onCheckedChange={(v) => setSettings({ ...settings, [key]: !!v })} /><span className="text-sm">{label}</span></label>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Logos ({logos.length})</p>
          <Button size="sm" variant="outline" onClick={addLogo}><Plus className="w-3 h-3 mr-1" /> Add Logo</Button>
        </div>
        {logos.map((logo, i) => (
          <div key={i} className="bg-muted/30 rounded-lg p-2 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <Input value={logo.name} onChange={(e) => updateLogo(i, 'name', e.target.value)} placeholder="Brand name" className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => removeLogo(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
            </div>
            <ImagePicker value={logo.url || ''} onChange={(v) => updateLogo(i, 'url', v)} />
            <Input value={logo.link || ''} onChange={(e) => updateLogo(i, 'link', e.target.value)} placeholder="Link URL (optional)" />
          </div>
        ))}
      </div>
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save</Button>
    </div>
  );
};

// ======= CTA Editor =======
const CTAEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, settings_json: settings } as any },
      { onSuccess: () => { toast({ title: 'CTA saved!' }); onClose(); } });
  };
  return (
    <div className="space-y-4">
      <FormField label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      <FormField label="Background Image"><ImagePicker value={settings.bg_image || ''} onChange={(v) => setSettings({ ...settings, bg_image: v })} /></FormField>
      <FormField label="Background Color"><Input value={settings.bg_color || ''} onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })} placeholder="Leave empty for default" /></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Button Text"><Input value={settings.btn_text || ''} onChange={(e) => setSettings({ ...settings, btn_text: e.target.value })} placeholder="Shop Now" /></FormField>
        <FormField label="Button Link"><Input value={settings.btn_link || ''} onChange={(e) => setSettings({ ...settings, btn_link: e.target.value })} placeholder="/products" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Secondary Button"><Input value={settings.btn2_text || ''} onChange={(e) => setSettings({ ...settings, btn2_text: e.target.value })} placeholder="Contact Us" /></FormField>
        <FormField label="Secondary Link"><Input value={settings.btn2_link || ''} onChange={(e) => setSettings({ ...settings, btn2_link: e.target.value })} placeholder="/contact" /></FormField>
      </div>
      <FormField label="Alignment"><Select value={settings.alignment || 'center'} onValueChange={(v) => setSettings({ ...settings, alignment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></FormField>
      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={!!settings.open_new_tab} onCheckedChange={(v) => setSettings({ ...settings, open_new_tab: !!v })} /><span className="text-sm">Open in new tab</span></label>
      <SectionDesignControls settings={settings} setSettings={setSettings} hasButton />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save CTA</Button>
    </div>
  );
};

// ======= Custom HTML Editor =======
const CustomHTMLEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [activeTab, setActiveTab] = useState<string>('html');
  const sanitizeHtml = (html: string) => html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '').replace(/on\w+='[^']*'/gi, '');
  const previewHtml = `${settings.css_content ? `<style>${settings.css_content}</style>` : ''}${sanitizeHtml(settings.html_content || '')}`;
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, settings_json: { ...settings, section_type: 'custom_html' } } as any },
      { onSuccess: () => { toast({ title: 'Custom HTML saved!' }); onClose(); } });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <FormField label="Container Mode"><Select value={settings.container_mode || 'container'} onValueChange={(v) => setSettings({ ...settings, container_mode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="container">Container</SelectItem><SelectItem value="full_width">Full Width</SelectItem></SelectContent></Select></FormField>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full"><TabsTrigger value="html" className="flex-1">HTML</TabsTrigger><TabsTrigger value="css" className="flex-1">CSS</TabsTrigger><TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger></TabsList>
        <TabsContent value="html"><Textarea rows={12} value={settings.html_content || ''} onChange={(e) => setSettings({ ...settings, html_content: e.target.value })} placeholder="<div>Your HTML here</div>" className="font-mono text-xs" /><p className="text-xs text-muted-foreground mt-1">Scripts and event handlers are sanitized.</p></TabsContent>
        <TabsContent value="css"><Textarea rows={8} value={settings.css_content || ''} onChange={(e) => setSettings({ ...settings, css_content: e.target.value })} placeholder=".my-class { color: red; }" className="font-mono text-xs" /></TabsContent>
        <TabsContent value="preview"><div className="border border-border rounded-lg p-4 min-h-[200px] bg-background">{settings.html_content ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <p className="text-muted-foreground text-sm text-center py-8">No HTML content yet.</p>}</div></TabsContent>
      </Tabs>
      <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={!!settings.enable_css} onCheckedChange={(v) => setSettings({ ...settings, enable_css: !!v })} /><span className="text-sm">Enable CSS</span></label>
      <SectionDesignControls settings={settings} setSettings={setSettings} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Custom HTML</Button>
    </div>
  );
};

// ======= Banner Editor =======
const BannerEditor = ({ section, onClose }: { section: HomepageSection; onClose: () => void }) => {
  const update = useUpdateHomepageSection();
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle || '');
  const [settings, setSettings] = useState<any>(section.settings_json || {});
  const [banners, setBanners] = useState<any[]>(settings.banners || []);
  const addBanner = () => setBanners([...banners, { image: '', mobile_image: '', title: '', subtitle: '', description: '', btn_text: '', btn_link: '', overlay_color: 'rgba(0,0,0,0.4)', text_align: 'center', start_date: '', end_date: '' }]);
  const removeBanner = (i: number) => setBanners(banners.filter((_, idx) => idx !== i));
  const updateBanner = (i: number, field: string, val: string) => { const b = [...banners]; b[i] = { ...b[i], [field]: val }; setBanners(b); };
  const hasAnyButton = banners.some(b => b.btn_text);
  const save = () => {
    update.mutate({ id: section.id, updates: { title, subtitle, settings_json: { ...settings, banners, section_type: 'custom_banner' } } as any },
      { onSuccess: () => { toast({ title: 'Banner saved!' }); onClose(); } });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Section Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
        <FormField label="Subtitle"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Leave empty to hide" /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Layout"><Select value={settings.banner_layout || 'full'} onValueChange={(v) => setSettings({ ...settings, banner_layout: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Full Width</SelectItem><SelectItem value="split">Split</SelectItem><SelectItem value="slider">Slider</SelectItem></SelectContent></Select></FormField>
        <FormField label="Height"><Select value={settings.banner_height || '400px'} onValueChange={(v) => setSettings({ ...settings, banner_height: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="300px">Small</SelectItem><SelectItem value="400px">Medium</SelectItem><SelectItem value="500px">Large</SelectItem><SelectItem value="100vh">Full Screen</SelectItem></SelectContent></Select></FormField>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Banners ({banners.length})</p>
          <Button size="sm" variant="outline" onClick={addBanner}><Plus className="w-3 h-3 mr-1" /> Add Banner</Button>
        </div>
        {banners.map((banner, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
            <div className="flex justify-between items-center"><span className="text-xs font-medium text-muted-foreground">Banner {i + 1}</span><Button size="sm" variant="ghost" onClick={() => removeBanner(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button></div>
            <FormField label="Desktop Image"><ImagePicker value={banner.image || ''} onChange={(v) => updateBanner(i, 'image', v)} /></FormField>
            <FormField label="Mobile Image"><ImagePicker value={banner.mobile_image || ''} onChange={(v) => updateBanner(i, 'mobile_image', v)} /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Title"><Input value={banner.title || ''} onChange={(e) => updateBanner(i, 'title', e.target.value)} /></FormField>
              <FormField label="Subtitle"><Input value={banner.subtitle || ''} onChange={(e) => updateBanner(i, 'subtitle', e.target.value)} /></FormField>
            </div>
            <FormField label="Description"><Textarea rows={2} value={banner.description || ''} onChange={(e) => updateBanner(i, 'description', e.target.value)} /></FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Button Text"><Input value={banner.btn_text || ''} onChange={(e) => updateBanner(i, 'btn_text', e.target.value)} /></FormField>
              <FormField label="Button Link"><Input value={banner.btn_link || ''} onChange={(e) => updateBanner(i, 'btn_link', e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Overlay Color"><Input value={banner.overlay_color || ''} onChange={(e) => updateBanner(i, 'overlay_color', e.target.value)} placeholder="rgba(0,0,0,0.4)" /></FormField>
              <FormField label="Text Align"><Select value={banner.text_align || 'center'} onValueChange={(v) => updateBanner(i, 'text_align', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></FormField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Start Date"><Input type="datetime-local" value={banner.start_date || ''} onChange={(e) => updateBanner(i, 'start_date', e.target.value)} /></FormField>
              <FormField label="End Date"><Input type="datetime-local" value={banner.end_date || ''} onChange={(e) => updateBanner(i, 'end_date', e.target.value)} /></FormField>
            </div>
          </div>
        ))}
      </div>
      <SectionDesignControls settings={settings} setSettings={setSettings} hasButton={hasAnyButton} />
      <Button onClick={save} disabled={update.isPending} className="w-full">Save Banners</Button>
    </div>
  );
};

export default HomepageSectionsPanel;
