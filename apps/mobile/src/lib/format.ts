import { KIND_LABELS, type Content } from '@shared/types';

export function readingTime(minutes: number): string {
  return `${Math.max(1, minutes)} min read`;
}

export function kindLabel(content: Pick<Content, 'kind'>): string {
  return KIND_LABELS[content.kind] ?? 'Article';
}

export function relativeDate(iso: string | null): string {
  if (!iso) return '';
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function credits(n: number): string {
  return `${n} credit${n === 1 ? '' : 's'}`;
}
