import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Logo } from '@/components/brand';
import { Button, T } from '@/components/ui';
import { hasBackend } from '@/lib/env';
import { sendEmailCode, verifyEmailCode, type EmailFlow } from '@/lib/repo';
import { useApp } from '@/state/app-state';
import { radius, space, usePalette } from '@/theme';

export default function SignInScreen() {
  const p = usePalette();
  const app = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [flow, setFlow] = useState<EmailFlow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasBackend) {
    return (
      <View style={[styles.wrap, { backgroundColor: p.bg }]}>
        <T variant="heading">Accounts need a backend</T>
        <T muted>Connect Supabase (see docs/SETUP.md) to let readers sync purchases across devices.</T>
      </View>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      setFlow(await sendEmailCode(email.trim().toLowerCase(), app.session));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!flow) return;
    setBusy(true);
    setError(null);
    try {
      const session = await verifyEmailCode(email.trim().toLowerCase(), code.trim(), flow);
      await app.setSession(session);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t work.');
    } finally {
      setBusy(false);
    }
  };

  const input = [styles.input, { color: p.text, backgroundColor: p.surface, borderColor: p.border }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: p.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Logo size={56} />
        <T variant="title">{flow ? 'Check your inbox' : 'Keep your library everywhere'}</T>
        <T muted>
          {flow
            ? `Enter the 6-digit code we sent to ${email}.`
            : 'Add your email to keep credits, owned items and reading progress safe — and use them on any device.'}
        </T>
        {!flow ? (
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={p.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            style={input}
            accessibilityLabel="Email address"
          />
        ) : (
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
            placeholder="123456"
            placeholderTextColor={p.textFaint}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            style={[input, styles.code]}
            accessibilityLabel="Verification code"
          />
        )}
        {error ? (
          <T variant="small" color={p.danger}>
            {error}
          </T>
        ) : null}
        {!flow ? (
          <Button
            title="Email me a code"
            loading={busy}
            disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
            onPress={send}
          />
        ) : (
          <>
            <Button title="Verify" loading={busy} disabled={code.length < 6} onPress={verify} />
            <Button title="Use a different email" kind="ghost" onPress={() => setFlow(null)} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.xl, gap: space.lg },
  input: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    fontSize: 17,
  },
  code: { letterSpacing: 8, fontSize: 24, textAlign: 'center' },
});
