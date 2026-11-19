// Web build (used for previews): purchases are always simulated.
import type { CreditPack } from '@shared/types';

export type PlanPeriod = 'weekly' | 'monthly' | 'annual' | 'lifetime' | 'other';
export interface Plan {
  id: string;
  title: string;
  price: string;
  period: PlanPeriod;
  note?: string;
  badge?: string;
  pkg?: unknown;
}
export interface PackOffer {
  id: string;
  credits: number;
  price: string;
  badge?: string;
  product?: unknown;
}
export type PurchaseOutcome = 'purchased' | 'cancelled';

export const DEMO_PLANS: Plan[] = [
  { id: 'demo-annual', title: 'Yearly', price: '$39.99', period: 'annual', note: '$3.33 / month', badge: 'Save 33%' },
  { id: 'demo-monthly', title: 'Monthly', price: '$4.99', period: 'monthly', note: 'Cancel anytime' },
];

export const configurePurchases = (_appUserID: string | null) => {};
export const identify = async (_userId: string) => {};
export const storePremium = async () => false;
export const onPremiumChange = (_cb: (premium: boolean) => void) => () => {};
export const loadPlans = async () => DEMO_PLANS;
export const loadPacks = async (packs: CreditPack[]): Promise<PackOffer[]> =>
  packs.map((p) => ({ id: p.id, credits: p.credits, price: p.fallback_price, badge: p.badge }));
export const purchasePlan = async (_plan: Plan): Promise<PurchaseOutcome> => {
  throw new Error('Store purchases are not available on the web');
};
export const purchasePack = async (_offer: PackOffer): Promise<PurchaseOutcome> => {
  throw new Error('Store purchases are not available on the web');
};
export const restorePurchases = async () => false;
export const openSubscriptionManagement = () => {};
export const purchasesConfigured = () => false;
