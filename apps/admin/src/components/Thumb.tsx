import type { Category, Content } from '../../../../shared/types';

export function Thumb({ content, category }: { content: Pick<Content, 'cover_url'>; category?: Category }) {
  const color = category?.color ?? '#4F46E5';
  if (content.cover_url) {
    return <div className="thumb" style={{ backgroundImage: `url(${JSON.stringify(content.cover_url)})` }} />;
  }
  return (
    <div className="thumb" style={{ background: `linear-gradient(135deg, ${color}, #1e1b4b)` }} aria-hidden>
      {category?.icon ?? '✦'}
    </div>
  );
}
