import { useRef, type ChangeEvent } from 'react';

interface Snippet {
  label: string;
  title: string;
  /** Text inserted around the selection: [before, after]; `$SEL` placeholder default. */
  wrap?: [string, string];
  block?: string;
}

const SNIPPETS: (Snippet | 'sep')[] = [
  { label: 'H2', title: 'Section heading', block: '## Section title\n' },
  { label: 'H3', title: 'Sub-heading', block: '### Sub-heading\n' },
  { label: 'B', title: 'Bold (Ctrl/Cmd+B)', wrap: ['**', '**'] },
  { label: 'I', title: 'Italic (Ctrl/Cmd+I)', wrap: ['_', '_'] },
  { label: '🔗', title: 'Link', wrap: ['[', '](https://)'] },
  'sep',
  { label: '• List', title: 'Bulleted list', block: '- First\n- Second\n- Third\n' },
  { label: '1. List', title: 'Numbered list', block: '1. First\n2. Second\n3. Third\n' },
  { label: '⊞ Table', title: 'Table', block: '| Column | Column |\n|---|---|\n| Value | Value |\n' },
  { label: '💡 Tip', title: 'Tip callout', block: '> [!TIP]\n> Your tip here.\n' },
  { label: '⚠ Warn', title: 'Warning callout', block: '> [!WARNING]\n> Be careful here.\n' },
  'sep',
  { label: '∑ Inline', title: 'Inline math', wrap: ['$', '$'] },
  { label: '∑ Block', title: 'Display math', block: '$$\n\\frac{a}{b} = \\sqrt{x^2 + y^2}\n$$\n' },
  { label: '</> Code', title: 'Code block', block: '```python\nprint("Hello, world!")\n```\n' },
  {
    label: '♪ Music',
    title: 'Sheet music (ABC notation)',
    block: '```abc\nX:1\nT:Melody\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |]\n```\n',
  },
  {
    label: '▶ Video',
    title: 'YouTube embed',
    block: '<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" allowfullscreen></iframe>\n',
  },
  'sep',
  { label: '✂ Preview ends', title: 'Everything above this line is the free preview', block: '<!-- more -->\n' },
];

export function MarkdownEditor({
  value,
  onChange,
  onUploadImage,
}: {
  value: string;
  onChange: (v: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const insert = (s: Snippet | { block: string }) => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const selected = value.slice(a, b);
    let text: string;
    let cursor: number;
    if ('wrap' in s && s.wrap) {
      text = `${s.wrap[0]}${selected || 'text'}${s.wrap[1]}`;
      cursor = a + text.length;
    } else {
      const before = value.slice(0, a);
      const prefix = before.length && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
      text = `${prefix}${s.block}`;
      cursor = a + text.length;
    }
    const next = value.slice(0, a) + text + value.slice(b);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === 'b') {
      e.preventDefault();
      insert({ label: 'B', title: '', wrap: ['**', '**'] } as Snippet);
    } else if (e.key === 'i') {
      e.preventDefault();
      insert({ label: 'I', title: '', wrap: ['_', '_'] } as Snippet);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const url = await onUploadImage(f);
    insert({ block: `![${f.name.replace(/\.[^.]+$/, '')}](${url})\n` });
  };

  return (
    <div>
      <div className="toolbar" role="toolbar" aria-label="Formatting">
        {SNIPPETS.map((s, i) =>
          s === 'sep' ? (
            <span key={`sep-${i}`} className="sep" />
          ) : (
            <button key={s.label} type="button" title={s.title} onClick={() => insert(s)}>
              {s.label}
            </button>
          ),
        )}
        <button type="button" title="Upload an image" onClick={() => file.current?.click()}>
          🖼 Image
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      <textarea
        ref={area}
        className="code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck
        aria-label="Article body (Markdown)"
        placeholder="Write in Markdown. Use the toolbar for math, code, music notation and callouts."
      />
    </div>
  );
}
