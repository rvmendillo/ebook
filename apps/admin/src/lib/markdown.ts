/**
 * Markdown → HTML for Polymath content.
 *
 * Extras on top of CommonMark + GFM tables:
 *   $inline$ and $$display$$ LaTeX       → MathML (KaTeX, no fonts/JS needed in the app)
 *   ```python … ``` fenced code          → highlight.js markup
 *   ```abc … ``` music notation          → rendered as sheet music by abcjs in the reader
 *   > [!TIP] / [!NOTE] / [!WARNING] …    → callout boxes
 *   <!-- more -->                        → explicit end of the free preview
 *
 * Runs in the browser (admin app) and in Node (scripts/build-content.ts).
 */
import MarkdownIt from 'markdown-it';
import type { StateBlock, StateCore, StateInline, Token } from 'markdown-it';
import katex from 'katex';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dart from 'highlight.js/lib/languages/dart';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdownLang from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import type { Heading } from '../../../../shared/types.ts';

type MD = InstanceType<typeof MarkdownIt>;

const LANGUAGES = {
  bash, c, cpp, csharp, css, dart, go, java, javascript, json, kotlin,
  markdown: markdownLang, php, plaintext, python, ruby, rust, sql, swift, typescript, xml, yaml,
};
for (const [name, lang] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, lang);
hljs.registerAliases(['js', 'jsx', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['sh', 'shell', 'zsh', 'console'], { languageName: 'bash' });
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['kt'], { languageName: 'kotlin' });
hljs.registerAliases(['rs'], { languageName: 'rust' });
hljs.registerAliases(['cs'], { languageName: 'csharp' });
hljs.registerAliases(['md'], { languageName: 'markdown' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['text', 'txt'], { languageName: 'plaintext' });

export interface RenderResult {
  html: string;
  previewHtml: string;
  headings: Heading[];
  words: number;
  readingMinutes: number;
}

export interface RenderOptions {
  /** HTML sanitizer (DOMPurify in the browser). */
  sanitize?: (html: string) => string;
  /** Approximate words in the free preview when no <!-- more --> marker is present. */
  previewWords?: number;
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function tex(src: string, displayMode: boolean): string {
  try {
    return katex.renderToString(src, { displayMode, output: 'mathml', throwOnError: false, strict: 'ignore' });
  } catch {
    return `<code>${escapeHtml(src)}</code>`;
  }
}

// ---------------------------------------------------------------------------
// Math syntax
// ---------------------------------------------------------------------------
const DOLLAR = 0x24;
const BACKSLASH = 0x5c;

function mathInline(state: StateInline, silent: boolean): boolean {
  const { src } = state;
  const start = state.pos;
  if (src.charCodeAt(start) !== DOLLAR) return false;
  const double = src.charCodeAt(start + 1) === DOLLAR;
  const delim = double ? '$$' : '$';
  const from = start + delim.length;
  if (!double) {
    const next = src.charCodeAt(from);
    if (Number.isNaN(next) || next === 0x20 || next === 0x09 || next === 0x0a) return false;
  }
  let end = from;
  for (;;) {
    end = src.indexOf(delim, end);
    if (end === -1) return false;
    let slashes = 0;
    for (let k = end - 1; k >= from && src.charCodeAt(k) === BACKSLASH; k--) slashes++;
    if (slashes % 2 === 0) break;
    end += delim.length;
  }
  if (end === from) return false;
  if (!double) {
    const before = src.charCodeAt(end - 1);
    if (before === 0x20 || before === 0x09 || before === 0x0a) return false;
    const after = src.charCodeAt(end + 1);
    if (after >= 0x30 && after <= 0x39) return false; // "$5 and $10" is money, not math
  }
  if (!silent) {
    const token = state.push(double ? 'math_inline_display' : 'math_inline', 'math', 0);
    token.markup = delim;
    token.content = src.slice(from, end);
  }
  state.pos = end + delim.length;
  return true;
}

function mathBlock(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  if (pos + 2 > max || state.src.slice(pos, pos + 2) !== '$$') return false;
  if (silent) return true;
  pos += 2;
  const first = state.src.slice(pos, max).trim();
  let content: string;
  let last = startLine;
  if (first.endsWith('$$')) {
    content = first.slice(0, -2);
  } else {
    const lines = [first];
    let closed = false;
    for (last = startLine + 1; last < endLine; last++) {
      pos = state.bMarks[last] + state.tShift[last];
      max = state.eMarks[last];
      if (pos < max && state.sCount[last] < state.blkIndent) break;
      const line = state.src.slice(pos, max).trim();
      if (line.endsWith('$$')) {
        lines.push(line.slice(0, -2));
        closed = true;
        break;
      }
      lines.push(line);
    }
    if (!closed) return false;
    content = lines.join('\n');
  }
  state.line = last + 1;
  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = content.trim();
  token.markup = '$$';
  token.map = [startLine, state.line];
  return true;
}

// ---------------------------------------------------------------------------
// Callouts, heading anchors
// ---------------------------------------------------------------------------
const CALLOUTS: Record<string, string> = {
  tip: 'Tip',
  note: 'Note',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

function callouts(state: StateCore): void {
  const { tokens } = state;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'blockquote_open') continue;
    const inline = tokens[i + 2];
    if (tokens[i + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') continue;
    const match = /^\[!(tip|note|important|warning|caution)\][ \t]*/i.exec(inline.content);
    if (!match) continue;
    const kind = match[1].toLowerCase();
    tokens[i].attrJoin('class', `callout callout-${kind}`);
    inline.content = inline.content.slice(match[0].length);
    const children = inline.children ?? [];
    if (children[0]?.type === 'text') {
      children[0].content = children[0].content.replace(/^\[!\w+\][ \t]*/, '');
      if (children[0].content === '' && children[1]?.type === 'softbreak') children.splice(0, 2);
    }
    const title = new state.Token('html_block', '', 0);
    title.content = `<p class="callout-title">${CALLOUTS[kind]}</p>\n`;
    tokens.splice(i + 1, 0, title);
  }
}

function headingAnchors(state: StateCore): void {
  const used = new Map<string, number>();
  const headings: Heading[] = [];
  const { tokens } = state;
  for (let i = 0; i < tokens.length; i++) {
    const open = tokens[i];
    if (open.type !== 'heading_open') continue;
    const inline = tokens[i + 1];
    const text = (inline.children ?? [])
      .filter((t) => t.type === 'text' || t.type === 'code_inline' || t.type === 'math_inline')
      .map((t) => t.content)
      .join('')
      .trim();
    let id = slugify(text) || 'section';
    const seen = used.get(id) ?? 0;
    used.set(id, seen + 1);
    if (seen) id = `${id}-${seen}`;
    open.attrSet('id', id);
    const level = Number(open.tag.slice(1));
    if (level === 2 || level === 3) headings.push({ id, text, level });
  }
  state.env.headings = headings;
}

// ---------------------------------------------------------------------------
// The renderer
// ---------------------------------------------------------------------------
export function createMarkdown(): MD {
  const md: MD = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code: string, lang: string): string {
      const name = lang && hljs.getLanguage(lang) ? lang : '';
      if (!name) return '';
      const value = hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
      return `<pre class="hljs"><code class="language-${escapeHtml(name)}">${value}</code></pre>`;
    },
  });

  md.block.ruler.before('fence', 'math_block', mathBlock, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
  md.inline.ruler.after('escape', 'math_inline', mathInline);
  md.core.ruler.push('pm_callouts', callouts);
  md.core.ruler.push('pm_heading_anchors', headingAnchors);

  md.renderer.rules.math_inline = (tokens, idx) => tex(tokens[idx].content, false);
  md.renderer.rules.math_inline_display = (tokens, idx) =>
    `<span class="math-display" style="display:block">${tex(tokens[idx].content, true)}</span>`;
  md.renderer.rules.math_block = (tokens, idx) => `<div class="math-display">${tex(tokens[idx].content, true)}</div>\n`;

  const fence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    if (lang === 'abc') {
      const src = token.content;
      const title = /^T:(.*)$/m.exec(src)?.[1]?.trim();
      return (
        `<figure class="pm-music" data-abc="${escapeHtml(src)}"><div class="abc-render"></div>` +
        `<pre><code>${escapeHtml(src)}</code></pre>` +
        (title ? `<figcaption>${escapeHtml(title)}</figcaption>` : '') +
        '</figure>\n'
      );
    }
    if (lang === 'math' || lang === 'latex' || lang === 'tex') {
      return `<div class="math-display">${tex(token.content, true)}</div>\n`;
    }
    return fence(tokens, idx, options, env, self);
  };

  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';

  const image = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('loading', 'lazy');
    return image(tokens, idx, options, env, self);
  };

  return md;
}

let shared: MD | null = null;

function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

/** Top-level block boundaries: [startIndex, endIndexExclusive). */
function topLevelBlocks(tokens: Token[]): Array<[number, number]> {
  const blocks: Array<[number, number]> = [];
  let depth = 0;
  let start = 0;
  tokens.forEach((t, i) => {
    if (depth === 0) start = i;
    depth += t.nesting;
    if (depth === 0) blocks.push([start, i + 1]);
  });
  return blocks;
}

export function renderMarkdown(source: string, options: RenderOptions = {}): RenderResult {
  shared ??= createMarkdown();
  const md = shared;
  const env: { headings?: Heading[] } = {};
  const tokens = md.parse(source, env);

  let words = 0;
  for (const t of tokens) {
    if (t.type === 'inline' || t.type === 'fence' || t.type === 'code_block') words += countWords(t.content);
  }

  // Free preview: up to an explicit <!-- more --> marker, else the first ~N words.
  const marker = tokens.findIndex((t) => t.type === 'html_block' && /<!--\s*more\s*-->/i.test(t.content));
  let cut = tokens.length;
  if (marker >= 0) {
    cut = marker;
  } else {
    const target = options.previewWords ?? 80;
    let seen = 0;
    const blocks = topLevelBlocks(tokens);
    for (let b = 0; b < blocks.length; b++) {
      const [from, to] = blocks[b];
      for (let i = from; i < to; i++) if (tokens[i].type === 'inline') seen += countWords(tokens[i].content);
      cut = to;
      if (seen >= target || b >= 3) break;
    }
    // Don't end a preview on a dangling heading.
    const blocksInPreview = topLevelBlocks(tokens.slice(0, cut));
    const lastBlock = blocksInPreview[blocksInPreview.length - 1];
    if (lastBlock && tokens[lastBlock[0]]?.type === 'heading_open' && blocksInPreview.length > 1) cut = lastBlock[0];
  }

  const sanitize = options.sanitize ?? ((h: string) => h);
  const html = sanitize(md.renderer.render(tokens, md.options, env));
  const previewHtml = cut >= tokens.length && marker < 0 ? html : sanitize(md.renderer.render(tokens.slice(0, cut), md.options, env));

  return {
    html,
    previewHtml,
    headings: env.headings ?? [],
    words,
    readingMinutes: Math.max(1, Math.round(words / 200)),
  };
}
