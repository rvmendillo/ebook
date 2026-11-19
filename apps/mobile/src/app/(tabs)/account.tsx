import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, Divider, Row, T } from '@/components/ui';
import { privacyOptionsRequired, showPrivacyOptions, usingTestAds } from '@/lib/ads';
import { hasBackend, hasStore } from '@/lib/env';
import { credits as creditsLabel } from '@/lib/format';
import { openSubscriptionManagement } from '@/lib/purchases';
import { useApp, useCatalog, type ReaderTheme } from '@/state/app-state';
import { brand, radius, space, usePalette } from '@/theme';

const THEMES: { id: ReaderTheme; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
];

export default function AccountScreen() {
  const p = usePalette();
  const app = useApp();
  const { config } = useCatalog();
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    void privacyOptionsRequired().then(setPrivacyRequired);
  }, []);

  const open = (url?: string) => {
    if (!url) return;
    if (url.startsWith('mailto:')) void Linking.openURL(url);
    else void WebBrowser.openBrowserAsync(url);
  };

  const restore = async () => {
    setRestoring(true);
    try {
      const premium = await app.restore();
      Alert.alert(
        premium ? 'Purchases restored' : 'Nothing to restore',
        premium ? 'Premium is active.' : 'No active subscription was found.',
      );
    } catch {
      Alert.alert('Restore failed', 'Please try again in a moment.');
    } finally {
      setRestoring(false);
    }
  };

  const version = `${Constants.expoConfig?.version ?? '1.0.0'}`;
  const mode = [
    hasBackend ? 'Live library' : 'Sample library',
    hasStore ? 'store purchases' : 'simulated purchases',
    usingTestAds ? 'test ads' : 'live ads',
  ].join(' · ');

  return (
    <Screen>
      <View style={styles.header}>
        <T variant="display">Account</T>
      </View>

      <LinearGradient
        colors={app.premium ? ['#1E1B4B', '#4338CA', '#7C3AED'] : [p.surfaceAlt, p.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.membership}>
        <View style={styles.membershipRow}>
          <Icon name={app.premium ? 'crown' : 'sparkles'} size={22} color={app.premium ? brand.amberSoft : p.primary} />
          <T variant="title" color={app.premium ? '#FFFFFF' : undefined}>
            {app.premium ? 'Premium member' : 'Free plan'}
          </T>
        </View>
        <T variant="small" color={app.premium ? 'rgba(255,255,255,0.85)' : p.textMuted}>
          {app.premium
            ? 'Every ebook, tutorial and tip — ad-free.'
            : 'Free articles open after a short ad. Premium unlocks everything with no ads.'}
        </T>
        <View style={styles.membershipRow}>
          <Icon name="credits" size={16} color={app.premium ? '#FFFFFF' : p.primary} />
          <T variant="bodyStrong" color={app.premium ? '#FFFFFF' : undefined}>
            {creditsLabel(app.credits)}
          </T>
        </View>
        {app.premium ? (
          hasStore ? (
            <Button title="Manage subscription" kind="secondary" compact onPress={openSubscriptionManagement} />
          ) : null
        ) : (
          <Button title="Go Premium" kind="premium" icon="crown" onPress={() => router.push('/paywall')} />
        )}
      </LinearGradient>

      <Card style={styles.card}>
        <Row
          icon="credits"
          title="Get credits"
          subtitle="Own single ebooks and tutorials"
          onPress={() => router.push({ pathname: '/paywall', params: { focus: 'credits' } })}
        />
        <Divider />
        <Row
          icon="restore"
          title={restoring ? 'Restoring…' : 'Restore purchases'}
          subtitle="After reinstalling or on a new phone"
          onPress={restoring ? undefined : restore}
        />
      </Card>

      {hasBackend ? (
        <Card style={styles.card}>
          {app.session.isAnonymous ? (
            <Row
              icon="cloud"
              title="Sync your library"
              subtitle="Add your email to keep purchases on every device"
              onPress={() => router.push('/sign-in')}
            />
          ) : (
            <>
              <Row icon="mail" title={app.session.email ?? 'Signed in'} subtitle="Your library syncs across devices" />
              <Divider />
              <Row
                icon="logout"
                title="Sign out"
                danger
                onPress={() =>
                  Alert.alert('Sign out?', 'Your purchases stay with your account.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign out', style: 'destructive', onPress: () => void app.signOut() },
                  ])
                }
              />
            </>
          )}
        </Card>
      ) : null}

      <Card style={[styles.card, { gap: space.md, padding: space.lg }]}>
        <T variant="overline" muted>
          Reading theme
        </T>
        <View style={styles.chips}>
          {THEMES.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              selected={app.settings.readerTheme === t.id}
              onPress={() => app.updateSettings({ readerTheme: t.id })}
            />
          ))}
        </View>
        <T variant="overline" muted>
          Text size · {Math.round(app.settings.fontScale * 100)}%
        </T>
        <View style={styles.chips}>
          {[0.9, 1, 1.15, 1.3].map((s) => (
            <Chip
              key={s}
              label={s === 1 ? 'Default' : `${Math.round(s * 100)}%`}
              selected={Math.abs(app.settings.fontScale - s) < 0.01}
              onPress={() => app.updateSettings({ fontScale: s })}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        {privacyRequired ? (
          <>
            <Row
              icon="privacy"
              title="Privacy choices"
              subtitle="Ad personalisation consent"
              onPress={() => void showPrivacyOptions()}
            />
            <Divider />
          </>
        ) : null}
        <Row icon="doc" title="Terms of Use" onPress={() => open(config?.links.terms)} />
        <Divider />
        <Row icon="privacy" title="Privacy Policy" onPress={() => open(config?.links.privacy)} />
        <Divider />
        <Row icon="mail" title="Contact support" onPress={() => open(config?.links.support)} />
      </Card>

      <Card style={styles.card}>
        <Row
          icon="trash"
          title="Delete account"
          subtitle={
            hasBackend ? 'Erase your account, credits and owned items' : 'Erase everything stored on this device'
          }
          danger
          onPress={() =>
            Alert.alert(
              'Delete your account?',
              `This permanently deletes your account, credits, owned items, bookmarks and reading progress. ${
                hasStore
                  ? 'An active subscription is not cancelled automatically — cancel it in your store account first.'
                  : ''
              }`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await app.deleteAccount();
                      Alert.alert('Account deleted', 'Your data has been removed.');
                    } catch {
                      Alert.alert('Couldn’t delete your account', 'Check your connection and try again.');
                    }
                  },
                },
              ],
            )
          }
        />
      </Card>

      <View style={styles.footer}>
        <T variant="caption" muted style={{ textAlign: 'center' }}>
          Polymath {version}
        </T>
        <T variant="caption" muted style={{ textAlign: 'center' }}>
          {mode}
        </T>
        {app.session.userId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Shares your reader ID, for example with support"
            onPress={() => void Share.share({ message: app.session.userId ?? '' })}>
            <T variant="caption" muted style={{ textAlign: 'center' }}>
              Reader ID · {app.session.userId.slice(0, 8)}… (tap to share)
            </T>
          </Pressable>
        ) : null}
        {app.simulatedStore ? (
          <Button
            title="Reset demo purchases"
            kind="ghost"
            compact
            onPress={() => {
              app.resetDemoPurchases();
              Alert.alert('Demo purchases cleared');
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg },
  membership: {
    margin: space.lg,
    borderRadius: radius.xl,
    padding: space.lg,
    gap: space.md,
  },
  membershipRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: { marginHorizontal: space.lg, marginBottom: space.lg, padding: 0, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: 0 },
  footer: { alignItems: 'center', gap: 4, paddingVertical: space.lg },
});
