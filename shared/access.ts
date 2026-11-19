import type { AdGate, ContentAccess } from './types';

export type AccessDecision =
  | { state: 'open'; via: 'free' | 'premium' | 'unlock' | 'ad-pass' }
  | { state: 'ad'; gate: Exclude<AdGate, 'off'> }
  | { state: 'paywall'; price: number | null };

export interface AccessInput {
  access: ContentAccess;
  priceCredits: number | null;
  isPremium: boolean;
  isUnlocked: boolean;
  hasAdPass: boolean;
  adGate: AdGate;
}

/**
 * The monetisation rules in one place:
 *  - Premium subscribers read everything, ad-free.
 *  - Premium items need a subscription, or can be owned with credits (pay on demand).
 *  - Free items are free… after an ad (unless ads are switched off in the admin app).
 */
export function decideAccess(i: AccessInput): AccessDecision {
  if (i.isPremium) return { state: 'open', via: 'premium' };
  if (i.access === 'premium') {
    return i.isUnlocked ? { state: 'open', via: 'unlock' } : { state: 'paywall', price: i.priceCredits };
  }
  if (i.adGate === 'off') return { state: 'open', via: 'free' };
  if (i.hasAdPass) return { state: 'open', via: 'ad-pass' };
  return { state: 'ad', gate: i.adGate };
}

/** Is a stored ad pass (epoch ms when it was earned) still valid? */
export function adPassValid(earnedAt: number | undefined, unlockHours: number, now = Date.now()): boolean {
  if (!earnedAt) return false;
  return now - earnedAt < Math.max(0, unlockHours) * 3_600_000;
}
