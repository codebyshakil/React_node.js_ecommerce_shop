import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { MediaGalleryModal } from './MediaPanel';
import { ImageIcon, Upload, Link, X, FolderOpen, Loader2, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImagePicker = ({ value, onChange, label, placeholder = 'https://...', className }: ImagePickerProps) => {
  const queryClient = useQueryClient();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'preview' | 'input'>('preview');
  const [fileInfo, setFileInfo] = useState<string>('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${formatSize(MAX_FILE_SIZE)}. Your file is ${formatSize(file.size)}.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file.', variant: 'destructive' });
      e.target.value = '';
      return;
    }

    setUploading(true);
    setProgress(0);
    setFileInfo(`${file.name} (${formatSize(file.size)})`);

    // Simulate progress since Supabase SDK doesn't expose upload progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 200);

    const ext = file.name.split('.').pop();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(name, file);

    clearInterval(progressInterval);

    if (error) {
      setProgress(0);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setUploading(false);
      setFileInfo('');
      e.target.value = '';
      return;
    }

    setProgress(100);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media/${name}`;
    queryClient.invalidateQueries({ queryKey: ['media-files'] });
    onChange(url);

    setTimeout(() => {
      setUploading(false);
      setProgress(0);
      setFileInfo('');
    }, 800);

    toast({ title: 'Image uploaded successfully!' });
    e.target.value = '';
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {/* Preview */}
        {value ? (
          <div className="relative w-16 h-16 rounded-lg border border-border overflow-hidden shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange('')}
              className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setGalleryOpen(true)} className="text-xs" disabled={uploading}>
              <FolderOpen className="w-3 h-3 mr-1" />Gallery
            </Button>
            <label>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              <Button type="button" variant="outline" size="sm" asChild disabled={uploading} className="text-xs">
                <span>
                  {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  {uploading ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === 'input' ? 'preview' : 'input')}
              className="text-xs"
              disabled={uploading}
            >
              <Link className="w-3 h-3 mr-1" />URL
            </Button>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[180px]">{fileInfo}</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {mode === 'input' && !uploading && (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="text-xs h-7"
            />
          )}
        </div>
      </div>

      <MediaGalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={(url) => { onChange(url); setGalleryOpen(false); }}
      />
    </div>
  );
};

export default ImagePicker;
