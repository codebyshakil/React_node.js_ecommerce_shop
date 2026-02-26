import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Upload, Trash2, Copy, Search, Image, Check, Grid3X3, List, FilterX, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAdminContent, useUpdateAdminContent } from '@/hooks/useAdminSettings';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const getMediaUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/media/${path}`;

const getFileType = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  return 'other';
};

const getFileCategory = (name: string): 'image' | 'content' | 'document' => {
  const type = getFileType(name);
  if (type === 'image') return 'image';
  if (type === 'audio' || type === 'video') return 'content';
  return 'document';
};

const DEFAULT_ALLOWED_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp', 'mp3', 'wav', 'mp4', 'webm', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
const ALL_FILE_TYPES = [
  { ext: 'jpg', label: 'JPG', category: 'Image' },
  { ext: 'jpeg', label: 'JPEG', category: 'Image' },
  { ext: 'png', label: 'PNG', category: 'Image' },
  { ext: 'gif', label: 'GIF', category: 'Image' },
  { ext: 'webp', label: 'WebP', category: 'Image' },
  { ext: 'svg', label: 'SVG', category: 'Image' },
  { ext: 'ico', label: 'ICO', category: 'Image' },
  { ext: 'bmp', label: 'BMP', category: 'Image' },
  { ext: 'mp3', label: 'MP3', category: 'Audio' },
  { ext: 'wav', label: 'WAV', category: 'Audio' },
  { ext: 'ogg', label: 'OGG', category: 'Audio' },
  { ext: 'flac', label: 'FLAC', category: 'Audio' },
  { ext: 'mp4', label: 'MP4', category: 'Video' },
  { ext: 'webm', label: 'WebM', category: 'Video' },
  { ext: 'avi', label: 'AVI', category: 'Video' },
  { ext: 'mov', label: 'MOV', category: 'Video' },
  { ext: 'pdf', label: 'PDF', category: 'Document' },
  { ext: 'doc', label: 'DOC', category: 'Document' },
  { ext: 'docx', label: 'DOCX', category: 'Document' },
  { ext: 'txt', label: 'TXT', category: 'Document' },
  { ext: 'xls', label: 'XLS', category: 'Spreadsheet' },
  { ext: 'xlsx', label: 'XLSX', category: 'Spreadsheet' },
  { ext: 'csv', label: 'CSV', category: 'Spreadsheet' },
];

export const useMediaFiles = () => {
  return useQuery({
    queryKey: ['media-files'],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('media').list('', { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      return (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
    },
  });
};

interface MediaGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  multiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
}

export const MediaGalleryModal = ({ open, onOpenChange, onSelect, multiple, onSelectMultiple }: MediaGalleryModalProps) => {
  const queryClient = useQueryClient();
  const { data: files = [], isLoading } = useMediaFiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); }
    }
    queryClient.invalidateQueries({ queryKey: ['media-files'] });
    setUploading(false);
    toast({ title: `${fileList.length} file(s) uploaded` });
    e.target.value = '';
  };

  const toggleSelect = (url: string) => {
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url); else next.add(url);
    setSelectedUrls(next);
  };

  const confirmSelection = () => {
    if (multiple && onSelectMultiple) onSelectMultiple(Array.from(selectedUrls));
    setSelectedUrls(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelectedUrls(new Set()); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Media Gallery</DialogTitle></DialogHeader>
        <div className="flex items-center gap-3 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search media..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <label>
            <input type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv" multiple className="hidden" onChange={handleUpload} />
            <Button asChild variant="outline" disabled={uploading}>
              <span><Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading...' : 'Upload'}</span>
            </Button>
          </label>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading media...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground"><Image className="w-8 h-8 mx-auto mb-2 opacity-50" />No media files found.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
            {filtered.map((file) => {
              const url = getMediaUrl(file.name);
              const isSelected = selectedUrls.has(url);
              const type = getFileType(file.name);
              return (
                <button
                  key={file.name}
                  onClick={() => {
                    if (multiple) { toggleSelect(url); }
                    else { onSelect(url); onOpenChange(false); }
                  }}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden group transition-all hover:shadow-md ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                >
                  {type === 'image' ? (
                    <img src={url} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs uppercase font-semibold">{type}</div>
                  )}
                  {isSelected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><Check className="w-6 h-6 text-primary" /></div>}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{file.name}</div>
                </button>
              );
            })}
          </div>
        )}
        {multiple && selectedUrls.size > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
            <span className="text-sm text-muted-foreground">{selectedUrls.size} selected</span>
            <Button onClick={confirmSelection}>Add Selected</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ===================== Media Settings ===================== */
const MediaSettings = () => {
  const { data: settings } = useAdminContent('media_settings');
  const updateMutation = useUpdateAdminContent();
  const mediaSettings = (settings as any) || {};
  const allowedTypes: string[] = mediaSettings.allowed_types || DEFAULT_ALLOWED_TYPES;
  const maxFileSize: number = mediaSettings.max_file_size_mb || 5;
  const customExtensions: string[] = mediaSettings.custom_extensions || [];
  const [customExt, setCustomExt] = useState('');

  const save = (updated: any) => updateMutation.mutate({ key: 'media_settings', value: updated });

  const toggleType = (ext: string) => {
    const next = allowedTypes.includes(ext) ? allowedTypes.filter(t => t !== ext) : [...allowedTypes, ext];
    save({ ...mediaSettings, allowed_types: next });
  };

  const addCustomExt = () => {
    const ext = customExt.trim().toLowerCase().replace(/^\./, '');
    if (!ext) return;
    const nextCustom = [...customExtensions, ext];
    const nextAllowed = [...allowedTypes, ext];
    save({ ...mediaSettings, custom_extensions: nextCustom, allowed_types: nextAllowed });
    setCustomExt('');
  };

  const removeCustomExt = (ext: string) => {
    const nextCustom = customExtensions.filter(e => e !== ext);
    const nextAllowed = allowedTypes.filter(t => t !== ext);
    save({ ...mediaSettings, custom_extensions: nextCustom, allowed_types: nextAllowed });
  };

  const updateMaxSize = (size: number) => {
    save({ ...mediaSettings, max_file_size_mb: size });
  };

  const categories = [...new Set(ALL_FILE_TYPES.map(t => t.category))];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Allowed File Types</h3>
        {categories.map(cat => (
          <div key={cat} className="mb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_FILE_TYPES.filter(t => t.category === cat).map(t => (
                <label key={t.ext} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox checked={allowedTypes.includes(t.ext)} onCheckedChange={() => toggleType(t.ext)} />
                  <span className="text-sm">.{t.ext}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom extensions */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Custom Extensions</h3>
        <div className="flex gap-2 mb-2">
          <Input placeholder="e.g. psd" value={customExt} onChange={(e) => setCustomExt(e.target.value)} className="w-40" />
          <Button size="sm" onClick={addCustomExt}>Add</Button>
        </div>
        {customExtensions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customExtensions.map(ext => (
              <span key={ext} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">.{ext} <button onClick={() => removeCustomExt(ext)} className="text-destructive hover:text-destructive/80">×</button></span>
            ))}
          </div>
        )}
      </div>

      {/* Max file size */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Maximum Upload File Size</h3>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} max={50} value={maxFileSize} onChange={(e) => updateMaxSize(Number(e.target.value))} className="w-24" />
          <span className="text-sm text-muted-foreground">MB</span>
        </div>
      </div>
    </div>
  );
};

/* ===================== Media Grid for Tab ===================== */
const MediaGrid = ({ files, usedUrls, viewMode, queryClient, allowedTypes, maxFileSizeMb, canUpload = true, canDelete = true, can }: { files: any[]; usedUrls: Set<string>; viewMode: 'grid' | 'list'; queryClient: ReturnType<typeof useQueryClient>; allowedTypes: string[]; maxFileSizeMb: number; canUpload?: boolean; canDelete?: boolean; can?: (p: string) => boolean }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [files, searchQuery]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    if (can && !can('media_upload')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to upload media.', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedTypes.includes(ext)) {
        toast({ title: `File type .${ext} not allowed`, variant: 'destructive' });
        continue;
      }
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        toast({ title: `File exceeds ${maxFileSizeMb}MB limit`, variant: 'destructive' });
        continue;
      }
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(name, file);
      if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); }
    }
    queryClient.invalidateQueries({ queryKey: ['media-files'] });
    setUploading(false);
    toast({ title: 'Upload complete' });
    e.target.value = '';
  };

  const handleDelete = async (name: string) => {
    if (can && !can('media_delete')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to delete media.', variant: 'destructive' });
      setDeleteConfirm(null);
      return;
    }
    const url = getMediaUrl(name);
    if (usedUrls.has(url)) { toast({ title: 'Cannot delete', description: 'This file is currently in use.', variant: 'destructive' }); setDeleteConfirm(null); return; }
    const { error } = await supabase.storage.from('media').remove([name]);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { queryClient.invalidateQueries({ queryKey: ['media-files'] }); toast({ title: 'File deleted' }); }
    setDeleteConfirm(null);
  };

  const handleBulkDelete = async () => {
    if (can && !can('media_delete')) {
      toast({ title: 'You have no permission', description: 'You do not have permission to delete media.', variant: 'destructive' });
      setBulkDeleteConfirm(false);
      return;
    }
    const names = Array.from(selectedFiles);
    const inUse = names.filter(n => usedUrls.has(getMediaUrl(n)));
    if (inUse.length > 0) toast({ title: `${inUse.length} file(s) are in use and skipped`, variant: 'destructive' });
    const deletable = names.filter(n => !usedUrls.has(getMediaUrl(n)));
    if (deletable.length > 0) {
      const { error } = await supabase.storage.from('media').remove(deletable);
      if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      else { queryClient.invalidateQueries({ queryKey: ['media-files'] }); toast({ title: `${deletable.length} file(s) deleted` }); }
    }
    setSelectedFiles(new Set()); setBulkDeleteConfirm(false);
  };

  const copyUrl = (name: string) => { navigator.clipboard.writeText(getMediaUrl(name)); toast({ title: 'URL copied' }); };
  const toggleFileSelect = (name: string) => { const next = new Set(selectedFiles); if (next.has(name)) next.delete(name); else next.add(name); setSelectedFiles(next); };
  const toggleAll = () => { if (selectedFiles.size === filtered.length) setSelectedFiles(new Set()); else setSelectedFiles(new Set(filtered.map(f => f.name))); };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {canUpload && (
          <label>
            <input type="file" multiple className="hidden" onChange={handleUpload} />
            <Button asChild variant="outline" disabled={uploading}><span><Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading...' : 'Upload'}</span></Button>
          </label>
        )}
      </div>

      {canDelete && selectedFiles.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm font-medium">{selectedFiles.size} selected</span>
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)}><Trash2 className="w-3 h-3 mr-1" /> Delete Selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedFiles(new Set())}>Clear</Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">Showing <span className="font-semibold text-foreground">{filtered.length}</span> files</p>
        {filtered.length > 0 && <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">{selectedFiles.size === filtered.length ? 'Deselect All' : 'Select All'}</Button>}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground"><Image className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>No files found.</p></div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((file) => {
            const url = getMediaUrl(file.name);
            const isUsed = usedUrls.has(url);
            const isSelected = selectedFiles.has(file.name);
            const type = getFileType(file.name);
            return (
              <div key={file.name} className={`group relative rounded-lg border overflow-hidden bg-muted/30 transition-all ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}>
                <div className="absolute top-2 left-2 z-10"><Checkbox checked={isSelected} onCheckedChange={() => toggleFileSelect(file.name)} className="bg-background/80" /></div>
                <div className="aspect-square">
                  {type === 'image' ? <img src={url} alt={file.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase font-semibold bg-muted">{type}</div>}
                </div>
                <div className="p-2"><p className="text-xs text-muted-foreground truncate">{file.name}</p>{isUsed && <span className="text-[10px] text-emerald-600 font-semibold">In use</span>}</div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="w-7 h-7" onClick={() => copyUrl(file.name)}><Copy className="w-3 h-3" /></Button>
                  {canDelete && <Button size="icon" variant="secondary" className="w-7 h-7" onClick={() => setDeleteConfirm(file.name)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((file) => {
            const url = getMediaUrl(file.name);
            const isUsed = usedUrls.has(url);
            const isSelected = selectedFiles.has(file.name);
            const type = getFileType(file.name);
            return (
              <div key={file.name} className={`flex items-center gap-3 p-2 rounded-lg border transition-all hover:bg-muted/50 ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
                <Checkbox checked={isSelected} onCheckedChange={() => toggleFileSelect(file.name)} />
                <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                  {type === 'image' ? <img src={url} alt={file.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] uppercase text-muted-foreground">{type}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{type}</span>
                    {isUsed && <span className="text-[10px] text-emerald-600 font-semibold">In use</span>}
                    {file.created_at && <span className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => copyUrl(file.name)}><Copy className="w-3 h-3" /></Button>
                  {canDelete && <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setDeleteConfirm(file.name)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Media</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedFiles.size} Files</AlertDialogTitle><AlertDialogDescription>Files in use will be skipped. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete Selected</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ===================== Full Media Panel ===================== */
const MediaPanel = ({ can = () => true, isAdmin = false }: { can?: (p: string) => boolean; isAdmin?: boolean }) => {
  const queryClient = useQueryClient();
  const { data: files = [], isLoading } = useMediaFiles();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('image');

  const { data: mediaSettingsData } = useAdminContent('media_settings');
  const mediaSettings = (mediaSettingsData as any) || {};
  const allowedTypes: string[] = mediaSettings.allowed_types || DEFAULT_ALLOWED_TYPES;
  const maxFileSizeMb: number = mediaSettings.max_file_size_mb || 5;

  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: async () => { const { data } = await supabase.from('products').select('image_url, gallery'); return data ?? []; } });
  const { data: blogs = [] } = useQuery({ queryKey: ['admin-blogs'], queryFn: async () => { const { data } = await supabase.from('blog_posts').select('image_url'); return data ?? []; } });

  const usedUrls = useMemo(() => {
    const urls = new Set<string>();
    products.forEach((p: any) => { if (p.image_url) urls.add(p.image_url); if (Array.isArray(p.gallery)) p.gallery.forEach((g: string) => urls.add(g)); });
    blogs.forEach((b: any) => { if (b.image_url) urls.add(b.image_url); });
    return urls;
  }, [products, blogs]);

  const imageFiles = useMemo(() => files.filter(f => getFileCategory(f.name) === 'image'), [files]);
  const contentFiles = useMemo(() => files.filter(f => getFileCategory(f.name) === 'content'), [files]);
  const documentFiles = useMemo(() => files.filter(f => getFileCategory(f.name) === 'document'), [files]);

  const canUpload = can('media_upload');
  const canDelete = can('media_delete');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Media Library</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="image">Image ({imageFiles.length})</TabsTrigger>
          <TabsTrigger value="content">Content ({contentFiles.length})</TabsTrigger>
          <TabsTrigger value="document">Document ({documentFiles.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /> Settings</TabsTrigger>}
        </TabsList>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading media...</div>
        ) : (
          <>
            <TabsContent value="image">
              <div className="bg-card rounded-xl border border-border p-4">
                <MediaGrid files={imageFiles} usedUrls={usedUrls} viewMode={viewMode} queryClient={queryClient} allowedTypes={allowedTypes} maxFileSizeMb={maxFileSizeMb} canUpload={canUpload} canDelete={canDelete} can={can} />
              </div>
            </TabsContent>
            <TabsContent value="content">
              <div className="bg-card rounded-xl border border-border p-4">
                <MediaGrid files={contentFiles} usedUrls={usedUrls} viewMode={viewMode} queryClient={queryClient} allowedTypes={allowedTypes} maxFileSizeMb={maxFileSizeMb} canUpload={canUpload} canDelete={canDelete} can={can} />
              </div>
            </TabsContent>
            <TabsContent value="document">
              <div className="bg-card rounded-xl border border-border p-4">
                <MediaGrid files={documentFiles} usedUrls={usedUrls} viewMode={viewMode} queryClient={queryClient} allowedTypes={allowedTypes} maxFileSizeMb={maxFileSizeMb} canUpload={canUpload} canDelete={canDelete} can={can} />
              </div>
            </TabsContent>
            {isAdmin && (
              <TabsContent value="settings">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-lg font-display font-semibold mb-4">Media Settings</h2>
                  <MediaSettings />
                </div>
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
};

export default MediaPanel;
