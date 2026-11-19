import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand';
import { Icon } from '@/components/icon';
import { Badge, Button, T } from '@/components/ui';
import { credits as creditsLabel } from '@/lib/format';
import { loadPacks, loadPlans, type PackOffer, type Plan } from '@/lib/purchases';
import { useApp, useCatalog } from '@/state/app-state';
import { brand, radius, space, usePalette } from '@/theme';

export default function PaywallScreen() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const app = useApp();
  const { config, byId } = useCatalog();
  const params = useLocalSearchParams<{ focus?: string; contentId?: string }>();
  const target = params.contentId ? byId.get(params.contentId) : undefined;
  const packsConfig = config?.pricing.credit_packs ?? [];

  const plans = useQuery({ queryKey: ['plans'], queryFn: loadPlans });
  const packs = useQuery({
    queryKey: ['packs', packsConfig.map((p) => p.id).join(',')],
    queryFn: () => loadPacks(packsConfig),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const plan: Plan | undefined = plans.data?.find((p) => p.id === selected) ?? plans.data?.[0];

  const fail = (error: unknown) =>
    Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Please try again in a moment.');

  const subscribe = async () => {
    if (!plan) return;
    setBusy('plan');
    try {
      const outcome = await app.buyPlan(plan);
      if (outcome === 'purchased') {
        router.back();
        Alert.alert('Welcome to Premium ✨', 'Every ebook, tutorial and tip is now open — and ads are gone.');
      }
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const buyPack = async (offer: PackOffer) => {
    setBusy(offer.id);
    try {
      const outcome = await app.buyPack(offer);
      if (outcome !== 'purchased') return;
      if (target?.price_credits) {
        const result = await app.unlock(target);
        if (result.ok) {
          router.back();
          return;
        }
      }
      Alert.alert('Credits added', `${creditsLabel(offer.credits)} added to your balance.`);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const premium = await app.restore();
      Alert.alert(
        premium ? 'Purchases restored' : 'Nothing to restore',
        premium ? 'Premium is active again.' : 'We couldn’t find an active subscription for this account.',
      );
      if (premium) router.back();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const paywall = config?.paywall;
  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        <LinearGradient
          colors={[brand.night, brand.indigoDeep, brand.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? space.xl : insets.top + space.lg }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            onPress={() => router.back()}
            style={[styles.close, { top: Platform.OS === 'ios' ? space.lg : insets.top + space.sm }]}>
            <Icon name="close" size={18} color="#FFFFFF" />
          </Pressable>
          <Logo size={64} />
          <T variant="display" color="#FFFFFF" style={{ textAlign: 'center' }}>
            {target ? `Unlock “${target.title}”` : paywall?.headline}
          </T>
          <T variant="body" color="rgba(255,255,255,0.85)" style={{ textAlign: 'center' }}>
            {paywall?.subheadline}
          </T>
          <View style={styles.benefits}>
            {(paywall?.benefits ?? []).map((b) => (
              <View key={b} style={styles.benefit}>
                <Icon name="check" size={18} color={brand.amberSoft} />
                <T variant="body" color="#FFFFFF" style={{ flex: 1 }}>
                  {b}
                </T>
              </View>
            ))}
          </View>
        </LinearGradient>

        {app.simulatedStore ? (
          <View style={[styles.demo, { backgroundColor: p.surfaceAlt }]}>
            <Icon name="info" size={16} color={p.primary} />
            <T variant="caption" muted style={{ flex: 1 }}>
              Demo build — purchases are simulated. Add your RevenueCat keys to sell for real (docs/SETUP.md).
            </T>
          </View>
        ) : null}

        <View style={styles.block}>
          <T variant="overline" muted>
            Premium membership
          </T>
          {plans.isLoading ? <T muted>Loading plans…</T> : null}
          {plans.isError ? <T muted>Plans are unavailable right now.</T> : null}
          {(plans.data ?? []).map((item) => {
            const active = (plan?.id ?? '') === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setSelected(item.id)}
                style={[
                  styles.plan,
                  { backgroundColor: p.surface, borderColor: active ? p.primary : p.border },
                  active && { borderWidth: 2 },
                ]}>
                <View style={[styles.radio, { borderColor: active ? p.primary : p.textFaint }]}>
                  {active ? <View style={[styles.radioDot, { backgroundColor: p.primary }]} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <T variant="bodyStrong">{item.title}</T>
                    {item.badge ? <Badge label={item.badge} tone="premium" /> : null}
                  </View>
                  {item.note ? (
                    <T variant="small" muted>
                      {item.note}
                    </T>
                  ) : null}
                </View>
                <T variant="heading">{item.price}</T>
              </Pressable>
            );
          })}
          <Button
            title={app.premium ? 'You’re Premium' : 'Continue'}
            kind="primary"
            disabled={!plan || app.premium}
            loading={busy === 'plan'}
            onPress={subscribe}
          />
          <Pressable accessibilityRole="button" onPress={restore} style={styles.restore} disabled={busy === 'restore'}>
            <T variant="small" color={p.primary} style={{ fontWeight: '700' }}>
              {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
            </T>
          </Pressable>
        </View>

        <View style={styles.block}>
          <View style={styles.orRow}>
            <View style={[styles.line, { backgroundColor: p.border }]} />
            <T variant="overline" muted>
              Or pay as you go
            </T>
            <View style={[styles.line, { backgroundColor: p.border }]} />
          </View>
          <T variant="small" muted>
            Own individual ebooks and tutorials with credits — no subscription.{' '}
            {target?.price_credits ? `This one costs ${creditsLabel(target.price_credits)}. ` : ''}You have{' '}
            {creditsLabel(app.credits)}.
          </T>
          <View style={styles.packs}>
            {(packs.data ?? []).map((offer) => (
              <Pressable
                key={offer.id}
                accessibilityRole="button"
                accessibilityLabel={`${offer.credits} credits for ${offer.price}`}
                disabled={busy !== null}
                onPress={() => buyPack(offer)}
                style={({ pressed }) => [
                  styles.pack,
                  { backgroundColor: p.surface, borderColor: params.focus === 'credits' ? p.primary : p.border },
                  pressed && { opacity: 0.8 },
                ]}>
                {offer.badge ? <Badge label={offer.badge} tone="owned" /> : <View style={{ height: 20 }} />}
                <Icon name="credits" size={22} color={p.primary} />
                <T variant="title">{offer.credits}</T>
                <T variant="caption" muted>
                  credits
                </T>
                <T variant="bodyStrong" color={p.primary}>
                  {busy === offer.id ? '…' : offer.price}
                </T>
              </Pressable>
            ))}
          </View>
          {packs.isError ? <T muted>Credit packs are unavailable right now.</T> : null}
        </View>

        <View style={styles.legal}>
          <T variant="caption" muted style={{ textAlign: 'center' }}>
            Subscriptions renew automatically until cancelled. Cancel at least 24 hours before the end of the current
            period in your {storeName} account settings. Credits are consumable, non-refundable and never expire.
          </T>
          <View style={styles.links}>
            <Pressable onPress={() => config && WebBrowser.openBrowserAsync(config.links.terms)}>
              <T variant="caption" color={p.primary}>
                Terms of Use
              </T>
            </Pressable>
            <T variant="caption" muted>
              ·
            </T>
            <Pressable onPress={() => config && WebBrowser.openBrowserAsync(config.links.privacy)}>
              <T variant="caption" color={p.primary}>
                Privacy Policy
              </T>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    gap: space.md,
  },
  close: {
    position: 'absolute',
    right: space.lg,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefits: { alignSelf: 'stretch', gap: space.sm, marginTop: space.sm },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  demo: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    margin: space.lg,
    marginBottom: 0,
    padding: space.md,
    borderRadius: radius.md,
  },
  block: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.md },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  restore: { alignSelf: 'center', padding: space.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  packs: { flexDirection: 'row', gap: space.md },
  pack: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  legal: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.sm },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});
