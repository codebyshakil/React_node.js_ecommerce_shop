import { useState } from 'react';
import { usePageContent, useUpdatePageContent } from '@/hooks/usePageContent';
import { useCategories } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { FormField } from './AdminShared';
import { LinkEditor, LinkItem } from './LinkEditor';

const ColorField = ({ label, value, onChange, description }: { label: string; value: string; onChange: (v: string) => void; description?: string }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-foreground">{label}</label>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    <div className="flex items-center gap-2">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent p-0.5" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000 or rgba(...)" className="flex-1 font-mono text-xs" />
      {value && <button onClick={() => onChange('')} className="text-xs text-muted-foreground hover:text-destructive">✕</button>}
    </div>
  </div>
);

const LayoutControls = () => {
  const updateContent = useUpdatePageContent();
  const { data: heroData } = usePageContent('hero_settings');
  const [hero, setHero] = useState({ category_expanded: true, sticky_top_header: false, sticky_navbar: true, social_icons_enabled: true });
  const [init, setInit] = useState(false);

  if (!init && heroData !== undefined) {
    if (heroData && typeof heroData === 'object') setHero({ ...hero, ...(heroData as any) });
    setInit(true);
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      <h3 className="font-semibold text-foreground">Layout Controls</h3>
      {[
        { key: 'sticky_top_header', label: 'Sticky Top Header', desc: 'Keep the top header (logo + search) fixed when scrolling' },
        { key: 'sticky_navbar', label: 'Sticky Navigation Bar', desc: 'Keep the navigation bar fixed when scrolling' },
        { key: 'social_icons_enabled', label: 'Social Media Icons', desc: 'Show social media icons in the top header' },
      ].map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between">
          <div><p className="font-medium text-foreground">{label}</p><p className="text-sm text-muted-foreground">{desc}</p></div>
          <Switch checked={!!(hero as any)[key]} onCheckedChange={(v) => setHero({ ...hero, [key]: v })} />
        </div>
      ))}
      <Button onClick={() => { updateContent.mutate({ key: 'hero_settings', value: hero }); toast({ title: 'Layout settings saved!' }); }}>Save Layout Settings</Button>
    </div>
  );
};

export const HeaderFooterEditor = () => {
  const updateContent = useUpdatePageContent();
  const { data: headerData } = usePageContent('header_settings');
  const { data: footerData } = usePageContent('footer_settings');

  const { data: allCategories = [] } = useCategories();
  const [header, setHeader] = useState({ brand_name: '', tagline: '', description: '', search_placeholder: '', nav_links: [] as LinkItem[], header_category_ids: [] as string[], logo_height: 50, logo_width: 0, mobile_search_visible: true, top_bg_color: '', top_text_color: '', navbar_bg_color: '', navbar_text_color: '', icon_color: '', search_bg_color: '', search_text_color: '', search_border_color: '' });
  const [footer, setFooter] = useState({
    brand_name: '', tagline: '', description: '', copyright: '',
    address: '', phone: '', email: '',
    quick_links: [] as LinkItem[],
    policy_links: [] as LinkItem[],
    bg_color: '', text_color: '', heading_color: '', border_color: '',
  });
  const [init, setInit] = useState(false);

  if (!init && headerData !== undefined && footerData !== undefined) {
    const h = headerData && typeof headerData === 'object' ? headerData as any : {};
    setHeader({
      brand_name: h.brand_name || 'CommerceX',
      tagline: h.tagline || 'Premium Goods',
      description: h.description || '',
      search_placeholder: h.search_placeholder || 'Search products...',
      nav_links: Array.isArray(h.nav_links) ? h.nav_links : [
        { label: 'Home', path: '/' },
        { label: 'Products', path: '/products' },
        { label: 'Hot Deals', path: '/products?deals=true' },
        { label: 'Blog', path: '/blog' },
        { label: 'About', path: '/about' },
        { label: 'Contact', path: '/contact' },
      ],
      header_category_ids: Array.isArray(h.header_category_ids) ? h.header_category_ids : [],
      logo_height: typeof h.logo_height === 'number' ? h.logo_height : 50,
      logo_width: typeof h.logo_width === 'number' ? h.logo_width : 0,
      mobile_search_visible: h.mobile_search_visible !== false,
      top_bg_color: h.top_bg_color || '',
      top_text_color: h.top_text_color || '',
      navbar_bg_color: h.navbar_bg_color || '',
      navbar_text_color: h.navbar_text_color || '',
      icon_color: h.icon_color || '',
      search_bg_color: h.search_bg_color || '',
      search_text_color: h.search_text_color || '',
      search_border_color: h.search_border_color || '',
    });
    const f = footerData && typeof footerData === 'object' ? footerData as any : {};
    setFooter({
      brand_name: f.brand_name || 'CommerceX',
      tagline: f.tagline || 'Premium Goods',
      description: f.description || 'Your trusted partner for premium quality products.',
      copyright: f.copyright || '© 2026 CommerceX. All rights reserved.',
      address: f.address || '',
      phone: f.phone || '',
      email: f.email || '',
      quick_links: Array.isArray(f.quick_links) ? f.quick_links : [
        { label: 'About Us', path: '/about' },
        { label: 'Products', path: '/products' },
        { label: 'Blog', path: '/blog' },
        { label: 'Testimonials', path: '/testimonials' },
        { label: 'Contact Us', path: '/contact' },
      ],
      policy_links: Array.isArray(f.policy_links) ? f.policy_links : [
        { label: 'Privacy Policy', path: '/privacy-policy' },
        { label: 'Return Policy', path: '/return-policy' },
        { label: 'Terms & Conditions', path: '/terms' },
        { label: 'FAQ', path: '/faq' },
      ],
      bg_color: f.bg_color || '',
      text_color: f.text_color || '',
      heading_color: f.heading_color || '',
      border_color: f.border_color || '',
    });
    setInit(true);
  }

  const saveHeader = () => {
    updateContent.mutate({
      key: 'header_settings',
      value: {
        brand_name: header.brand_name,
        tagline: header.tagline,
        description: header.description,
        search_placeholder: header.search_placeholder,
        nav_links: header.nav_links,
        header_category_ids: header.header_category_ids,
        logo_height: header.logo_height,
        logo_width: header.logo_width,
        mobile_search_visible: header.mobile_search_visible,
        top_bg_color: header.top_bg_color || undefined,
        top_text_color: header.top_text_color || undefined,
        navbar_bg_color: header.navbar_bg_color || undefined,
        navbar_text_color: header.navbar_text_color || undefined,
        icon_color: header.icon_color || undefined,
        search_bg_color: header.search_bg_color || undefined,
        search_text_color: header.search_text_color || undefined,
        search_border_color: header.search_border_color || undefined,
      },
    });
    toast({ title: 'Header settings saved!' });
  };

  const saveFooter = () => {
    updateContent.mutate({
      key: 'footer_settings',
      value: {
        brand_name: footer.brand_name,
        tagline: footer.tagline,
        description: footer.description,
        copyright: footer.copyright,
        address: footer.address,
        phone: footer.phone,
        email: footer.email,
        quick_links: footer.quick_links,
        policy_links: footer.policy_links,
        bg_color: footer.bg_color || undefined,
        text_color: footer.text_color || undefined,
        heading_color: footer.heading_color || undefined,
        border_color: footer.border_color || undefined,
      },
    });
    toast({ title: 'Footer settings saved!' });
  };

  return (
    <div className="space-y-6">
      <LayoutControls />
      {/* Header Colors */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Header Colors</h3>
        <p className="text-sm text-muted-foreground">Set custom background and text colors for the top header and navigation bar. Leave empty to use default theme colors.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Top Header Background" value={header.top_bg_color || ''} onChange={(v) => setHeader({ ...header, top_bg_color: v })} description="Background color for the top header bar" />
          <ColorField label="Top Header Text" value={header.top_text_color || ''} onChange={(v) => setHeader({ ...header, top_text_color: v })} description="Text & icon color in top header" />
          <ColorField label="Navbar Background" value={header.navbar_bg_color || ''} onChange={(v) => setHeader({ ...header, navbar_bg_color: v })} description="Background color for the navigation bar" />
          <ColorField label="Navbar Text" value={header.navbar_text_color || ''} onChange={(v) => setHeader({ ...header, navbar_text_color: v })} description="Text & link color in the navbar" />
          <ColorField label="Icon Color (Cart/Login/Menu)" value={header.icon_color || ''} onChange={(v) => setHeader({ ...header, icon_color: v })} description="Color for cart, login, menu icons" />
          <ColorField label="Search Bar Background" value={header.search_bg_color || ''} onChange={(v) => setHeader({ ...header, search_bg_color: v })} description="Background color of the search input" />
          <ColorField label="Search Bar Text" value={header.search_text_color || ''} onChange={(v) => setHeader({ ...header, search_text_color: v })} description="Text & placeholder color in search" />
          <ColorField label="Search Bar Border" value={header.search_border_color || ''} onChange={(v) => setHeader({ ...header, search_border_color: v })} description="Border color of the search input" />
        </div>
        <Button size="sm" onClick={saveHeader}>Save Header</Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Header Settings</h3>
        <p className="text-sm text-muted-foreground">Brand name & tagline shown when no logo is uploaded.</p>
        <FormField label="Brand Name"><Input value={header.brand_name} onChange={(e) => setHeader({ ...header, brand_name: e.target.value })} placeholder="CommerceX" /></FormField>
        <FormField label="Tagline"><Input value={header.tagline} onChange={(e) => setHeader({ ...header, tagline: e.target.value })} placeholder="Premium Goods" /></FormField>
        <FormField label="Search Placeholder"><Input value={header.search_placeholder} onChange={(e) => setHeader({ ...header, search_placeholder: e.target.value })} placeholder="Search products..." /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Logo Height (px)" description="Default: 50px">
            <Input type="number" min={20} max={200} value={header.logo_height} onChange={(e) => setHeader({ ...header, logo_height: Number(e.target.value) })} />
          </FormField>
          <FormField label="Logo Width (px)" description="0 = auto width">
            <Input type="number" min={0} max={400} value={header.logo_width} onChange={(e) => setHeader({ ...header, logo_width: Number(e.target.value) })} />
          </FormField>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Mobile/Tablet Search Bar</p>
            <p className="text-xs text-muted-foreground">Show or hide the search bar on mobile & tablet</p>
          </div>
          <Switch checked={header.mobile_search_visible} onCheckedChange={(v) => setHeader({ ...header, mobile_search_visible: v })} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Header Categories</h3>
        <p className="text-sm text-muted-foreground">Select which categories appear in the "All Categories" dropdown. If none selected, all categories are shown.</p>
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {allCategories.map((cat: any) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm text-foreground cursor-pointer py-1">
              <Checkbox
                checked={header.header_category_ids.includes(cat.id)}
                onCheckedChange={(checked) => {
                  setHeader(prev => ({
                    ...prev,
                    header_category_ids: checked
                      ? [...prev.header_category_ids, cat.id]
                      : prev.header_category_ids.filter(id => id !== cat.id),
                  }));
                }}
              />
              {cat.name}
            </label>
          ))}
        </div>
        {allCategories.length === 0 && <p className="text-sm text-muted-foreground">No categories found.</p>}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Navigation Links</h3>
        <p className="text-sm text-muted-foreground">Add links from your website pages or custom URLs. Drag to reorder.</p>
        <LinkEditor value={header.nav_links} onChange={(links) => setHeader({ ...header, nav_links: links })} />
        <Button size="sm" onClick={saveHeader}>Save Header</Button>
      </div>

      {/* Footer Colors */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Footer Colors</h3>
        <p className="text-sm text-muted-foreground">Set custom background and text colors for the footer. Leave empty to use default theme colors.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Footer Background" value={footer.bg_color || ''} onChange={(v) => setFooter({ ...footer, bg_color: v })} description="Background color for the footer" />
          <ColorField label="Footer Text" value={footer.text_color || ''} onChange={(v) => setFooter({ ...footer, text_color: v })} description="Text & link color in the footer" />
          <ColorField label="Footer Heading Color" value={footer.heading_color || ''} onChange={(v) => setFooter({ ...footer, heading_color: v })} description="Section heading colors" />
          <ColorField label="Footer Border Color" value={footer.border_color || ''} onChange={(v) => setFooter({ ...footer, border_color: v })} description="Bottom border/divider color" />
        </div>
        <Button size="sm" onClick={saveFooter}>Save Footer</Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Footer Settings</h3>
        <FormField label="Brand Name"><Input value={footer.brand_name} onChange={(e) => setFooter({ ...footer, brand_name: e.target.value })} placeholder="CommerceX" /></FormField>
        <FormField label="Tagline"><Input value={footer.tagline} onChange={(e) => setFooter({ ...footer, tagline: e.target.value })} placeholder="Premium Goods" /></FormField>
        <FormField label="Description"><Textarea rows={3} value={footer.description} onChange={(e) => setFooter({ ...footer, description: e.target.value })} /></FormField>
        <FormField label="Copyright Text"><Input value={footer.copyright} onChange={(e) => setFooter({ ...footer, copyright: e.target.value })} placeholder="© 2026 Company. All rights reserved." /></FormField>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Footer Contact Info</h3>
        <FormField label="Address"><Textarea rows={2} value={footer.address} onChange={(e) => setFooter({ ...footer, address: e.target.value })} /></FormField>
        <FormField label="Phone"><Input value={footer.phone} onChange={(e) => setFooter({ ...footer, phone: e.target.value })} /></FormField>
        <FormField label="Email"><Input value={footer.email} onChange={(e) => setFooter({ ...footer, email: e.target.value })} /></FormField>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Footer Links</h3>
        <div className="space-y-4">
          <LinkEditor value={footer.quick_links} onChange={(links) => setFooter({ ...footer, quick_links: links })} title="Quick Links" />
          <div className="border-t border-border pt-4" />
          <LinkEditor value={footer.policy_links} onChange={(links) => setFooter({ ...footer, policy_links: links })} title="Policy Links" />
        </div>
        <Button size="sm" onClick={saveFooter}>Save Footer</Button>
      </div>
    </div>
  );
};
