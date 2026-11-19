import DOMPurify from 'dompurify';

// Embeds we allow in articles (video lessons, music players).
const ALLOWED_IFRAME_SRC =
  /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|open\.spotify\.com|w\.soundcloud\.com|codepen\.io)\//i;

let hooked = false;

/** Sanitise rendered article HTML before it is stored (keeps MathML, SVG and safe embeds). */
export function sanitize(html: string): string {
  if (!hooked) {
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
      if (data.tagName === 'iframe') {
        const el = node as Element;
        if (!ALLOWED_IFRAME_SRC.test(el.getAttribute('src') ?? '')) el.parentNode?.removeChild(el);
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true, svg: true },
    ADD_TAGS: ['iframe', 'figure', 'figcaption', 'annotation', 'semantics'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'loading', 'target', 'encoding', 'display'],
  });
}
