import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { decideAccess, type AccessDecision } from '@shared/access';
import { buildReaderDocument, type ReaderTheme } from '@shared/reader';
import type { Category, Content } from '@shared/types';

import { Icon, type IconName } from '@/components/icon';
import { ReaderView, type ReaderHandle } from '@/components/reader-view';
import { Button, Chip, T } from '@/components/ui';
import { showGateAd } from '@/lib/ads';
import { hasStore } from '@/lib/env';
import { credits as creditsLabel, kindLabel, readingTime } from '@/lib/format';
import * as repo from '@/lib/repo';
import { useApp, useCatalog, type ReaderTheme as ThemeSetting } from '@/state/app-state';
import { brand, radius, space, usePalette } from '@/theme';

const READER_BG: Record<ReaderTheme, string> = { light: '#FFFFFF', sepia: '#FBF5E9', dark: '#0F1222' };
const GATE_HEIGHT = 330;

export default function ReadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const { byId, categoryById, config } = useCatalog();
  const content = byId.get(id);
  const category = content?.category_id ? categoryById.get(content.category_id) : undefined;
  const system = useColorScheme();
  const p = usePalette();
  const queryClient = useQueryClient();
  const reader = useRef<ReaderHandle>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const theme: ReaderTheme =
    app.settings.readerTheme === 'auto' ? (system === 'dark' ? 'dark' : 'light') : app.settings.readerTheme;
  const bg = READER_BG[theme];

  const decision: AccessDecision | null = content
    ? decideAccess({
        access: content.access,
        priceCredits: content.price_credits,
        isPremium: app.premium,
        isUnlocked: app.unlocked.has(content.id),
        hasAdPass: app.hasAdPass(content.id),
        adGate: config?.ads.gate ?? 'rewarded',
      })
    : null;
  const open = decision?.state === 'open';

  const body = useQuery({
    queryKey: ['body', id, open, app.premium, app.unlocked.has(id)],
    enabled: Boolean(content) && open,
    queryFn: async () => {
      let html = await repo.fetchBody(id);
      if (html === null && hasStore) {
        // Purchased moments ago? Let the server verify with the store, then retry once.
        await repo.syncPurchases().catch(() => null);
        await app.refreshOwnership();
        html = await repo.fetchBody(id);
      }
      return html;
    },
  });

  // Where the reader left off — captured once when the screen opens.
  const [initialProgress] = useState(() => app.progress[id]?.p ?? 0);
  const html = useMemo(() => {
    if (!content) return '';
    const meta = [kindLabel(content), readingTime(content.reading_minutes), content.author].filter(Boolean).join(' · ');
    return buildReaderDocument({
      html: open && body.data ? body.data : content.preview_html || `<p>${content.summary}</p>`,
      theme,
      fontScale: app.settings.fontScale,
      accent: category?.color ?? brand.indigo,
      header: { kicker: category?.name, title: content.title, meta },
      initialProgress: open ? initialProgress : 0,
      bottomInset: open ? 0 : GATE_HEIGHT,
    });
  }, [content, open, body.data, theme, app.settings.fontScale, category, initialProgress]);

  const onProgress = useCallback((value: number) => app.setProgress(id, value), [app, id]);

  if (!content || !decision) {
    return (
      <View style={[styles.center, { backgroundColor: p.bg }]}>
        <Stack.Screen options={{ title: '' }} />
        <T variant="heading">This item isn’t available</T>
        <T variant="small" muted>
          It may have been unpublished.
        </T>
        <Button title="Back to library" kind="secondary" onPress={() => router.back()} compact />
      </View>
    );
  }

  const bookmarked = app.bookmarks.includes(content.id);
  const showBody = open && typeof body.data === 'string';

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: bg },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {showBody && content.headings.length ? (
                <HeaderButton icon="toc" label="Contents" onPress={() => setTocOpen(true)} />
              ) : null}
              <HeaderButton icon="textSize" label="Reading settings" onPress={() => setStyleOpen(true)} />
              <HeaderButton
                icon={bookmarked ? 'bookmarked' : 'bookmark'}
                label={bookmarked ? 'Remove bookmark' : 'Save for later'}
                onPress={() => app.toggleBookmark(content.id)}
              />
            </View>
          ),
        }}
      />

      {!open || showBody ? (
        <ReaderView
          ref={reader}
          key={`${open}-${theme}-${app.settings.fontScale}`}
          html={html}
          background={bg}
          onProgress={open ? onProgress : undefined}
        />
      ) : null}

      {open && body.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={p.primary} />
        </View>
      ) : null}

      {open && body.isError ? (
        <View style={styles.center}>
          <T variant="heading">Couldn’t open this right now</T>
          <T variant="small" muted style={{ textAlign: 'center' }}>
            Check your connection and try again.
          </T>
          <Button title="Try again" compact onPress={() => body.refetch()} />
        </View>
      ) : null}

      {open && body.isSuccess && body.data === null ? (
        <View style={styles.center}>
          <Icon name="lock" size={30} color={p.textMuted} />
          <T variant="heading" style={{ textAlign: 'center' }}>
            We couldn’t confirm your access
          </T>
          <T variant="small" muted style={{ textAlign: 'center', maxWidth: 320 }}>
            {app.simulatedStore
              ? 'This build simulates purchases, but premium text is protected by your Supabase project. Add RevenueCat keys to sell it for real (see docs/SETUP.md).'
              : 'If you just bought this, it can take a moment. Restoring purchases usually fixes it.'}
          </T>
          <Button
            title="Restore purchases"
            kind="secondary"
            compact
            onPress={async () => {
              await app.restore().catch(() => false);
              await queryClient.invalidateQueries({ queryKey: ['body', id] });
            }}
          />
        </View>
      ) : null}

      {!open ? <Gate content={content} category={category} decision={decision} background={bg} /> : null}

      <TocSheet
        visible={tocOpen}
        onClose={() => setTocOpen(false)}
        headings={content.headings}
        onPick={(h) => {
          setTocOpen(false);
          reader.current?.scrollTo(h);
        }}
      />
      <StyleSheetModal visible={styleOpen} onClose={() => setStyleOpen(false)} />
    </View>
  );
}

function HeaderButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={styles.headerButton}>
      <Icon name={icon} size={20} color={p.primary} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// The gate: ad for free items, paywall for premium ones
// ---------------------------------------------------------------------------
function Gate({
  content,
  category,
  decision,
  background,
}: {
  content: Content;
  category?: Category;
  decision: AccessDecision;
  background: string;
}) {
  const app = useApp();
  const { config } = useCatalog();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'ad' | 'unlock' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const kind = kindLabel(content).toLowerCase();
  const hours = config?.ads.unlock_hours ?? 24;

  const watchAd = async () => {
    if (decision.state !== 'ad') return;
    setBusy('ad');
    setMessage(null);
    const outcome = await showGateAd(decision.gate, app.session.userId);
    setBusy(null);
    if (outcome === 'closed-early') {
      setMessage('Watch the ad to the end to unlock this for free.');
      return;
    }
    // 'earned' — or 'unavailable' (no ad to show): never punish readers for a missing ad.
    app.grantAdPass(content.id);
  };

  const unlockWithCredits = async () => {
    const price = content.price_credits;
    if (!price) return;
    if (app.credits < price) {
      router.push({ pathname: '/paywall', params: { focus: 'credits', contentId: content.id } });
      return;
    }
    Alert.alert(
      `Unlock “${content.title}”?`,
      `This uses ${creditsLabel(price)}. You have ${creditsLabel(app.credits)}. It stays yours to read anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Use ${price} credits`,
          onPress: async () => {
            setBusy('unlock');
            try {
              const result = await app.unlock(content);
              if (!result.ok) {
                if (result.reason === 'insufficient_credits') {
                  router.push({ pathname: '/paywall', params: { focus: 'credits', contentId: content.id } });
                } else {
                  setMessage('This item can’t be bought with credits.');
                }
              }
            } catch {
              setMessage('Something went wrong. Please try again.');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${background}00`, background]}
        style={{ height: 120 }}
      />
      <View
        style={[
          styles.gate,
          { backgroundColor: p.surface, borderColor: p.border, paddingBottom: insets.bottom + space.lg },
        ]}>
        {decision.state === 'ad' ? (
          <>
            <View style={styles.gateTitle}>
              <View style={[styles.gateIcon, { backgroundColor: p.surfaceAlt }]}>
                <Icon name="play" size={18} color={p.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="heading">Free with a short ad</T>
                <T variant="small" muted>
                  Watch one ad to read this {kind}. It stays open for {hours} hours.
                </T>
              </View>
            </View>
            <Button
              title={decision.gate === 'rewarded' ? 'Watch ad & read free' : 'Continue to read free'}
              icon="play"
              loading={busy === 'ad'}
              onPress={watchAd}
            />
            <Button title="Go Premium — no ads" kind="ghost" icon="crown" onPress={() => router.push('/paywall')} />
          </>
        ) : decision.state === 'paywall' ? (
          <>
            <View style={styles.gateTitle}>
              <View style={[styles.gateIcon, { backgroundColor: p.surfaceAlt }]}>
                <Icon name="lock" size={18} color={p.premium} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="heading">Premium {kind}</T>
                <T variant="small" muted>
                  Included with Premium{decision.price ? ', or own it with credits' : ''}.
                  {category ? ` More ${category.name.toLowerCase()} inside.` : ''}
                </T>
              </View>
            </View>
            <Button title="Unlock everything with Premium" kind="premium" icon="crown" onPress={() => router.push('/paywall')} />
            {decision.price ? (
              <Button
                title={`Own it for ${creditsLabel(decision.price)}`}
                kind="secondary"
                icon="credits"
                loading={busy === 'unlock'}
                onPress={unlockWithCredits}
              />
            ) : null}
            {decision.price ? (
              <T variant="caption" muted style={{ textAlign: 'center' }}>
                You have {creditsLabel(app.credits)}
              </T>
            ) : null}
          </>
        ) : null}
        {message ? (
          <T variant="small" color={p.danger} style={{ textAlign: 'center' }}>
            {message}
          </T>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Table of contents + reading settings sheets
// ---------------------------------------------------------------------------
function TocSheet({
  visible,
  onClose,
  headings,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  headings: Content['headings'];
  onPick: (id: string) => void;
}) {
  const p = usePalette();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: p.bg }]}>
        <View style={styles.sheetHeader}>
          <T variant="title">Contents</T>
          <HeaderButton icon="close" label="Close" onPress={onClose} />
        </View>
        <ScrollView>
          {headings.map((h) => (
            <Pressable
              key={h.id}
              accessibilityRole="button"
              onPress={() => onPick(h.id)}
              style={({ pressed }) => [
                styles.tocRow,
                { borderBottomColor: p.border, paddingLeft: h.level === 3 ? space.xl : space.lg },
                pressed && { backgroundColor: p.surfaceAlt },
              ]}>
              <T variant={h.level === 2 ? 'bodyStrong' : 'body'}>{h.text}</T>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
];

function StyleSheetModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const p = usePalette();
  const { settings, updateSettings } = useApp();
  const step = (d: number) =>
    updateSettings({ fontScale: Math.round(Math.min(1.5, Math.max(0.85, settings.fontScale + d)) * 100) / 100 });
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: p.bg }]}>
        <View style={styles.sheetHeader}>
          <T variant="title">Reading</T>
          <HeaderButton icon="close" label="Close" onPress={onClose} />
        </View>
        <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
          <T variant="overline" muted>
            Theme
          </T>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {THEMES.map((t) => (
              <Chip key={t.id} label={t.label} selected={settings.readerTheme === t.id} onPress={() => updateSettings({ readerTheme: t.id })} />
            ))}
          </View>
          <T variant="overline" muted>
            Text size · {Math.round(settings.fontScale * 100)}%
          </T>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button title="A−" kind="secondary" onPress={() => step(-0.05)} style={{ flex: 1 }} />
            <Button title="A+" kind="secondary" onPress={() => step(0.05)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  headerButton: { padding: 6 },
  gate: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  gateTitle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gateIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheet: { flex: 1, paddingTop: space.lg },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  tocRow: { paddingVertical: space.md, paddingRight: space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});
