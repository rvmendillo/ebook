import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { adPassValid, decideAccess, type AccessInput } from '../../../shared/access.ts';
import { buildReaderDocument, hasMusicNotation } from '../../../shared/reader.ts';
import { DEFAULT_CONFIG, mergeConfig } from '../../../shared/types.ts';

const base: AccessInput = {
  access: 'free',
  priceCredits: null,
  isPremium: false,
  isUnlocked: false,
  hasAdPass: false,
  adGate: 'rewarded',
};

describe('decideAccess — monetisation rules', () => {
  test('free item asks free readers to watch an ad', () => {
    assert.deepEqual(decideAccess(base), { state: 'ad', gate: 'rewarded' });
    assert.deepEqual(decideAccess({ ...base, adGate: 'interstitial' }), { state: 'ad', gate: 'interstitial' });
  });
  test('a watched ad opens the free item', () => {
    assert.deepEqual(decideAccess({ ...base, hasAdPass: true }), { state: 'open', via: 'ad-pass' });
  });
  test('ads switched off in the admin app open free items directly', () => {
    assert.deepEqual(decideAccess({ ...base, adGate: 'off' }), { state: 'open', via: 'free' });
  });
  test('premium subscribers skip ads and paywalls', () => {
    assert.deepEqual(decideAccess({ ...base, isPremium: true }), { state: 'open', via: 'premium' });
    assert.deepEqual(decideAccess({ ...base, access: 'premium', isPremium: true }), { state: 'open', via: 'premium' });
  });
  test('premium items show the paywall with the credit price', () => {
    assert.deepEqual(decideAccess({ ...base, access: 'premium', priceCredits: 15 }), { state: 'paywall', price: 15 });
    assert.deepEqual(decideAccess({ ...base, access: 'premium' }), { state: 'paywall', price: null });
  });
  test('an ad pass never opens premium content', () => {
    assert.equal(decideAccess({ ...base, access: 'premium', hasAdPass: true }).state, 'paywall');
  });
  test('owned items open', () => {
    assert.deepEqual(decideAccess({ ...base, access: 'premium', isUnlocked: true }), { state: 'open', via: 'unlock' });
  });
});

test('adPassValid expires after the configured hours', () => {
  const now = Date.UTC(2026, 0, 2);
  assert.equal(adPassValid(undefined, 24, now), false);
  assert.equal(adPassValid(now - 23 * 3_600_000, 24, now), true);
  assert.equal(adPassValid(now - 25 * 3_600_000, 24, now), false);
  assert.equal(adPassValid(now - 1000, 0, now), false);
});

test('mergeConfig fills in defaults and keeps remote values', () => {
  const merged = mergeConfig({ ads: { gate: 'off' }, pricing: { credit_packs: [] } } as never);
  assert.equal(merged.ads.gate, 'off');
  assert.equal(merged.ads.unlock_hours, DEFAULT_CONFIG.ads.unlock_hours);
  assert.deepEqual(merged.pricing.credit_packs, DEFAULT_CONFIG.pricing.credit_packs);
  assert.deepEqual(mergeConfig(null), DEFAULT_CONFIG);
});

describe('buildReaderDocument', () => {
  test('escapes the header and includes the body', () => {
    const doc = buildReaderDocument({ html: '<p>Body</p>', header: { title: '<b>x</b> & y' } });
    assert.match(doc, /&lt;b&gt;x&lt;\/b&gt; &amp; y/);
    assert.match(doc, /<article class="pm-article"><p>Body<\/p><\/article>/);
  });
  test('loads the music renderer only when needed', () => {
    const music = '<figure class="pm-music" data-abc="X:1"></figure>';
    assert.equal(hasMusicNotation(music), true);
    assert.match(buildReaderDocument({ html: music }), /abcjs-basic-min\.js" integrity="sha384-/);
    assert.ok(!buildReaderDocument({ html: '<p>x</p>' }).includes('abcjs'));
  });
  test('themes and font size', () => {
    const dark = buildReaderDocument({ html: '', theme: 'dark', fontScale: 1.2 });
    assert.match(dark, /--bg:#0F1222/);
    assert.match(dark, /--fs:20\.40px/);
  });
});
