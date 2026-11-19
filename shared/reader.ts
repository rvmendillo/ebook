/**
 * Builds the HTML document used to display an article — in the mobile app's WebView
 * and in the admin app's live phone preview — so both always look identical.
 * Dependency free on purpose.
 */

export type ReaderTheme = 'light' | 'dark' | 'sepia';

export interface ReaderOptions {
  html: string;
  theme?: ReaderTheme;
  /** 1 = default size. */
  fontScale?: number;
  /** Brand / category accent colour. */
  accent?: string;
  /** Restore scroll position (0..1). */
  initialProgress?: number;
  /** Optional header rendered above the body. */
  header?: { kicker?: string; title: string; meta?: string };
  /** Extra bottom padding (e.g. to clear a floating toolbar). */
  bottomInset?: number;
}

const ABCJS_SRC = 'https://cdn.jsdelivr.net/npm/abcjs@6.7.3/dist/abcjs-basic-min.js';
const ABCJS_SRI = 'sha384-7FwdlK0Td0gOOtFTcUymgFHmpCKEObB1/99Ddjh7jBsLNTJJWVUqZ90IDtMBQtdm';

const PALETTES: Record<ReaderTheme, Record<string, string>> = {
  light: {
    bg: '#FFFFFF',
    text: '#1F2333',
    muted: '#5E6478',
    border: '#E6E8F0',
    codeBg: '#F5F6FA',
    quoteBg: '#F7F7FC',
    tableHead: '#F3F4F9',
  },
  sepia: {
    bg: '#FBF5E9',
    text: '#3B2F22',
    muted: '#7A6A55',
    border: '#E8DCC6',
    codeBg: '#F3EAD7',
    quoteBg: '#F6EEDD',
    tableHead: '#F1E6D0',
  },
  dark: {
    bg: '#0F1222',
    text: '#E7E9F3',
    muted: '#A2A8BE',
    border: '#262B45',
    codeBg: '#171B31',
    quoteBg: '#151935',
    tableHead: '#1A1F3A',
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function readerCss(theme: ReaderTheme = 'light', accent = '#4F46E5', fontScale = 1): string {
  const p = PALETTES[theme];
  const dark = theme === 'dark';
  return `
:root{--bg:${p.bg};--text:${p.text};--muted:${p.muted};--border:${p.border};--code-bg:${p.codeBg};
--quote-bg:${p.quoteBg};--table-head:${p.tableHead};--accent:${accent};--fs:${(17 * fontScale).toFixed(2)}px}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 var(--fs)/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
-webkit-font-smoothing:antialiased;word-wrap:break-word;overflow-wrap:anywhere}
.pm-wrap{max-width:720px;margin:0 auto;padding:20px 20px 40px}
.pm-head{margin:4px 0 22px}
.pm-kicker{font-size:.72em;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.pm-title{font-size:1.75em;line-height:1.2;font-weight:800;letter-spacing:-.02em;margin:.3em 0 .35em}
.pm-meta{font-size:.82em;color:var(--muted)}
h1,h2,h3,h4{line-height:1.25;letter-spacing:-.01em;margin:1.6em 0 .55em;scroll-margin-top:16px}
h1{font-size:1.6em}h2{font-size:1.32em;font-weight:800}h3{font-size:1.12em;font-weight:700}h4{font-size:1em}
p,ul,ol,blockquote,table,pre,figure{margin:0 0 1.05em}
ul,ol{padding-left:1.3em}li{margin:.25em 0}li>p{margin:0}
a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
strong{font-weight:700}
hr{border:0;border-top:1px solid var(--border);margin:2em 0}
img,video,iframe{max-width:100%;height:auto;border-radius:12px}
iframe{width:100%;aspect-ratio:16/9;border:0}
audio{width:100%}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.86em;background:var(--code-bg);
padding:.12em .38em;border-radius:6px}
pre{background:var(--code-bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;overflow-x:auto;
-webkit-overflow-scrolling:touch;line-height:1.5}
pre code{background:none;padding:0;font-size:.82em;white-space:pre}
blockquote{margin-left:0;padding:.7em 1em;border-left:4px solid var(--accent);background:var(--quote-bg);border-radius:0 10px 10px 0}
blockquote>:last-child{margin-bottom:0}
.callout{border-left-width:4px}
.callout-title{font-weight:800;font-size:.8em;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.35em}
.callout-tip{border-left-color:#10B981}.callout-tip .callout-title{color:#10B981}
.callout-note{border-left-color:#3B82F6}.callout-note .callout-title{color:#3B82F6}
.callout-important{border-left-color:#8B5CF6}.callout-important .callout-title{color:#8B5CF6}
.callout-warning{border-left-color:#F59E0B}.callout-warning .callout-title{color:#D97706}
.callout-caution{border-left-color:#EF4444}.callout-caution .callout-title{color:#EF4444}
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 1.05em;border:1px solid var(--border);border-radius:12px}
.table-wrap table{margin:0}
table{border-collapse:collapse;width:100%;font-size:.9em}
.table-wrap th,.table-wrap td{border-width:0 0 1px 0}
.table-wrap tr:last-child td{border-bottom:0}
th,td{border:1px solid var(--border);padding:.45em .7em;text-align:left}
th{background:var(--table-head);font-weight:700}
.math-display{overflow-x:auto;overflow-y:hidden;padding:.3em 0;margin:0 0 1.05em;text-align:center}
math{font-family:"STIX Two Math","Cambria Math","Latin Modern Math",math;font-size:1.08em}
.math-display math{font-size:1.18em}
.pm-music{margin:0 0 1.2em;background:${dark ? '#F8F8FB' : 'transparent'};border-radius:12px;padding:${dark ? '8px' : '0'}}
.pm-music .abc-render svg{max-width:100%;height:auto}
.pm-music.rendered pre,.pm-music.rendered figcaption{display:none}
.pm-music figcaption{font-size:.8em;color:var(--muted);text-align:center}
${dark ? '.pm-music figcaption{color:#5E6478}' : ''}
.hljs{color:var(--text)}
.hljs-comment,.hljs-quote{color:${dark ? '#7C84A3' : '#6A737D'};font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-type{color:${dark ? '#C4A7FF' : '#7C3AED'}}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string{color:${dark ? '#7EE2B8' : '#047857'}}
.hljs-number,.hljs-symbol,.hljs-bullet,.hljs-variable,.hljs-template-variable{color:${dark ? '#FFC27A' : '#B45309'}}
.hljs-title,.hljs-section,.hljs-name,.hljs-selector-id,.hljs-selector-class{color:${dark ? '#8AB4FF' : '#1D4ED8'};font-weight:600}
.hljs-built_in,.hljs-params{color:${dark ? '#F3A8D0' : '#BE185D'}}
.hljs-attr,.hljs-property{color:${dark ? '#9ED0FF' : '#0369A1'}}
.hljs-deletion{color:#EF4444}
.hljs-meta{color:${dark ? '#A2A8BE' : '#64748B'}}
.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}
`;
}

/** Script injected into the page: progress reporting, heading jumps, music rendering. */
function readerScript(initialProgress: number): string {
  return `
(function(){
  function post(msg){
    try{
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(msg));}
      else if(window.parent&&window.parent!==window){window.parent.postMessage(Object.assign({source:'pm-reader'},msg),'*');}
    }catch(e){}
  }
  var ticking=false;
  function progress(){
    var h=document.documentElement;var max=h.scrollHeight-window.innerHeight;
    return max>0?Math.min(1,Math.max(0,window.scrollY/max)):1;
  }
  window.addEventListener('scroll',function(){
    if(ticking)return;ticking=true;
    setTimeout(function(){ticking=false;post({type:'progress',value:progress()});},250);
  },{passive:true});
  window.pmScrollTo=function(id){var el=document.getElementById(id);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});}};
  window.pmSetProgress=function(p){var h=document.documentElement;window.scrollTo(0,(h.scrollHeight-window.innerHeight)*p);};
  function renderMusic(){
    var nodes=document.querySelectorAll('.pm-music[data-abc]');
    if(!nodes.length||!window.ABCJS)return;
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];var target=n.querySelector('.abc-render');
      try{window.ABCJS.renderAbc(target,n.getAttribute('data-abc'),{responsive:'resize',add_classes:true});n.classList.add('rendered');}catch(e){}
    }
  }
  window.addEventListener('load',function(){
    renderMusic();
    var p=${Number.isFinite(initialProgress) ? initialProgress : 0};
    if(p>0.01){setTimeout(function(){window.pmSetProgress(p);},60);}
    post({type:'ready',height:document.documentElement.scrollHeight});
  });
})();`;
}

export function hasMusicNotation(html: string): boolean {
  return html.includes('class="pm-music"');
}

export function buildReaderDocument(opts: ReaderOptions): string {
  const theme = opts.theme ?? 'light';
  const css = readerCss(theme, opts.accent, opts.fontScale ?? 1);
  const music = hasMusicNotation(opts.html)
    ? `<script src="${ABCJS_SRC}" integrity="${ABCJS_SRI}" crossorigin="anonymous" defer></script>`
    : '';
  const header = opts.header
    ? `<header class="pm-head">${opts.header.kicker ? `<div class="pm-kicker">${escapeHtml(opts.header.kicker)}</div>` : ''}
<h1 class="pm-title">${escapeHtml(opts.header.title)}</h1>${opts.header.meta ? `<div class="pm-meta">${escapeHtml(opts.header.meta)}</div>` : ''}</header>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="${theme === 'dark' ? 'dark' : 'light'}">
<style>${css}</style>${music}</head>
<body><main class="pm-wrap" style="padding-bottom:${40 + (opts.bottomInset ?? 0)}px">${header}<article class="pm-article">${opts.html}</article></main>
<script>${readerScript(opts.initialProgress ?? 0)}</script></body></html>`;
}
