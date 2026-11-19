// Database access-rule tests: node --test (from supabase/tests)
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const supabaseDir = join(here, '..');
const db = new PGlite();

const ALICE = '00000000-0000-4000-8000-00000000000a'; // free reader
const BOB = '00000000-0000-4000-8000-00000000000b'; // subscriber
const ADA = '00000000-0000-4000-8000-0000000000ad'; // admin

/** Run statements as a given role/user inside a transaction (like PostgREST does). */
async function as(role, userId, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}
const rows = async (tx, sql, params) => (await tx.query(sql, params)).rows;
const contentId = async (slug) => (await db.query('select id from public.contents where slug = $1', [slug])).rows[0].id;

before(async () => {
  await db.exec(readFileSync(join(here, 'supabase-stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(supabaseDir, 'migrations')).sort()) {
    await db.exec(readFileSync(join(supabaseDir, 'migrations', f), 'utf8'));
  }
  await db.exec(readFileSync(join(supabaseDir, 'seed.sql'), 'utf8'));
  await db.exec(`insert into auth.users (id, email) values
    ('${ALICE}', 'alice@example.com'), ('${BOB}', 'bob@example.com'), ('${ADA}', 'ada@example.com');
    insert into public.admins (user_id) values ('${ADA}');`);
});

describe('catalogue', () => {
  test('anonymous visitors see published items and categories', async () => {
    await as('anon', null, async (tx) => {
      assert.equal((await rows(tx, 'select * from public.contents')).length, 13);
      assert.equal((await rows(tx, 'select * from public.categories')).length, 6);
      assert.ok((await rows(tx, 'select * from public.app_config')).length >= 3);
    });
  });

  test('drafts and scheduled items stay hidden from readers', async () => {
    await db.exec(`insert into public.contents (slug, title, status) values ('draft-item', 'Draft', 'draft');
      insert into public.contents (slug, title, status, published_at) values ('future-item', 'Future', 'published', now() + interval '1 day');`);
    await as('authenticated', ALICE, async (tx) => {
      const slugs = (await rows(tx, 'select slug from public.contents')).map((r) => r.slug);
      assert.ok(!slugs.includes('draft-item'));
      assert.ok(!slugs.includes('future-item'));
    });
    await as('authenticated', ADA, async (tx) => {
      const slugs = (await rows(tx, 'select slug from public.contents')).map((r) => r.slug);
      assert.ok(slugs.includes('draft-item') && slugs.includes('future-item'));
    });
  });
});

describe('gated bodies', () => {
  test('free readers can read free bodies only', async () => {
    await as('anon', null, async (tx) => {
      const bodies = await rows(tx, 'select content_id from public.content_bodies');
      assert.equal(bodies.length, 9);
    });
  });

  test('subscribers read everything; expired subscriptions do not', async () => {
    await db.query(
      `insert into public.subscriptions (user_id, is_active, expires_at) values ($1, true, now() + interval '30 days')`,
      [BOB],
    );
    await as('authenticated', BOB, async (tx) => {
      assert.equal((await rows(tx, 'select content_id from public.content_bodies')).length, 13);
      assert.equal((await rows(tx, 'select public.has_premium() as p'))[0].p, true);
    });
    await db.query(`update public.subscriptions set expires_at = now() - interval '1 minute' where user_id = $1`, [
      BOB,
    ]);
    await as('authenticated', BOB, async (tx) => {
      assert.equal((await rows(tx, 'select content_id from public.content_bodies')).length, 9);
    });
  });
});

describe('credits (pay on demand)', () => {
  test('cannot unlock without credits', async () => {
    const calculus = await contentId('calculus-in-a-weekend');
    await as('authenticated', ALICE, async (tx) => {
      const [{ r }] = await rows(tx, 'select public.unlock_with_credits($1) as r', [calculus]);
      assert.equal(r.ok, false);
      assert.equal(r.reason, 'insufficient_credits');
    });
  });

  test('spending credits unlocks exactly that item, once', async () => {
    const calculus = await contentId('calculus-in-a-weekend');
    const python = await contentId('python-for-absolute-beginners');
    const fifths = await contentId('circle-of-fifths-explained');
    // What the sync-purchases edge function writes after verifying a store purchase.
    await db.query(
      `insert into public.credit_ledger (user_id, delta, kind, product_id, transaction_id) values ($1, 30, 'purchase', 'credits_30', 'tx-1')`,
      [ALICE],
    );
    await assert.rejects(
      db.query(
        `insert into public.credit_ledger (user_id, delta, kind, product_id, transaction_id) values ($1, 30, 'purchase', 'credits_30', 'tx-1')`,
        [ALICE],
      ),
      /duplicate key/,
      'a store transaction can only be credited once',
    );

    await as('authenticated', ALICE, async (tx) => {
      assert.equal((await rows(tx, 'select public.credit_balance() as b'))[0].b, 30);
      let [{ r }] = await rows(tx, 'select public.unlock_with_credits($1) as r', [calculus]);
      assert.deepEqual(r, { ok: true, balance: 15 });
      [{ r }] = await rows(tx, 'select public.unlock_with_credits($1) as r', [calculus]);
      assert.equal(r.already_owned, true);
      assert.equal(r.balance, 15);
      [{ r }] = await rows(tx, 'select public.unlock_with_credits($1) as r', [python]);
      assert.deepEqual(r, { ok: true, balance: 0 });
      [{ r }] = await rows(tx, 'select public.unlock_with_credits($1) as r', [fifths]);
      assert.equal(r.reason, 'insufficient_credits');
      const readable = (await rows(tx, 'select content_id from public.content_bodies')).map((x) => x.content_id);
      assert.equal(readable.length, 11);
      assert.ok(readable.includes(calculus) && readable.includes(python) && !readable.includes(fifths));
    });
  });

  test('items without a credit price cannot be bought with credits', async () => {
    const api = await contentId('rest-api-with-node-and-typescript');
    const free = await contentId('why-is-the-sky-blue');
    await as('authenticated', ALICE, async (tx) => {
      for (const id of [api, free]) {
        const [{ r }] = await rows(tx, 'select public.unlock_with_credits($1) as r', [id]);
        assert.equal(r.reason, 'not_purchasable');
      }
    });
  });

  test('readers cannot mint credits, unlocks or subscriptions', async () => {
    const fifths = await contentId('circle-of-fifths-explained');
    const attempts = [
      [
        `insert into public.credit_ledger (user_id, delta, kind) values ('${ALICE}', 100, 'grant')`,
        /row-level security/,
      ],
      [`insert into public.unlocks (user_id, content_id) values ('${ALICE}', '${fifths}')`, /row-level security/],
      [`insert into public.subscriptions (user_id, is_active) values ('${ALICE}', true)`, /permission denied/],
      [`update public.contents set access = 'free' where slug = 'circle-of-fifths-explained'`, null],
    ];
    for (const [sql, err] of attempts) {
      if (err) {
        await assert.rejects(
          as('authenticated', ALICE, (tx) => tx.query(sql)),
          err,
          sql,
        );
      } else {
        const res = await as('authenticated', ALICE, (tx) => tx.query(sql));
        assert.equal(res.affectedRows ?? 0, 0, 'non-admin updates must not touch rows');
      }
    }
    await as('anon', null, async (tx) => {
      const [{ r }] = await rows(tx, 'select public.can_read_content($1) as r', [fifths]);
      assert.equal(r, false);
    });
  });

  test('other users cannot see my ledger or unlocks', async () => {
    await as('authenticated', BOB, async (tx) => {
      assert.equal((await rows(tx, 'select * from public.credit_ledger')).length, 0);
      assert.equal((await rows(tx, 'select * from public.unlocks')).length, 0);
    });
  });
});

describe('admin', () => {
  test('admins manage content and see stats; readers cannot', async () => {
    await as('authenticated', ADA, async (tx) => {
      await tx.query(
        `insert into public.contents (slug, title, access, price_credits) values ('new-one', 'New', 'premium', 3)`,
      );
      await tx.query(
        `insert into public.credit_ledger (user_id, delta, kind, note) values ($1, 5, 'grant', 'welcome gift')`,
        [ALICE],
      );
      const [{ s }] = await rows(tx, 'select public.admin_stats() as s');
      assert.equal(s.users, 3);
      assert.equal(s.credits_sold, 30);
      assert.equal(s.credits_spent, 30);
      assert.equal(s.unlocks, 2);
    });
    await assert.rejects(
      as('authenticated', ALICE, (tx) => tx.query('select public.admin_stats()')),
      /admin only/,
    );
    await assert.rejects(
      as('anon', null, (tx) => tx.query('select public.admin_stats()')),
      /permission denied/,
    );
  });

  test('price only allowed on premium items', async () => {
    await assert.rejects(
      as('authenticated', ADA, (tx) =>
        tx.query(`insert into public.contents (slug, title, access, price_credits) values ('bad', 'Bad', 'free', 3)`),
      ),
      /contents_price_requires_premium/,
    );
  });
});

describe('account deletion', () => {
  test('deleting a user removes their credits, owned items and subscription', async () => {
    const count = async (table) =>
      (await db.query(`select count(*)::int as n from public.${table} where user_id = $1`, [ALICE])).rows[0].n;
    assert.ok((await count('credit_ledger')) > 0);
    assert.ok((await count('unlocks')) > 0);
    await db.query(`insert into public.subscriptions (user_id, is_active) values ($1, true) on conflict do nothing`, [
      ALICE,
    ]);
    // What the delete-account edge function triggers via auth.admin.deleteUser().
    await db.query('delete from auth.users where id = $1', [ALICE]);
    for (const table of ['credit_ledger', 'unlocks', 'subscriptions']) {
      assert.equal(await count(table), 0, `${table} rows must be deleted`);
    }
    // Content the admin created is unaffected.
    assert.equal((await db.query('select count(*)::int as n from public.contents')).rows[0].n, 16);
  });
});
