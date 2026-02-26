import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePages } from '@/hooks/usePages';
import { Plus, Trash2, GripVertical, Link2, FileText } from 'lucide-react';

export interface LinkItem {
  label: string;
  path: string;
}

interface LinkEditorProps {
  value: LinkItem[];
  onChange: (links: LinkItem[]) => void;
  title?: string;
}

const SYSTEM_ROUTES = [
  { label: 'Home', path: '/' },
  { label: 'Products', path: '/products' },
  { label: 'Blog', path: '/blog' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
  { label: 'Testimonials', path: '/testimonials' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Hot Deals', path: '/products?deals=true' },
];

const POLICY_ROUTES = [
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Return Policy', path: '/return-policy' },
  { label: 'Terms & Conditions', path: '/terms' },
];

export const LinkEditor = ({ value, onChange, title }: LinkEditorProps) => {
  const { data: pages = [], refetch } = usePages();
  const [addMode, setAddMode] = useState<'page' | 'custom' | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customPath, setCustomPath] = useState('');

  // Refetch pages when dropdown opens to get latest data
  const handleOpenPageMode = () => {
    refetch();
    setAddMode('page');
  };

  const activeDynamicPages = pages.filter(p => !p.is_deleted);

  // Build dropdown options: system routes + dynamic pages, excluding already added
  const existingPaths = new Set(value.map(l => l.path));
  const allOptions = [
    ...SYSTEM_ROUTES,
    ...POLICY_ROUTES,
    ...activeDynamicPages
      .filter(p => !SYSTEM_ROUTES.some(sr => sr.path === `/${p.slug}`) && !POLICY_ROUTES.some(pr => pr.path === `/${p.slug}`))
      .map(p => ({ label: p.title, path: `/${p.slug}` })),
  ].filter(opt => !existingPaths.has(opt.path));

  const addFromPage = (path: string) => {
    const opt = allOptions.find(o => o.path === path);
    if (opt) {
      onChange([...value, { label: opt.label, path: opt.path }]);
    }
    setAddMode(null);
  };

  const addCustom = () => {
    if (!customLabel.trim() || !customPath.trim()) return;
    onChange([...value, { label: customLabel.trim(), path: customPath.trim() }]);
    setCustomLabel('');
    setCustomPath('');
    setAddMode(null);
  };

  const removeLink = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateLink = (idx: number, field: 'label' | 'path', val: string) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  };

  const moveLink = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= value.length) return;
    const updated = [...value];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}

      {/* Existing links */}
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No links added yet.</p>
      )}
      <div className="space-y-2">
        {value.map((link, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveLink(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
              <button type="button" onClick={() => moveLink(idx, 1)} disabled={idx === value.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={link.label}
              onChange={(e) => updateLink(idx, 'label', e.target.value)}
              className="flex-1 h-8 text-sm"
              placeholder="Label"
            />
            <Input
              value={link.path}
              onChange={(e) => updateLink(idx, 'path', e.target.value)}
              className="flex-1 h-8 text-sm font-mono"
              placeholder="/path"
            />
            <button type="button" onClick={() => removeLink(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new link */}
      {addMode === null && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleOpenPageMode}>
            <FileText className="h-4 w-4 mr-1" /> Add from Pages
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setAddMode('custom')}>
            <Link2 className="h-4 w-4 mr-1" /> Add Custom Link
          </Button>
        </div>
      )}

      {addMode === 'page' && (
        <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Select a page</p>
            <Select onValueChange={addFromPage}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose a page..." />
              </SelectTrigger>
              <SelectContent>
                {allOptions.length === 0 ? (
                  <SelectItem value="_none" disabled>All pages already added</SelectItem>
                ) : (
                  allOptions.map(opt => (
                    <SelectItem key={opt.path} value={opt.path}>
                      {opt.label} <span className="text-muted-foreground ml-1">({opt.path})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAddMode(null)}>Cancel</Button>
        </div>
      )}

      {addMode === 'custom' && (
        <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg border border-dashed border-border">
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">Label</p>
            <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. My Page" className="h-9" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">Path / URL</p>
            <Input value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="e.g. /my-page or https://..." className="h-9 font-mono" />
          </div>
          <Button type="button" size="sm" onClick={addCustom} disabled={!customLabel.trim() || !customPath.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAddMode(null)}>Cancel</Button>
        </div>
      )}
    </div>
  );
};
