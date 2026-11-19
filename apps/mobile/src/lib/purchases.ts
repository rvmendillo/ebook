/**
 * Store purchases through RevenueCat (App Store + Google Play).
 *  - Subscription plans come from the "current" offering (entitlement: premium).
 *  - Credit packs are consumable products listed in the admin app's pricing settings.
 */
import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PRODUCT_CATEGORY,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

import type { CreditPack } from '@shared/types';

import { env, hasStore, revenueCatKey } from './env';

export type PlanPeriod = 'weekly' | 'monthly' | 'annual' | 'lifetime' | 'other';

export interface Plan {
  id: string;
  title: string;
  price: string;
  period: PlanPeriod;
  note?: string;
  badge?: string;
  pkg?: PurchasesPackage;
}

export interface PackOffer {
  id: string;
  credits: number;
  price: string;
  badge?: string;
  product?: PurchasesStoreProduct;
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

/** Shown in demo builds (no RevenueCat keys) so the paywall can still be tried. */
export const DEMO_PLANS: Plan[] = [
  { id: 'demo-annual', title: 'Yearly', price: '$39.99', period: 'annual', note: '$3.33 / month', badge: 'Save 33%' },
  { id: 'demo-monthly', title: 'Monthly', price: '$4.99', period: 'monthly', note: 'Cancel anytime' },
];

let configured = false;

export function configurePurchases(appUserID: string | null): void {
  if (!hasStore || configured) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.INFO : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: revenueCatKey, appUserID: appUserID ?? undefined });
  configured = true;
}

export async function identify(userId: string): Promise<void> {
  if (!configured) return;
  const current = await Purchases.getAppUserID();
  if (current !== userId) await Purchases.logIn(userId);
}

export const hasPremium = (info: CustomerInfo) => Boolean(info.entitlements.active[env.entitlement]);

export async function storePremium(): Promise<boolean> {
  if (!configured) return false;
  return hasPremium(await Purchases.getCustomerInfo());
}

export function onPremiumChange(cb: (premium: boolean) => void): () => void {
  if (!configured) return () => {};
  const listener = (info: CustomerInfo) => cb(hasPremium(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

function periodOf(type: PACKAGE_TYPE): PlanPeriod {
  switch (type) {
    case PACKAGE_TYPE.WEEKLY:
      return 'weekly';
    case PACKAGE_TYPE.MONTHLY:
      return 'monthly';
    case PACKAGE_TYPE.ANNUAL:
      return 'annual';
    case PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    default:
      return 'other';
  }
}

const PERIOD_TITLE: Record<PlanPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  annual: 'Yearly',
  lifetime: 'Lifetime',
  other: 'Premium',
};

export async function loadPlans(): Promise<Plan[]> {
  if (!configured) return DEMO_PLANS;
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const monthly = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY)?.product.price;
  const order: PlanPeriod[] = ['annual', 'monthly', 'weekly', 'lifetime', 'other'];
  return packages
    .map((pkg): Plan => {
      const period = periodOf(pkg.packageType);
      const p = pkg.product;
      let badge: string | undefined;
      let note: string | undefined;
      if (period === 'annual' && p.pricePerMonthString) note = `${p.pricePerMonthString} / month`;
      if (period === 'annual' && monthly && p.price > 0) {
        const saving = Math.round((1 - p.price / (monthly * 12)) * 100);
        if (saving >= 5) badge = `Save ${saving}%`;
      }
      if (period === 'monthly') note = 'Cancel anytime';
      if (period === 'lifetime') note = 'Pay once, keep forever';
      return { id: pkg.identifier, title: PERIOD_TITLE[period], price: p.priceString, period, note, badge, pkg };
    })
    .sort((a, b) => order.indexOf(a.period) - order.indexOf(b.period));
}

export async function loadPacks(packs: CreditPack[]): Promise<PackOffer[]> {
  if (!configured) return packs.map((p) => ({ id: p.id, credits: p.credits, price: p.fallback_price, badge: p.badge }));
  const products = await Purchases.getProducts(
    packs.map((p) => p.id),
    PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  );
  const byId = new Map(products.map((p) => [p.identifier, p]));
  return packs
    .filter((p) => byId.has(p.id))
    .map((p) => ({
      id: p.id,
      credits: p.credits,
      badge: p.badge,
      price: byId.get(p.id)!.priceString,
      product: byId.get(p.id),
    }));
}

function cancelled(error: unknown): boolean {
  const e = error as { code?: string; userCancelled?: boolean | null };
  return e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || e?.userCancelled === true;
}

export async function purchasePlan(plan: Plan): Promise<PurchaseOutcome> {
  if (!plan.pkg) throw new Error('Plan is not available in the store');
  try {
    await Purchases.purchasePackage(plan.pkg);
    return 'purchased';
  } catch (error) {
    if (cancelled(error)) return 'cancelled';
    throw error;
  }
}

export async function purchasePack(offer: PackOffer): Promise<PurchaseOutcome> {
  if (!offer.product) throw new Error('Credit pack is not available in the store');
  try {
    await Purchases.purchaseStoreProduct(offer.product);
    return 'purchased';
  } catch (error) {
    if (cancelled(error)) return 'cancelled';
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  return hasPremium(await Purchases.restorePurchases());
}

export function openSubscriptionManagement(): void {
  void Linking.openURL(
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions',
  );
}

export const purchasesConfigured = () => configured;
