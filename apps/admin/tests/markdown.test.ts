import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { renderMarkdown, slugify } from '../src/lib/markdown.ts';

describe('renderMarkdown', () => {
  test('renders inline and display math as MathML', () => {
    const { html } = renderMarkdown('Pythagoras: $a^2 + b^2 = c^2$\n\n$$\n\\int_0^1 x\\,dx\n$$');
    assert.match(html, /<math[^>]*><semantics>/);
    assert.match(html, /<div class="math-display">.*display="block"/s);
  });

  test('does not treat prices as math', () => {
    const { html } = renderMarkdown('Coffee costs $5 and tea $3.');
    assert.ok(!html.includes('<math'));
    assert.match(html, /\$5 and tea \$3/);
  });

  test('turns GitHub-style alerts into callouts', () => {
    const { html } = renderMarkdown('> [!TIP]\n> Practise daily.');
    assert.match(html, /<blockquote class="callout callout-tip">/);
    assert.match(html, /<p class="callout-title">Tip<\/p>/);
    assert.ok(!html.includes('[!TIP]'));
  });

  test('renders ABC notation as a music figure the reader can draw', () => {
    const { html } = renderMarkdown('```abc\nX:1\nT:Scale\nK:C\nCDEF|\n```');
    assert.match(html, /<figure class="pm-music" data-abc="X:1\nT:Scale/);
    assert.match(html, /<figcaption>Scale<\/figcaption>/);
  });

  test('highlights code and wraps tables', () => {
    const { html } = renderMarkdown('```python\ndef f():\n    return 1\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    assert.match(html, /<pre class="hljs"><code class="language-python"><span class="hljs-keyword">def<\/span>/);
    assert.match(html, /<div class="table-wrap"><table>/);
  });

  test('anchors headings uniquely and builds a table of contents', () => {
    const { html, headings } = renderMarkdown('## Intro\n\ntext\n\n## Intro\n\n### Deep dive\n');
    assert.match(html, /<h2 id="intro">/);
    assert.match(html, /<h2 id="intro-1">/);
    assert.deepEqual(
      headings.map((h) => [h.id, h.level]),
      [
        ['intro', 2],
        ['intro-1', 2],
        ['deep-dive', 3],
      ],
    );
  });

  test('free preview stops at <!-- more -->', () => {
    const { previewHtml, html } = renderMarkdown('Teaser paragraph.\n\n<!-- more -->\n\n## Secret\n\nPaid part.');
    assert.match(previewHtml, /Teaser paragraph/);
    assert.ok(!previewHtml.includes('Paid part'));
    assert.match(html, /Paid part/);
  });

  test('automatic preview takes the opening paragraphs only', () => {
    const para = (n: number) => `Paragraph ${n} ` + 'word '.repeat(40);
    const { previewHtml } = renderMarkdown([1, 2, 3, 4, 5, 6].map(para).join('\n\n'));
    assert.match(previewHtml, /Paragraph 1/);
    assert.match(previewHtml, /Paragraph 2/);
    assert.ok(!previewHtml.includes('Paragraph 5'));
  });

  test('estimates reading time', () => {
    assert.equal(renderMarkdown('word '.repeat(600)).readingMinutes, 3);
    assert.equal(renderMarkdown('short').readingMinutes, 1);
  });

  test('applies the sanitizer when given', () => {
    const { html } = renderMarkdown('<script>alert(1)</script>Hello', {
      sanitize: (h) => h.replace(/<script>.*?<\/script>/g, ''),
    });
    assert.ok(!html.includes('<script>'));
  });
});

test('slugify', () => {
  assert.equal(slugify('The Circle of Fifths, Explained!'), 'the-circle-of-fifths-explained');
  assert.equal(slugify('Café — Crème brûlée'), 'cafe-creme-brulee');
});
