import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const RichTextEditor = ({ value, onChange, placeholder = 'Write content...', minHeight = '200px' }: RichTextEditorProps) => {
  const [mode, setMode] = useState<'visual' | 'text'>('visual');
  const [textContent, setTextContent] = useState(value || '');
  const editorRef = useRef<HTMLDivElement>(null);
  const latestHtml = useRef(value || '');

  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = latestHtml.current;
    }
  }, [mode]);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const syncFromEditor = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      latestHtml.current = html;
      setTextContent(html);
      onChange(html);
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) execCmd('createLink', url);
  };

  const switchMode = (newMode: 'visual' | 'text') => {
    if (mode === 'visual' && editorRef.current) {
      const html = editorRef.current.innerHTML;
      latestHtml.current = html;
      setTextContent(html);
    }
    if (mode === 'text') {
      latestHtml.current = textContent;
      onChange(textContent);
    }
    setMode(newMode);
  };

  const handleTextChange = (val: string) => {
    setTextContent(val);
    latestHtml.current = val;
    onChange(val);
  };

  return (
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
            className="p-4 text-sm focus:outline-none bg-background prose prose-sm max-w-none"
            style={{ minHeight }}
            onBlur={syncFromEditor}
            onInput={syncFromEditor}
            suppressContentEditableWarning
            data-placeholder={placeholder}
          />
        </>
      ) : (
        <Textarea rows={12} value={textContent} onChange={e => handleTextChange(e.target.value)} placeholder="HTML কোড লিখুন..." className="border-0 rounded-none font-mono text-xs focus-visible:ring-0" />
      )}
    </div>
  );
};

export default RichTextEditor;
